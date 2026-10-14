import { db, redis } from '../config';
import { QrSecurityService } from './qrSecurity.service';
import { Server } from 'socket.io';

export interface ScanAttendanceParams {
  sessionId: string;
  studentId: string;
  rawQrToken: string;
  deviceFingerprint: string;
  deviceInfo: string;
  ipAddress: string;
}

export class AttendanceService {
  /**
   * Traitement complet d'un émargement étudiant avec garanties ACID et anti-fraude
   */
  public static async processStudentScan(
    params: ScanAttendanceParams,
    io?: Server
  ): Promise<{ success: boolean; message: string; attendance?: any }> {
    const { sessionId, studentId, rawQrToken, deviceFingerprint, deviceInfo, ipAddress } = params;

    // 1. Récupérer la session d'examen et son secret
    const sessionRes = await db.query(
      `SELECT id, status, session_secret, qr_refresh_interval_sec, room_name 
       FROM exam_sessions 
       WHERE id = $1`,
      [sessionId]
    );

    if (sessionRes.rowCount === 0) {
      return { success: false, message: 'Session d\'examen introuvable' };
    }

    const session = sessionRes.rows[0];

    if (session.status !== 'ACTIVE') {
      return {
        success: false,
        message: `La session n'est pas ouverte à l'émargement (statut actuel: ${session.status})`,
      };
    }

    // 2. Contrôle anti-fraude: Unicité d'appareil (Device Fingerprinting)
    // Empêche un étudiant d'émarger pour 5 camarades avec le même smartphone
    const deviceLockKey = `device:lock:${sessionId}:${deviceFingerprint}`;
    const boundStudentForDevice = await redis.get(deviceLockKey);

    if (boundStudentForDevice && boundStudentForDevice !== studentId) {
      return {
        success: false,
        message: 'Sécurité anti-fraude: Cet appareil a déjà été utilisé pour émarger un autre compte étudiant dans cette salle.',
      };
    }

    // 3. Vérification cryptographique et temporelle du QR Code (TOTP HMAC-SHA256)
    const qrCheck = await QrSecurityService.verifyQrToken(
      rawQrToken,
      sessionId,
      session.session_secret,
      session.qr_refresh_interval_sec || 8
    );

    if (!qrCheck.valid) {
      return { success: false, message: qrCheck.reason || 'Code QR invalide ou périmé' };
    }

    // 4. Insertion atomique dans PostgreSQL avec vérification contrainte UNIQUE (session_id, student_id)
    const client = await db.connect();
    try {
      await client.query('BEGIN');

      // Vérifier si l'étudiant a déjà émargé
      const existingRes = await client.query(
        `SELECT id, signed_at FROM attendances WHERE session_id = $1 AND student_id = $2`,
        [sessionId, studentId]
      );

      if (existingRes.rowCount! > 0) {
        await client.query('ROLLBACK');
        return {
          success: false,
          message: `Vous avez déjà émargé pour cette épreuve à ${new Date(existingRes.rows[0].signed_at).toLocaleTimeString('fr-FR')}.`,
        };
      }

      // Insertion du registre d'émargement
      const insertRes = await client.query(
        `INSERT INTO attendances 
          (session_id, student_id, signed_at, verification_mode, ip_address, device_fingerprint, device_info, nonce_used)
         VALUES ($1, $2, CURRENT_TIMESTAMP, 'QR_DYNAMIC', $3, $4, $5, $6)
         RETURNING id, session_id, student_id, signed_at, verification_mode`,
        [sessionId, studentId, ipAddress, deviceFingerprint, deviceInfo, qrCheck.nonce]
      );

      await client.query('COMMIT');

      const attendanceRecord = insertRes.rows[0];

      // 5. Invalidation du nonce dans Redis (anti-rejeu) et verrouillage de l'appareil pour cette session
      if (qrCheck.nonce) {
        await QrSecurityService.markNonceAsUsed(
          sessionId,
          qrCheck.nonce,
          studentId,
          session.qr_refresh_interval_sec || 8
        );
      }
      // Verrouille l'appareil sur l'étudiant jusqu'à la fin de la journée (86400s)
      await redis.set(deviceLockKey, studentId, 'EX', 86400);

      // Récupérer les informations de l'étudiant pour diffusion temps réel
      const studentInfo = await db.query(
        `SELECT first_name, last_name, student_number FROM users WHERE id = $1`,
        [studentId]
      );

      const studentData = studentInfo.rows[0] || {};

      // 6. Notification WebSocket en direct vers le tableau de bord du surveillant & le projecteur
      if (io) {
        io.to(`session:${sessionId}`).emit('attendance:new', {
          attendanceId: attendanceRecord.id,
          studentId,
          firstName: studentData.first_name,
          lastName: studentData.last_name,
          studentNumber: studentData.student_number,
          signedAt: attendanceRecord.signed_at,
          verificationMode: 'QR_DYNAMIC',
        });
      }

      return {
        success: true,
        message: 'Émargement enregistré avec succès !',
        attendance: {
          ...attendanceRecord,
          student: studentData,
        },
      };
    } catch (err: any) {
      await client.query('ROLLBACK');
      if (err.code === '23505') {
        // Unique violation PostgreSQL
        return {
          success: false,
          message: 'Double émargement rejeté par la base de données (déjà émargé).',
        };
      }
      throw err;
    } finally {
      client.release();
    }
  }

  /**
   * Émargement manuel par le surveillant (dérogation étudiant sans batterie, etc.)
   */
  public static async supervisorManualSign(
    sessionId: string,
    studentId: string,
    supervisorId: string,
    io?: Server
  ): Promise<{ success: boolean; message: string }> {
    try {
      const insertRes = await db.query(
        `INSERT INTO attendances 
          (session_id, student_id, signed_at, verification_mode, device_info)
         VALUES ($1, $2, CURRENT_TIMESTAMP, 'MANUAL_SUPERVISOR', $3)
         RETURNING id, signed_at`,
        [sessionId, studentId, `Validé manuellement par surveillant ${supervisorId}`]
      );

      const studentRes = await db.query(
        `SELECT first_name, last_name, student_number FROM users WHERE id = $1`,
        [studentId]
      );

      if (io) {
        io.to(`session:${sessionId}`).emit('attendance:new', {
          attendanceId: insertRes.rows[0].id,
          studentId,
          ...studentRes.rows[0],
          signedAt: insertRes.rows[0].signed_at,
          verificationMode: 'MANUAL_SUPERVISOR',
        });
      }

      return { success: true, message: 'Émargement manuel validé par le surveillant.' };
    } catch (err: any) {
      if (err.code === '23505') {
        return { success: false, message: 'Cet étudiant a déjà émargé.' };
      }
      return { success: false, message: err.message };
    }
  }
}

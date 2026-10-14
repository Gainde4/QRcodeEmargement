import { Request, Response } from 'express';
import { db } from '../config';
import { SessionSocketService } from '../services/sessionSocket.service';
import crypto from 'crypto';

export class SessionController {
  /**
   * Récupère la session active ou toutes les sessions
   */
  public static async listSessions(req: Request, res: Response) {
    try {
      const result = await db.query(`
        SELECT 
          s.id, s.room_name, s.start_time, s.end_time, s.status, s.qr_refresh_interval_sec,
          e.code as exam_code, e.title as exam_title,
          u.first_name as supervisor_first_name, u.last_name as supervisor_last_name,
          COUNT(a.id)::int as attendances_count
        FROM exam_sessions s
        JOIN exams e ON s.exam_id = e.id
        LEFT JOIN users u ON s.supervisor_id = u.id
        LEFT JOIN attendances a ON s.id = a.session_id
        GROUP BY s.id, e.code, e.title, u.first_name, u.last_name
        ORDER BY s.start_time DESC
      `);
      return res.json({ sessions: result.rows });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Détails d'une session avec la liste des émargements en temps réel
   */
  public static async getSessionDetails(req: Request, res: Response) {
    const { id } = req.params;
    try {
      const sessionRes = await db.query(`
        SELECT 
          s.id, s.room_name, s.start_time, s.end_time, s.status, s.qr_refresh_interval_sec,
          e.code as exam_code, e.title as exam_title
        FROM exam_sessions s
        JOIN exams e ON s.exam_id = e.id
        WHERE s.id = $1
      `, [id]);

      if (sessionRes.rowCount === 0) {
        return res.status(404).json({ error: 'Session introuvable' });
      }

      const attendancesRes = await db.query(`
        SELECT 
          a.id, a.signed_at, a.verification_mode, a.device_info,
          u.id as student_id, u.student_number, u.first_name, u.last_name, u.email
        FROM attendances a
        JOIN users u ON a.student_id = u.id
        WHERE a.session_id = $1
        ORDER BY a.signed_at DESC
      `, [id]);

      return res.json({
        session: sessionRes.rows[0],
        attendances: attendancesRes.rows,
      });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }

  /**
   * Démarrer ou Clôturer une session (Action surveillant)
   */
  public static async updateStatus(req: Request, res: Response) {
    const { id } = req.params;
    const { status } = req.body; // 'ACTIVE', 'COMPLETED', etc.

    if (!['ACTIVE', 'COMPLETED', 'SCHEDULED'].includes(status)) {
      return res.status(400).json({ error: 'Statut invalide' });
    }

    try {
      const updateRes = await db.query(
        `UPDATE exam_sessions SET status = $1 WHERE id = $2 RETURNING id, status, room_name`,
        [status, id]
      );

      if (status === 'COMPLETED') {
        SessionSocketService.stopSessionTicker(id);
      }

      const io = req.app.get('io');
      if (io) {
        io.to(`session:${id}`).emit('session:status_changed', { sessionId: id, status });
        if (status === 'ACTIVE') {
          SessionSocketService.ensureSessionTicker(io, id);
        }
      }

      return res.json({ session: updateRes.rows[0] });
    } catch (err: any) {
      return res.status(500).json({ error: err.message });
    }
  }
}

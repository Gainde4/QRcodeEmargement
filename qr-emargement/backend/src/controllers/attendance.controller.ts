import { Request, Response } from 'express';
import { AttendanceService } from '../services/attendance.service';

export class AttendanceController {
  /**
   * Endpoint appelé par le smartphone de l'étudiant lorsqu'il scanne le QR code
   */
  public static async scanQrCode(req: Request, res: Response) {
    const { sessionId, rawQrToken, deviceFingerprint, deviceInfo } = req.body;
    const user = (req as any).user; // Extrait du JWT

    if (!user || !user.id) {
      return res.status(401).json({ error: 'Authentification requise pour émarger' });
    }

    if (!sessionId || !rawQrToken) {
      return res.status(400).json({ error: 'Identifiant de session et token QR requis' });
    }

    const ipAddress = req.ip || req.socket.remoteAddress || '127.0.0.1';
    const io = req.app.get('io');

    try {
      const result = await AttendanceService.processStudentScan(
        {
          sessionId,
          studentId: user.id,
          rawQrToken,
          deviceFingerprint: deviceFingerprint || 'unknown-device',
          deviceInfo: deviceInfo || req.headers['user-agent'] || 'Mobile Browser',
          ipAddress,
        },
        io
      );

      if (!result.success) {
        return res.status(400).json({ error: result.message });
      }

      return res.status(200).json({
        success: true,
        message: result.message,
        attendance: result.attendance,
      });
    } catch (err: any) {
      console.error('Erreur scanQrCode:', err);
      return res.status(500).json({ error: 'Erreur interne lors de la validation de l\'émargement' });
    }
  }

  /**
   * Émargement manuel par le surveillant
   */
  public static async manualSign(req: Request, res: Response) {
    const { sessionId, studentId } = req.body;
    const supervisor = (req as any).user;

    if (!supervisor || supervisor.role !== 'SUPERVISOR') {
      return res.status(403).json({ error: 'Seul un surveillant peut effectuer un émargement manuel' });
    }

    const io = req.app.get('io');
    const result = await AttendanceService.supervisorManualSign(
      sessionId,
      studentId,
      supervisor.id,
      io
    );

    if (!result.success) {
      return res.status(400).json({ error: result.message });
    }

    return res.json({ success: true, message: result.message });
  }
}

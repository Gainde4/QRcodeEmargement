import { Server, Socket } from 'socket.io';
import { db } from '../config';
import { QrSecurityService } from './qrSecurity.service';
import QRCode from 'qrcode';

interface ActiveSessionTimer {
  intervalId: NodeJS.Timeout;
  sessionId: string;
  secret: string;
  intervalSec: number;
}

export class SessionSocketService {
  private static activeTimers: Map<string, ActiveSessionTimer> = new Map();

  public static initialize(io: Server) {
    io.on('connection', (socket: Socket) => {
      // Rejoindre la salle d'une session d'examen (Écran salle ou Dashboard Surveillant)
      socket.on('join:session', async (data: { sessionId: string; role?: string }) => {
        const { sessionId, role } = data;
        socket.join(`session:${sessionId}`);
        console.log(`[Socket] Client ${socket.id} (${role || 'guest'}) a rejoint la session ${sessionId}`);

        // Si le timer n'est pas encore actif pour cette session, on le lance
        await this.ensureSessionTicker(io, sessionId);

        // Envoyer immédiatement l'état actuel et la liste des déjà émargés
        try {
          const stats = await db.query(
            `SELECT COUNT(*)::int as total_signed 
             FROM attendances WHERE session_id = $1`,
            [sessionId]
          );
          socket.emit('session:stats', { totalSigned: stats.rows[0]?.total_signed || 0 });
        } catch (e) {
          // ignore
        }
      });

      socket.on('leave:session', (data: { sessionId: string }) => {
        socket.leave(`session:${data.sessionId}`);
      });
    });
  }

  /**
   * Assure qu'un ticker de régénération QR tourne pour la session active
   */
  public static async ensureSessionTicker(io: Server, sessionId: string) {
    if (this.activeTimers.has(sessionId)) {
      return;
    }

    const res = await db.query(
      `SELECT id, status, session_secret, qr_refresh_interval_sec, room_name 
       FROM exam_sessions 
       WHERE id = $1`,
      [sessionId]
    );

    if (res.rowCount === 0) return;
    const session = res.rows[0];

    if (session.status !== 'ACTIVE') return;

    const intervalSec = session.qr_refresh_interval_sec || 8;
    const secret = session.session_secret;

    console.log(`[Socket] Démarrage du générateur QR dynamique pour la session ${sessionId} (rotation toutes les ${intervalSec}s)`);

    // Fonction d'émission d'un nouveau QR Code
    const emitNewQr = async () => {
      try {
        const { rawToken, payload } = QrSecurityService.generateDynamicQr(sessionId, secret, intervalSec);
        
        // Génère le Data URL SVG/PNG du QR Code côté serveur pour transmission immédiate
        const qrDataUrl = await QRCode.toDataURL(rawToken, {
          errorCorrectionLevel: 'M',
          margin: 2,
          width: 480,
          color: {
            dark: '#0f172a',
            light: '#ffffff',
          },
        });

        io.to(`session:${sessionId}`).emit('qr:update', {
          sessionId,
          rawToken,
          qrDataUrl,
          expiresInSec: intervalSec,
          timestamp: payload.timestamp,
          bucket: payload.bucket,
        });
      } catch (err) {
        console.error(`Erreur génération QR pour ${sessionId}:`, err);
      }
    };

    // Première émission immédiate
    await emitNewQr();

    // Boucle de rotation
    const intervalId = setInterval(emitNewQr, intervalSec * 1000);

    this.activeTimers.set(sessionId, {
      intervalId,
      sessionId,
      secret,
      intervalSec,
    });
  }

  /**
   * Arrête le ticker de session (fin d'épreuve)
   */
  public static stopSessionTicker(sessionId: string) {
    const timer = this.activeTimers.get(sessionId);
    if (timer) {
      clearInterval(timer.intervalId);
      this.activeTimers.delete(sessionId);
      console.log(`[Socket] Arrêt du générateur QR pour la session ${sessionId}`);
    }
  }
}

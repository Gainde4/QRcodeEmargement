import { Router, Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import { AuthController } from '../controllers/auth.controller';
import { SessionController } from '../controllers/session.controller';
import { AttendanceController } from '../controllers/attendance.controller';

const router = Router();

// Middleware d'authentification JWT
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token Bearer manquant ou invalide' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    (req as any).user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Session expirée ou token invalide' });
  }
};

// --- Routes Authentification & Référentiel ---
router.post('/auth/login', AuthController.login);
router.get('/auth/demo-users', AuthController.getDemoAccounts);

// --- Routes Sessions d'examen ---
router.get('/sessions', SessionController.listSessions);
router.get('/sessions/:id', SessionController.getSessionDetails);
router.patch('/sessions/:id/status', requireAuth, SessionController.updateStatus);

// --- Routes Émargement (Scan QR & Manuel) ---
router.post('/attendance/scan', requireAuth, AttendanceController.scanQrCode);
router.post('/attendance/manual', requireAuth, AttendanceController.manualSign);

export default router;

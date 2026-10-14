import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from './config';
import apiRoutes from './routes/api.routes';
import { SessionSocketService } from './services/sessionSocket.service';

const app = express();
const server = http.createServer(app);

// Configuration Socket.io avec support CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH'],
  },
});

app.set('io', io);

// Middlewares globaux
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*' }));
app.use(express.json());

// Limiteur de débit pour contrer le bruteforce
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 120, // 120 requêtes par IP par minute
  message: { error: 'Trop de requêtes, veuillez patienter quelques secondes.' },
});
app.use('/api/', apiLimiter);

// Montage des routes API
app.use('/api', apiRoutes);

// Healthcheck
app.get('/health', (req, res) => {
  res.json({
    status: 'UP',
    timestamp: new Date().toISOString(),
    service: 'QR-Emargement-Backend',
  });
});

// Initialisation des WebSockets
SessionSocketService.initialize(io);

// Lancement du serveur HTTP
server.listen(config.port, () => {
  console.log(`====================================================`);
  console.log(`🚀 Serveur Émargement démarré sur http://localhost:${config.port}`);
  console.log(`📡 WebSocket prêt pour les écrans de projection et scans`);
  console.log(`⏱️ Intervalle de rotation QR: ${config.qrIntervalSec}s (tolérance +/- ${config.qrToleranceSec}s)`);
  console.log(`====================================================`);
});

import express from 'express';
import http from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { config } from './config/index.js';
import { socketService } from './services/socketService.js';
import { AiService } from './services/aiService.js';
import authRoutes from './routes/authRoutes.js';
import authorizationRoutes from './routes/authorizationRoutes.js';
import projectRoutes from './routes/projectRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import userRoutes from './routes/userRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import invitationRoutes from './routes/invitationRoutes.js';
import { prisma } from './lib/prisma.js';
import { ensureInvitationConstraints } from './services/invitationService.js';

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
socketService.init(server, config.frontendUrl);

// Middleware
const allowedOrigins = [
  config.frontendUrl,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
];

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (like mobile apps, curl, postman)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else if (process.env.NODE_ENV !== 'production') {
        callback(null, true); // Permissive for local dev
      } else {
        callback(new Error('Origin not allowed by CORS'));
      }
    },
    credentials: true,
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Health Check
app.get('/api/health', async (req, res) => {
  let dbStatus = 'ok';
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err: any) {
    dbStatus = `error: ${err.message}`;
  }

  const aiStatus = await AiService.checkHealth();

  res.json({
    status: 'healthy',
    service: 'backend-core',
    port: config.port,
    database: dbStatus,
    aiService: aiStatus,
  });
});

// Mount Routes
app.use('/api/auth', authRoutes);
app.use('/api/authorization', authorizationRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/tickets', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/invitations', invitationRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route ${req.method} ${req.url} not found` });
});

// Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('[Global Error]', err);
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

server.listen(config.port, () => {
  console.log(`🚀 Backend Core API running on http://localhost:${config.port}`);
  console.log(`🔌 WebSocket service active`);
  console.log(`🤖 Connected to AI Service at ${config.aiServiceUrl}`);
  ensureInvitationConstraints().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[startup] invitation constraint check failed', message);
  });
});

export { app, server };

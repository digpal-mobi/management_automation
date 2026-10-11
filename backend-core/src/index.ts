import express from 'express';
import http from 'http';
import cors from 'cors';
import { config } from './config/index.js';
import { socketService } from './services/socketService.js';
import { AiService } from './services/aiService.js';
import projectRoutes from './routes/projectRoutes.js';
import ticketRoutes from './routes/ticketRoutes.js';
import messageRoutes from './routes/messageRoutes.js';
import userRoutes from './routes/userRoutes.js';
import { prisma } from './lib/prisma.js';

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
socketService.init(server, config.frontendUrl);

// Middleware
app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

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
app.use('/api/projects', projectRoutes);
app.use('/api/tickets', ticketRoutes);
app.use('/api/tickets', messageRoutes);
app.use('/api/users', userRoutes);

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
});

export { app, server };

import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';

class SocketService {
  private io: SocketIOServer | null = null;

  init(server: HttpServer, allowedOrigin: string) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      },
      pingTimeout: 60000,
      pingInterval: 25000,
    });

    this.io.on('connection', (socket: Socket) => {
      console.log(`[Socket] Client connected: ${socket.id}`);

      socket.on('join:project', (projectId: string) => {
        socket.join(`project:${projectId}`);
        console.log(`[Socket] ${socket.id} joined project:${projectId}`);
      });

      socket.on('leave:project', (projectId: string) => {
        socket.leave(`project:${projectId}`);
      });

      socket.on('join:ticket', (ticketId: string) => {
        socket.join(`ticket:${ticketId}`);
        console.log(`[Socket] ${socket.id} joined ticket:${ticketId}`);
      });

      socket.on('leave:ticket', (ticketId: string) => {
        socket.leave(`ticket:${ticketId}`);
      });

      socket.on('disconnect', () => {
        console.log(`[Socket] Client disconnected: ${socket.id}`);
      });
    });

    console.log('[Socket] Socket.IO service initialized');
  }

  emitToProject(projectId: string, event: string, data: any) {
    if (this.io) {
      this.io.to(`project:${projectId}`).emit(event, data);
    }
  }

  emitToTicket(ticketId: string, event: string, data: any) {
    if (this.io) {
      this.io.to(`ticket:${ticketId}`).emit(event, data);
    }
  }

  broadcast(event: string, data: any) {
    if (this.io) {
      this.io.emit(event, data);
    }
  }
}

export const socketService = new SocketService();

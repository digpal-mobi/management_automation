import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

class SocketClient {
  private socket: Socket | null = null;

  connect(): Socket {
    if (!this.socket) {
      this.socket = io(SOCKET_URL, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
      });

      this.socket.on('connect', () => {
        console.log('[Socket] Connected to backend real-time server:', this.socket?.id);
      });

      this.socket.on('disconnect', (reason) => {
        console.log('[Socket] Disconnected:', reason);
      });
    }
    return this.socket;
  }

  joinProject(projectId: string) {
    if (this.socket) {
      this.socket.emit('join:project', projectId);
    }
  }

  leaveProject(projectId: string) {
    if (this.socket) {
      this.socket.emit('leave:project', projectId);
    }
  }

  joinTicket(ticketId: string) {
    if (this.socket) {
      this.socket.emit('join:ticket', ticketId);
    }
  }

  leaveTicket(ticketId: string) {
    if (this.socket) {
      this.socket.emit('leave:ticket', ticketId);
    }
  }

  getSocket(): Socket | null {
    return this.socket;
  }
}

export const socketClient = new SocketClient();

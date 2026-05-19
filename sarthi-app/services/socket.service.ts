import { io, Socket } from 'socket.io-client';
import { WS_BASE } from '@/config/api';

class SocketService {
  private socket: Socket | null = null;

  connect(token: string): void {
    if (this.socket?.connected) {
      console.log('[SocketService] Already connected');
      return;
    }
    console.log('[SocketService] Connecting to', WS_BASE);
    this.socket = io(WS_BASE, {
      auth: { token },
      transports: ['websocket'],
    });
    this.socket.on('connect', () => {
      console.log('[SocketService] Connected with id:', this.socket?.id);
    });
    this.socket.on('disconnect', () => {
      console.log('[SocketService] Disconnected');
    });
    this.socket.on('connect_error', (err) => {
      console.log('[SocketService] Connection error:', err);
    });
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  emit(event: string, data?: any): void {
    this.socket?.emit(event, data);
  }

  on(event: string, cb: (data: any) => void): void {
    this.socket?.on(event, cb);
  }

  off(event: string, cb?: (data: any) => void): void {
    if (cb) {
      this.socket?.off(event, cb);
    } else {
      this.socket?.off(event);
    }
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();

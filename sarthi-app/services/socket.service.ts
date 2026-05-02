import { io, Socket } from 'socket.io-client';
import { WS_BASE } from '@/config/api';

class SocketService {
  private socket: Socket | null = null;

  connect(token: string): void {
    if (this.socket?.connected) return;
    this.socket = io(WS_BASE, {
      auth: { token },
      transports: ['websocket'],
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

  off(event: string): void {
    this.socket?.off(event);
  }

  isConnected(): boolean {
    return this.socket?.connected ?? false;
  }
}

export const socketService = new SocketService();

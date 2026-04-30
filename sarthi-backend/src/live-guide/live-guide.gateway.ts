import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import * as admin from 'firebase-admin';
import { LiveGuideService } from './live-guide.service';
import { PrismaService } from '../prisma/prisma.service';

interface SocketContext {
  userId: string;
  sessionId: string | null;
  tripId: string | null;
}

@WebSocketGateway({ cors: { origin: '*' } })
export class LiveGuideGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(LiveGuideGateway.name);

  private readonly connectedSockets = new Map<string, SocketContext>();
  private readonly userSockets = new Map<string, Set<string>>();

  constructor(
    @Inject(forwardRef(() => LiveGuideService))
    private readonly liveGuideService: LiveGuideService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const rawToken = client.handshake.auth?.token ?? '';
    const token = typeof rawToken === 'string' ? rawToken.replace('Bearer ', '') : '';

    if (!token) {
      client.disconnect();
      return;
    }

    try {
      const decoded = await admin.auth().verifyIdToken(token);
      client.data.userId = decoded.uid;
      client.data.displayName = decoded.name ?? '';

      this.connectedSockets.set(client.id, { userId: decoded.uid, sessionId: null, tripId: null });
      if (!this.userSockets.has(decoded.uid)) this.userSockets.set(decoded.uid, new Set());
      this.userSockets.get(decoded.uid)!.add(client.id);

      this.logger.log(`WS connected: ${decoded.uid}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const ctx = this.connectedSockets.get(client.id);
    if (ctx) {
      this.userSockets.get(ctx.userId)?.delete(client.id);
      if (this.userSockets.get(ctx.userId)?.size === 0) this.userSockets.delete(ctx.userId);
      this.connectedSockets.delete(client.id);
      this.logger.log(`WS disconnected: ${ctx.userId}`);
    }
  }

  isConnected(userId: string): boolean {
    return (this.userSockets.get(userId)?.size ?? 0) > 0;
  }

  sendToUser(userId: string, event: string, data: any): void {
    for (const socketId of this.userSockets.get(userId) ?? []) {
      this.server?.to(socketId).emit(event, data);
    }
  }

  @SubscribeMessage('activate_guide')
  async onActivateGuide(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { tripId: string; fcmToken?: string },
  ) {
    const userId: string = client.data?.userId;
    if (!userId) {
      client.emit('error', { message: 'Not authenticated' });
      return;
    }

    try {
      const result = await this.liveGuideService.activateGuide(payload.tripId, userId, payload.fcmToken ?? '');
      const ctx = this.connectedSockets.get(client.id);
      if (ctx) {
        ctx.sessionId = result.sessionId;
        ctx.tripId = payload.tripId;
      }
      client.emit('guide_activated', result);
    } catch (err) {
      client.emit('error', { message: (err as Error).message });
    }
  }

  @SubscribeMessage('location_update')
  async onLocationUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { lat: number; lng: number; timestamp?: number },
  ) {
    const ctx = this.connectedSockets.get(client.id);
    if (!ctx?.sessionId) return;
    try {
      const session = await this.prisma.liveGuideSession.findUnique({ where: { id: ctx.sessionId } });
      if (session) await this.liveGuideService.handleLocationUpdate(ctx.sessionId, session, payload.lat, payload.lng);
    } catch (err) {
      this.logger.warn(`location_update error: ${(err as Error).message}`);
    }
  }

  @SubscribeMessage('mark_done')
  async onMarkDone(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { dayIndex: number; activityIndex: number },
  ) {
    const ctx = this.connectedSockets.get(client.id);
    if (!ctx?.sessionId) return;
    try {
      const session = await this.prisma.liveGuideSession.findUnique({ where: { id: ctx.sessionId } });
      if (!session) return;
      const result = await this.liveGuideService.markActivityDone(ctx.sessionId, session, payload.dayIndex, payload.activityIndex);
      client.emit('activity_marked', result);
    } catch (err) {
      client.emit('error', { message: (err as Error).message });
    }
  }

  @SubscribeMessage('skip_activity')
  async onSkipActivity(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { dayIndex: number; activityIndex: number; reason?: string },
  ) {
    const ctx = this.connectedSockets.get(client.id);
    if (!ctx?.sessionId || !ctx.tripId || !client.data?.userId) return;
    try {
      const session = await this.prisma.liveGuideSession.findUnique({ where: { id: ctx.sessionId } });
      if (!session) return;
      const result = await this.liveGuideService.skipActivity(
        ctx.sessionId, ctx.tripId, client.data.userId, session, payload.dayIndex, payload.activityIndex, payload.reason,
      );
      client.emit('activity_marked', result);
    } catch (err) {
      client.emit('error', { message: (err as Error).message });
    }
  }

  @SubscribeMessage('request_replan')
  async onRequestReplan(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { dayIndex: number },
  ) {
    const ctx = this.connectedSockets.get(client.id);
    if (!ctx?.sessionId || !ctx.tripId || !client.data?.userId) return;
    try {
      const session = await this.prisma.liveGuideSession.findUnique({ where: { id: ctx.sessionId } });
      if (!session) return;
      const result = await this.liveGuideService.replanDay(ctx.sessionId, ctx.tripId, client.data.userId, session, payload.dayIndex, 'manual');
      client.emit('replan_result', result);
    } catch (err) {
      client.emit('error', { message: (err as Error).message });
    }
  }

  @SubscribeMessage('deactivate_guide')
  async onDeactivateGuide(@ConnectedSocket() client: Socket) {
    const ctx = this.connectedSockets.get(client.id);
    if (!ctx?.sessionId) return;
    try {
      await this.liveGuideService.deactivate(ctx.sessionId);
      ctx.sessionId = null;
      ctx.tripId = null;
      client.emit('guide_deactivated', {});
    } catch (err) {
      client.emit('error', { message: (err as Error).message });
    }
  }
}

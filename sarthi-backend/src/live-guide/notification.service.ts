import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import { DevicesService } from '../devices/devices.service';

@Injectable()
export class NotificationService {
  private readonly logger = new Logger(NotificationService.name);

  constructor(private readonly devicesService: DevicesService) {}

  async sendPush(
    tokens: string[],
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    if (!tokens.length) return;
    try {
      await admin.messaging().sendEachForMulticast({
        tokens,
        notification: { title, body },
        ...(data ? { data } : {}),
      } as any);
    } catch (err) {
      this.logger.warn(`FCM send failed: ${(err as Error).message}`);
    }
  }

  async sendToUser(
    userId: string,
    title: string,
    body: string,
    data?: Record<string, string>,
  ): Promise<void> {
    const tokens = await this.devicesService.getTokensForUser(userId);
    await this.sendPush(tokens, title, body, data);
  }
}

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Injectable()
export class DevicesService {
  constructor(private readonly prisma: PrismaService) {}

  private async findOrCreateUser(firebaseUid: string) {
    return this.prisma.user.upsert({
      where: { firebaseUid },
      update: {},
      create: { firebaseUid },
    });
  }

  async register(firebaseUid: string, dto: RegisterDeviceDto) {
    const user = await this.findOrCreateUser(firebaseUid);
    return this.prisma.userDevice.upsert({
      where: { fcmToken: dto.fcmToken },
      update: { platform: dto.platform, userId: user.id },
      create: { fcmToken: dto.fcmToken, platform: dto.platform, userId: user.id },
    });
  }

  async unregister(firebaseUid: string, fcmToken: string) {
    const user = await this.findOrCreateUser(firebaseUid);
    await this.prisma.userDevice.deleteMany({ where: { fcmToken, userId: user.id } });
  }

  async getTokensForUser(userId: string): Promise<string[]> {
    const devices = await this.prisma.userDevice.findMany({
      where: { userId },
      select: { fcmToken: true },
    });
    return devices.map((d) => d.fcmToken);
  }
}

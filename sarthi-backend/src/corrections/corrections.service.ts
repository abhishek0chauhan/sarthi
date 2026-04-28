import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCorrectionDto } from './dto/create-correction.dto';
import { Prisma } from '@prisma/client';

@Injectable()
export class CorrectionsService {
  constructor(private readonly prisma: PrismaService) {}

  private async findOrCreateUser(firebaseUid: string) {
    return this.prisma.user.upsert({
      where: { firebaseUid },
      update: {},
      create: { firebaseUid },
    });
  }

  async create(firebaseUid: string, dto: CreateCorrectionDto) {
    const user = await this.findOrCreateUser(firebaseUid);
    return this.prisma.correction.create({
      data: {
        userId: user.id,
        tripId: dto.tripId,
        type: dto.type,
        context: dto.context as Prisma.InputJsonValue,
      },
    });
  }

  async listByUser(firebaseUid: string) {
    const user = await this.findOrCreateUser(firebaseUid);
    return this.prisma.correction.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRecentForPrompt(userId: string) {
    return this.prisma.correction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
  }
}

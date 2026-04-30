import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { LiveGuideSession } from '@prisma/client';

@Injectable()
export class SessionService {
  constructor(private readonly prisma: PrismaService) {}

  computeCurrentDay(dates: { from: string; to: string }): {
    dayIndex: number;
    status: 'before' | 'during' | 'after';
    totalDays: number;
  } {
    const todayStr = new Date().toISOString().split('T')[0];
    const today = new Date(todayStr);
    const from = new Date(dates.from);
    const to = new Date(dates.to);

    const totalDays = Math.round((to.getTime() - from.getTime()) / 86400000) + 1;

    if (today < from) return { dayIndex: -1, status: 'before', totalDays };
    if (today > to) return { dayIndex: totalDays, status: 'after', totalDays };

    const dayIndex = Math.round((today.getTime() - from.getTime()) / 86400000);
    return { dayIndex, status: 'during', totalDays };
  }

  async findActive(tripId: string, userId: string): Promise<LiveGuideSession | null> {
    return this.prisma.liveGuideSession.findFirst({
      where: { tripId, userId, isActive: true },
    });
  }

  async create(tripId: string, userId: string, currentDay: number): Promise<LiveGuideSession> {
    return this.prisma.liveGuideSession.create({
      data: {
        tripId,
        userId,
        currentDay,
        isActive: true,
        activatedAt: new Date(),
        activityStatus: {},
      },
    });
  }

  async update(sessionId: string, data: Partial<Omit<LiveGuideSession, 'id' | 'createdAt'>>): Promise<LiveGuideSession> {
    return this.prisma.liveGuideSession.update({
      where: { id: sessionId },
      data: { ...data, updatedAt: new Date() } as any,
    });
  }

  async deactivate(sessionId: string): Promise<void> {
    await this.prisma.liveGuideSession.update({
      where: { id: sessionId },
      data: { isActive: false, deactivatedAt: new Date() },
    });
  }

  async getAllActiveSessions(): Promise<LiveGuideSession[]> {
    return this.prisma.liveGuideSession.findMany({
      where: { isActive: true },
    });
  }
}

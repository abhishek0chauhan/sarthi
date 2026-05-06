import { Controller, Get, Param, Req, UseGuards, Logger } from '@nestjs/common';
import { Request } from 'express';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { LiveGuideService } from './live-guide.service';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityScheduleResponseDto } from './dto/activity-schedule.dto';

// Typed request interface for authenticated requests
interface AuthenticatedRequest extends Request {
  user: { uid: string; [key: string]: any };
}

@Controller('live-guide')
@UseGuards(FirebaseAuthGuard)
export class LiveGuideController {
  private readonly logger = new Logger(LiveGuideController.name);

  constructor(
    private readonly service: LiveGuideService,
    private readonly prisma: PrismaService,
  ) {}

  @Get(':tripId/status')
  async status(
    @Param('tripId') tripId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    return this.service.getSessionStatus(tripId, req.user.uid);
  }

  @Get(':tripId/activity-schedule')
  async getActivitySchedule(
    @Param('tripId') tripId: string,
    @Req() req: AuthenticatedRequest,
  ): Promise<ActivityScheduleResponseDto> {
    try {
      // Query for unsent notifications
      const schedules = await this.prisma.activitySchedule.findMany({
        where: {
          tripId,
          userId: req.user.uid,
          notificationSent: false,
        },
        orderBy: { scheduledTime: 'asc' },
      });

      // Transform to response format
      return {
        scheduledActivities: schedules.map((s) => ({
          activityIndex: s.activityIndex,
          activity: s.activity,
          scheduledTime: s.scheduledTime.getTime(), // Return as Unix timestamp ms
          distance: s.distance,
          estimatedTravelTime: s.estimatedTravelTime,
        })),
      };
    } catch (err) {
      this.logger.error(
        `Failed to fetch activity schedule for trip ${tripId}, user ${req.user.uid}:`,
        err instanceof Error ? err.message : String(err),
      );
      throw err; // Re-throw so NestJS exception filter handles it
    }
  }
}

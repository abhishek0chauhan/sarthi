import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { LiveGuideService } from './live-guide.service';
import { PrismaService } from '../prisma/prisma.service';
import { ActivityScheduleResponseDto } from './dto/activity-schedule.dto';

@Controller('live-guide')
@UseGuards(FirebaseAuthGuard)
export class LiveGuideController {
  constructor(
    private readonly service: LiveGuideService,
    private readonly prisma: PrismaService,
  ) {}

  @Get(':tripId/status')
  async status(@Param('tripId') tripId: string, @Req() req: any) {
    return this.service.getSessionStatus(tripId, req.user.uid);
  }

  @Get(':tripId/activity-schedule')
  async getActivitySchedule(
    @Param('tripId') tripId: string,
    @Req() req: any,
  ): Promise<ActivityScheduleResponseDto> {
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
  }
}

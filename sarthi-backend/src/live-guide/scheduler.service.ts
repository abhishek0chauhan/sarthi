import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { LiveGuideService } from './live-guide.service';
import { SessionService } from './session.service';

@Injectable()
export class SchedulerService {
  private readonly logger = new Logger(SchedulerService.name);

  constructor(
    private readonly liveGuideService: LiveGuideService,
    private readonly sessionService: SessionService,
  ) {}

  @Cron('* * * * *')
  async tickCron(): Promise<void> {
    const now = new Date();
    const istHour = Number(now.toLocaleString('en-GB', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }));
    const istMinute = now.getMinutes();
    await this.tick(istHour, istMinute);
  }

  async tick(istHour: number, istMinute: number): Promise<void> {
    const sessions = await this.sessionService.getAllActiveSessions();
    const today = new Date().toISOString().split('T')[0];

    for (const session of sessions) {
      try {
        if (istHour === 7) {
          const lastBriefing = session.lastBriefingAt ? new Date(session.lastBriefingAt).toISOString().split('T')[0] : null;
          if (lastBriefing !== today) {
            await this.liveGuideService.sendMorningBriefing(session as any);
          }
        }

        if (istHour === 8 && istMinute === 0) {
          const lastBreakfast = session.lastBreakfastAt ? new Date(session.lastBreakfastAt).toISOString().split('T')[0] : null;
          if (lastBreakfast !== today) {
            await this.liveGuideService.sendMealNudge(session as any, 'breakfast');
          }
        }

        if (istHour === 13 && istMinute === 0) {
          const lastLunch = session.lastLunchAt ? new Date(session.lastLunchAt).toISOString().split('T')[0] : null;
          if (lastLunch !== today) {
            await this.liveGuideService.sendMealNudge(session as any, 'lunch');
          }
        }

        if (istHour === 19 && istMinute === 0) {
          const lastDinner = session.lastDinnerAt ? new Date(session.lastDinnerAt).toISOString().split('T')[0] : null;
          if (lastDinner !== today) {
            await this.liveGuideService.sendMealNudge(session as any, 'dinner');
          }
        }
      } catch (err) {
        this.logger.warn(`Scheduler tick error for session ${session.id}: ${(err as Error).message}`);
      }
    }
  }
}

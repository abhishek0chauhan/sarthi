import { forwardRef, Module } from '@nestjs/common';
import { LiveGuideController } from './live-guide.controller';
import { LiveGuideService } from './live-guide.service';
import { LiveGuideGateway } from './live-guide.gateway';
import { SessionService } from './session.service';
import { NotificationService } from './notification.service';
import { SchedulerService } from './scheduler.service';
import { ActivitySchedulerService } from './activity-scheduler.service';
import { DevicesModule } from '../devices/devices.module';
import { ProfileModule } from '../profile/profile.module';
import { CorrectionsModule } from '../corrections/corrections.module';

@Module({
  imports: [DevicesModule, ProfileModule, CorrectionsModule],
  controllers: [LiveGuideController],
  providers: [
    LiveGuideService,
    LiveGuideGateway,
    SessionService,
    NotificationService,
    SchedulerService,
    ActivitySchedulerService,
  ],
  exports: [LiveGuideService, LiveGuideGateway],
})
export class LiveGuideModule {}

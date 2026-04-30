import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { LiveGuideService } from './live-guide.service';

@Controller('live-guide')
@UseGuards(FirebaseAuthGuard)
export class LiveGuideController {
  constructor(private readonly service: LiveGuideService) {}

  @Get(':tripId/status')
  async status(@Param('tripId') tripId: string, @Req() req: any) {
    return this.service.getSessionStatus(tripId, req.user.uid);
  }
}

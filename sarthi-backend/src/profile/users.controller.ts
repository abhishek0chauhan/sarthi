import { Body, Controller, Patch, Req, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { ProfileService } from './profile.service';
import { UpdateNotificationPrefsDto } from './dto/update-notification-prefs.dto';

@Controller('users')
@UseGuards(FirebaseAuthGuard)
export class UsersController {
  constructor(private readonly service: ProfileService) {}

  @Patch('me/notification-prefs')
  async updatePrefs(@Body() dto: UpdateNotificationPrefsDto, @Req() req: any) {
    return this.service.updateNotificationPrefs(req.user.uid, dto);
  }
}

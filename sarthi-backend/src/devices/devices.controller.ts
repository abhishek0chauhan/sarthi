import { Body, Controller, Delete, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { DevicesService } from './devices.service';
import { RegisterDeviceDto } from './dto/register-device.dto';

@Controller('devices')
@UseGuards(FirebaseAuthGuard)
export class DevicesController {
  constructor(private readonly service: DevicesService) {}

  @Post()
  async register(@Body() dto: RegisterDeviceDto, @Req() req: any) {
    return this.service.register(req.user.uid, dto);
  }

  @Delete(':fcmToken')
  @HttpCode(204)
  async unregister(@Param('fcmToken') fcmToken: string, @Req() req: any) {
    await this.service.unregister(req.user.uid, fcmToken);
  }
}

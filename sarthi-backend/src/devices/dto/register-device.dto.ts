import { IsEnum, IsString } from 'class-validator';

export class RegisterDeviceDto {
  @IsString()
  fcmToken: string;

  @IsEnum(['android', 'ios', 'web'])
  platform: string;
}

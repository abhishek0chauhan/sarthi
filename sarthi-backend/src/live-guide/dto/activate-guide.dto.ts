import { IsOptional, IsString } from 'class-validator';

export class ActivateGuideDto {
  @IsString()
  tripId: string;

  @IsOptional()
  @IsString()
  fcmToken?: string;
}

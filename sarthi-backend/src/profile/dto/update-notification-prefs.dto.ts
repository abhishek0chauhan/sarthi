import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationPrefsDto {
  @IsOptional() @IsBoolean() morningBriefing?: boolean;
  @IsOptional() @IsBoolean() mealNudges?: boolean;
  @IsOptional() @IsBoolean() smartSuggestions?: boolean;
  @IsOptional() @IsBoolean() locationAlerts?: boolean;
  @IsOptional() @IsBoolean() tripReminders?: boolean;
}

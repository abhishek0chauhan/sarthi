import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class MarkActivityDto {
  @IsNumber()
  @Min(0)
  dayIndex: number;

  @IsNumber()
  @Min(0)
  activityIndex: number;

  @IsOptional()
  @IsString()
  reason?: string;
}

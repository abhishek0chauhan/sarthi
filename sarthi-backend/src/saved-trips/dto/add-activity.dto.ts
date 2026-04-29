import { IsString, IsOptional, IsNumber, Min } from 'class-validator';

export class AddActivityDto {
  @IsString()
  activity: string;

  @IsOptional()
  @IsString()
  time?: string;

  @IsOptional()
  @IsString()
  cost?: string;

  @IsOptional()
  @IsString()
  healthNote?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  position?: number;
}

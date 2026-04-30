import { IsNumber, IsOptional } from 'class-validator';

export class LocationUpdateDto {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsOptional()
  @IsNumber()
  timestamp?: number;
}

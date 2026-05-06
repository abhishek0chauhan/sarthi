import {
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateSavedTripDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsEnum(['train', 'flight', 'bus', 'car'])
  travelMode?: string;

  @IsOptional()
  @IsObject()
  itineraryData?: object;

  @IsOptional()
  @IsObject()
  foodGuideData?: object;
}

import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class DateRangeDto {
  @IsDateString()
  from: string;

  @IsDateString()
  to: string;
}

class BudgetDto {
  @IsInt()
  @Min(2000)
  min: number;

  @IsInt()
  @Min(2000)
  max: number;
}

class GroupDto {
  @IsEnum(['solo', 'couple', 'friends', 'family'])
  type: string;
}

export class ItineraryDto {
  @IsString()
  destination: string;

  @IsString()
  state: string;

  @ValidateNested()
  @Type(() => DateRangeDto)
  dates: DateRangeDto;

  @ValidateNested()
  @Type(() => BudgetDto)
  budget: BudgetDto;

  @ValidateNested()
  @Type(() => GroupDto)
  group: GroupDto;

  @IsString()
  departureCity: string;

  @IsString()
  freeText: string;

  @IsOptional()
  @IsEnum(['male', 'female', 'other'])
  gender?: string;

  @IsOptional()
  @IsInt()
  @Min(10)
  @Max(100)
  age?: number;

  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(300)
  weight?: number;

  @IsOptional()
  @IsNumber()
  @Min(100)
  @Max(250)
  height?: number;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  medicalConditions?: string[];

  @IsOptional()
  @IsEnum(['train', 'flight', 'bus', 'car'])
  travelMode?: string;
}

import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
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

class GroupDto {
  @IsEnum(['solo', 'couple', 'friends', 'family'])
  type: string;
}

export class FoodGuideDto {
  @IsString()
  destination: string;

  @IsString()
  state: string;

  @ValidateNested()
  @Type(() => DateRangeDto)
  dates: DateRangeDto;

  @ValidateNested()
  @Type(() => GroupDto)
  group: GroupDto;

  @IsString()
  departureCity: string;

  @IsString()
  freeText: string;

  @IsOptional()
  @IsEnum(['low', 'medium', 'high'])
  spiceTolerance?: string;

  @IsOptional()
  @IsEnum(['street', 'moderate', 'fine-dining'])
  foodBudget?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allergies?: string[];

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
  @IsArray()
  @IsString({ each: true })
  cuisinePreferences?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  cookingStyles?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  flavorPreferences?: string[];

  @IsOptional()
  @IsEnum(['familiar', 'local_specialties', 'very_adventurous'])
  adventurousness?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  favoriteDishes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  meatPreferences?: string[];
}

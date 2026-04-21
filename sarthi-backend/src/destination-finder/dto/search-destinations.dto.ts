import {
  IsArray,
  IsBoolean,
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
  @Min(0)
  min: number;

  @IsInt()
  @Min(0)
  max: number;
}

class GroupDto {
  @IsInt()
  @Min(1)
  size: number;

  @IsEnum(['solo', 'couple', 'friends', 'family'])
  type: string;
}

export class SearchDestinationsDto {
  @ValidateNested()
  @Type(() => DateRangeDto)
  dates: DateRangeDto;

  @ValidateNested()
  @Type(() => BudgetDto)
  budget: BudgetDto;

  @IsArray()
  @IsString({ each: true })
  experienceTypes: string[];

  @IsString()
  departureCity: string;

  @ValidateNested()
  @Type(() => GroupDto)
  group: GroupDto;

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
  @IsEnum(['veg', 'non-veg', 'vegan', 'eggetarian', 'jain'])
  dietType?: string;

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
  @IsBoolean()
  hiddenGem?: boolean;
}

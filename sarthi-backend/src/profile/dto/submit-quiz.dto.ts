import { IsOptional, IsString, IsIn, IsArray } from 'class-validator';

const MOTIVATIONS = ['food','nature','culture','adventure','photography','spiritual','nightlife','shopping','relaxation'];

export class SubmitQuizDto {
  @IsOptional() @IsString() @IsIn(['packed','loose','no_plan'])
  travelPace?: string;

  @IsOptional() @IsString() @IsIn(['deep','balanced','cover'])
  depthVsBreadth?: string;

  @IsOptional() @IsString() @IsIn(['hotel','homestay','rough'])
  comfortLevel?: string;

  @IsOptional() @IsString() @IsIn(['worth_it','hidden','avoid'])
  crowdTolerance?: string;

  @IsOptional() @IsArray() @IsIn(MOTIVATIONS, { each: true })
  travelMotivations?: string[];

  @IsOptional() @IsString() @IsIn(['yes','maybe','no'])
  physicalReadiness?: string;

  @IsOptional() @IsString() @IsIn(['experience','budget','comfort'])
  spendingStyle?: string;

  @IsOptional() @IsString() @IsIn(['bring_it','tolerate','need_comfort'])
  groundReality?: string;

  @IsOptional() @IsString() @IsIn(['fine','hindi','english'])
  languageComfort?: string;
}

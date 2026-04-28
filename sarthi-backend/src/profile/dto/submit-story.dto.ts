import { IsString, MinLength, MaxLength } from 'class-validator';

export class SubmitStoryDto {
  @IsString()
  @MinLength(20, { message: 'Story must be at least 20 characters' })
  @MaxLength(2000, { message: 'Story must be at most 2000 characters' })
  story: string;
}

import { IsString, IsIn, IsObject } from 'class-validator';

const CORRECTION_TYPES = [
  'removed_place',
  'added_place',
  'swapped_place',
  'thumbs_down',
  'thumbs_up',
];

export class CreateCorrectionDto {
  @IsString()
  tripId: string;

  @IsString()
  @IsIn(CORRECTION_TYPES)
  type: string;

  @IsObject()
  context: Record<string, unknown>;
}

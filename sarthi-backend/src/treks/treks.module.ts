import { Module } from '@nestjs/common';
import { TrekService } from './trek.service';

@Module({
  providers: [TrekService],
  exports: [TrekService],
})
export class TreksModule {}

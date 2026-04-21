import { Module } from '@nestjs/common';
import { DestinationFinderController } from './destination-finder.controller';
import { DestinationFinderService } from './destination-finder.service';
import { DestinationQueryService } from './destination-query.service';
import { TreksModule } from '../treks/treks.module';

@Module({
  imports: [TreksModule],
  controllers: [DestinationFinderController],
  providers: [DestinationFinderService, DestinationQueryService],
})
export class DestinationFinderModule {}

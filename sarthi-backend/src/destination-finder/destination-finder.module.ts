import { Module } from '@nestjs/common';
import { DestinationFinderController } from './destination-finder.controller';
import { DestinationFinderService } from './destination-finder.service';
import { DestinationQueryService } from './destination-query.service';
import { TreksModule } from '../treks/treks.module';
import { ProfileModule } from '../profile/profile.module';
import { CorrectionsModule } from '../corrections/corrections.module';

@Module({
  imports: [TreksModule, ProfileModule, CorrectionsModule],
  controllers: [DestinationFinderController],
  providers: [DestinationFinderService, DestinationQueryService],
})
export class DestinationFinderModule {}

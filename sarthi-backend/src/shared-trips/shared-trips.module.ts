import { Module } from '@nestjs/common';
import { SharedTripsController } from './shared-trips.controller';
import { SavedTripsModule } from '../saved-trips/saved-trips.module';

@Module({
  imports: [SavedTripsModule],
  controllers: [SharedTripsController],
})
export class SharedTripsModule {}

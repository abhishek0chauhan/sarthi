import { Module } from '@nestjs/common';
import { SavedTripsController } from './saved-trips.controller';
import { SavedTripsService } from './saved-trips.service';
import { UserService } from './user.service';

@Module({
  controllers: [SavedTripsController],
  providers: [SavedTripsService, UserService],
  exports: [SavedTripsService],
})
export class SavedTripsModule {}

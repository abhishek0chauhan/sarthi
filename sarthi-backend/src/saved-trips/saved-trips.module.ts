import { Module } from '@nestjs/common';
import { SavedTripsController } from './saved-trips.controller';
import { SavedTripsService } from './saved-trips.service';
import { UserService } from './user.service';
import { PhrasebookService } from './phrasebook.service';
import { CorrectionsModule } from '../corrections/corrections.module';

@Module({
  imports: [CorrectionsModule],
  controllers: [SavedTripsController],
  providers: [SavedTripsService, UserService, PhrasebookService],
  exports: [SavedTripsService],
})
export class SavedTripsModule {}

import { Module } from '@nestjs/common';
import { SavedTripsController } from './saved-trips.controller';
import { SavedTripsService } from './saved-trips.service';
import { UserService } from './user.service';
import { PhrasebookService } from './phrasebook.service';
import { TripChatService } from './trip-chat.service';
import { CorrectionsModule } from '../corrections/corrections.module';
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [CorrectionsModule, ProfileModule],
  controllers: [SavedTripsController],
  providers: [SavedTripsService, UserService, PhrasebookService, TripChatService],
  exports: [SavedTripsService],
})
export class SavedTripsModule {}

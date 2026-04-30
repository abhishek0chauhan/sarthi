import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { UsersController } from './users.controller';
import { ProfileService } from './profile.service';
import { AiModule } from '../ai/ai.module';

@Module({
  imports: [AiModule],
  controllers: [ProfileController, UsersController],
  providers: [ProfileService],
  exports: [ProfileService],
})
export class ProfileModule {}

import { Body, Controller, Delete, Get, HttpCode, Post, Put, Req, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { ProfileService } from './profile.service';
import { SubmitStoryDto } from './dto/submit-story.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';

@Controller('profile')
@UseGuards(FirebaseAuthGuard)
export class ProfileController {
  constructor(private readonly service: ProfileService) {}

  @Get()
  async get(@Req() req: any) {
    return this.service.getProfile(req.user.uid);
  }

  @Post('story')
  async story(@Req() req: any, @Body() dto: SubmitStoryDto) {
    return this.service.submitStory(req.user.uid, dto.story);
  }

  @Put('quiz')
  async quiz(@Req() req: any, @Body() dto: SubmitQuizDto) {
    return this.service.submitQuiz(req.user.uid, dto);
  }

  @Get('quiz-prefill')
  async quizPrefill(@Req() req: any) {
    return this.service.getQuizPrefill(req.user.uid);
  }

  @Delete()
  @HttpCode(204)
  async reset(@Req() req: any) {
    await this.service.resetProfile(req.user.uid);
  }
}

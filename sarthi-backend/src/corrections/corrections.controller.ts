import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { CorrectionsService } from './corrections.service';
import { CreateCorrectionDto } from './dto/create-correction.dto';

@Controller('corrections')
@UseGuards(FirebaseAuthGuard)
export class CorrectionsController {
  constructor(private readonly service: CorrectionsService) {}

  @Post()
  async create(@Req() req: any, @Body() dto: CreateCorrectionDto) {
    return this.service.create(req.user.uid, dto);
  }

  @Get()
  async list(@Req() req: any) {
    return this.service.listByUser(req.user.uid);
  }
}

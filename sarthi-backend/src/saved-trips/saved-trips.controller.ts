import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { SavedTripsService } from './saved-trips.service';
import { PhrasebookService } from './phrasebook.service';
import { CreateSavedTripDto } from './dto/create-saved-trip.dto';
import { UpdateSavedTripDto } from './dto/update-saved-trip.dto';

@Controller('saved-trips')
@UseGuards(FirebaseAuthGuard)
export class SavedTripsController {
  constructor(
    private readonly service: SavedTripsService,
    private readonly phrasebookService: PhrasebookService,
  ) {}

  @Post()
  async create(@Body() dto: CreateSavedTripDto, @Req() req: any) {
    return this.service.create(dto, req.user);
  }

  @Get()
  async list(@Req() req: any) {
    return this.service.listByUser(req.user);
  }

  @Get(':id')
  async get(@Param('id') id: string, @Req() req: any) {
    return this.service.getById(id, req.user);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateSavedTripDto, @Req() req: any) {
    return this.service.update(id, dto, req.user);
  }

  @Delete(':id')
  @HttpCode(204)
  async remove(@Param('id') id: string, @Req() req: any) {
    await this.service.remove(id, req.user);
  }

  @Post(':id/share')
  async share(@Param('id') id: string, @Req() req: any) {
    return this.service.enableSharing(id, req.user);
  }

  @Delete(':id/share')
  @HttpCode(204)
  async unshare(@Param('id') id: string, @Req() req: any) {
    await this.service.disableSharing(id, req.user);
  }

  @Post(':id/phrasebook')
  @HttpCode(200)
  async generatePhrasebook(@Param('id') id: string, @Req() req: any) {
    return this.phrasebookService.generateAndStore(id, req.user);
  }

  @Get(':id/phrasebook')
  async getPhrasebook(@Param('id') id: string, @Req() req: any) {
    return this.phrasebookService.getPhrasebook(id, req.user);
  }
}

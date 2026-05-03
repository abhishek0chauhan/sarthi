import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { SavedTripsService } from './saved-trips.service';
import { PhrasebookService } from './phrasebook.service';
import { TripChatService } from './trip-chat.service';
import { EnrichmentService } from './enrichment.service';
import { CreateSavedTripDto } from './dto/create-saved-trip.dto';
import { UpdateSavedTripDto } from './dto/update-saved-trip.dto';
import { AddActivityDto } from './dto/add-activity.dto';
import { ChatMessageDto } from './dto/chat-message.dto';

@Controller('saved-trips')
@UseGuards(FirebaseAuthGuard)
export class SavedTripsController {
  constructor(
    private readonly service: SavedTripsService,
    private readonly phrasebookService: PhrasebookService,
    private readonly chatService: TripChatService,
    private readonly enrichmentService: EnrichmentService,
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

  @Post(':id/enrich')
  @HttpCode(200)
  async enrichTrip(@Param('id') id: string, @Req() req: any) {
    const trip = await this.service.getById(id, req.user);
    if (!trip.itineraryData) {
      throw new BadRequestException('Trip has no itinerary to enrich');
    }
    const enrichedItinerary = await this.enrichmentService.enrichTrip(
      trip.itineraryData as any,
      trip.destination,
      trip.state,
    );
    return this.service.update(id, { itineraryData: enrichedItinerary }, req.user);
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

  @Post(':id/itinerary/day/:day/activity')
  async addActivity(
    @Param('id') id: string,
    @Param('day') day: string,
    @Body() dto: AddActivityDto,
    @Req() req: any,
  ) {
    return this.service.addActivity(id, Number(day), dto, req.user);
  }

  @Delete(':id/itinerary/day/:day/activity/:index')
  @HttpCode(200)
  async removeActivity(
    @Param('id') id: string,
    @Param('day') day: string,
    @Param('index') index: string,
    @Req() req: any,
  ) {
    return this.service.removeActivity(id, Number(day), Number(index), req.user);
  }

  @Put(':id/itinerary/day/:day/activity/:index')
  async swapActivity(
    @Param('id') id: string,
    @Param('day') day: string,
    @Param('index') index: string,
    @Body() dto: AddActivityDto,
    @Req() req: any,
  ) {
    return this.service.swapActivity(id, Number(day), Number(index), dto, req.user);
  }

  @Patch(':id/itinerary/day/:day/reorder')
  async reorderActivities(
    @Param('id') id: string,
    @Param('day') day: string,
    @Body('indices') indices: number[],
    @Req() req: any,
  ) {
    return this.service.reorderActivities(id, Number(day), indices, req.user);
  }

  @Post(':id/itinerary/day/:day/activity/:index/suggest')
  @HttpCode(200)
  async suggestActivityReplacement(
    @Param('id') id: string,
    @Param('day') day: string,
    @Param('index') index: string,
    @Req() req: any,
  ) {
    return this.service.suggestReplacement(id, Number(day), Number(index), req.user);
  }

  @Post(':id/chat')
  @HttpCode(200)
  async sendChatMessage(
    @Param('id') id: string,
    @Body() dto: ChatMessageDto,
    @Req() req: any,
  ) {
    return this.chatService.sendMessage(id, dto.message, req.user);
  }

  @Get(':id/chat')
  async getChatHistory(@Param('id') id: string, @Req() req: any) {
    return this.chatService.getHistory(id, req.user);
  }

  @Delete(':id/chat')
  @HttpCode(204)
  async clearChatHistory(@Param('id') id: string, @Req() req: any) {
    await this.chatService.clearHistory(id, req.user);
  }
}

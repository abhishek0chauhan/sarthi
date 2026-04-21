import { Body, Controller, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { DestinationFinderService } from './destination-finder.service';
import { SearchDestinationsDto } from './dto/search-destinations.dto';
import { ItineraryDto } from './dto/itinerary.dto';
import { FoodGuideDto } from './dto/food-guide.dto';

@Controller('destination-finder')
@UseGuards(FirebaseAuthGuard)
export class DestinationFinderController {
  constructor(private readonly service: DestinationFinderService) {}

  @Post('search')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async search(@Body() dto: SearchDestinationsDto, @Query('bust') bust?: string) {
    return this.service.search(dto, bust === '1');
  }

  @Post('itinerary')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async itinerary(@Body() dto: ItineraryDto, @Query('bust') bust?: string) {
    return this.service.itinerary(dto, bust === '1');
  }

  @Post('food-guide')
  @HttpCode(200)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async foodGuide(@Body() dto: FoodGuideDto, @Query('bust') bust?: string) {
    return this.service.foodGuide(dto, bust === '1');
  }
}

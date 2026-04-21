import { Controller, Get, Param } from '@nestjs/common';
import { SavedTripsService } from '../saved-trips/saved-trips.service';

@Controller('shared-trips')
export class SharedTripsController {
  constructor(private readonly service: SavedTripsService) {}

  @Get(':token')
  async getShared(@Param('token') token: string) {
    return this.service.getShared(token);
  }
}

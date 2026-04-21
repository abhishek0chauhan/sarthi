import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { CacheModule } from './cache/cache.module';
import { AiModule } from './ai/ai.module';
import { DestinationFinderModule } from './destination-finder/destination-finder.module';
import { SavedTripsModule } from './saved-trips/saved-trips.module';
import { SharedTripsModule } from './shared-trips/shared-trips.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 20 }]),
    PrismaModule,
    CacheModule,
    AiModule,
    DestinationFinderModule,
    SavedTripsModule,
    SharedTripsModule,
  ],
})
export class AppModule {}

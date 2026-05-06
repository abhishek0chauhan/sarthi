import { Test, TestingModule } from '@nestjs/testing';
import { DestinationFinderController } from './destination-finder.controller';
import { DestinationFinderService } from './destination-finder.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';
import { ThrottlerGuard } from '@nestjs/throttler';
import { ItineraryDto } from './dto/itinerary.dto';
import { FoodGuideDto } from './dto/food-guide.dto';

const mockService = {
  search: jest.fn(),
  itinerary: jest.fn(),
  foodGuide: jest.fn(),
};

const mockGuard = { canActivate: jest.fn().mockReturnValue(true) };

describe('DestinationFinderController', () => {
  let controller: DestinationFinderController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DestinationFinderController],
      providers: [{ provide: DestinationFinderService, useValue: mockService }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue(mockGuard)
      .overrideGuard(ThrottlerGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<DestinationFinderController>(
      DestinationFinderController,
    );
    mockService.search.mockReset();
    mockService.itinerary.mockReset();
    mockService.foodGuide.mockReset();
  });

  it('calls service.search with the DTO and returns result', async () => {
    const dto = {
      dates: { from: '2025-05-01', to: '2025-05-07' },
      budget: { min: 5000, max: 15000 },
      experienceTypes: ['mountains'],
      departureCity: 'Mumbai',
      group: { size: 4, type: 'friends' },
      freeText: 'offbeat trek',
    };

    const serviceResult = { mode: 'hybrid', results: [{ name: 'Kasol' }] };
    mockService.search.mockResolvedValue(serviceResult);

    const result = await controller.search(dto as any, undefined, undefined);

    expect(mockService.search).toHaveBeenCalledWith(dto, false, undefined);
    expect(result).toEqual(serviceResult);
  });

  it('calls service.itinerary with the DTO and returns result', async () => {
    const dto = {
      destination: 'Goa',
      state: 'Goa',
      dates: { from: '2026-11-15', to: '2026-11-18' },
      budget: { min: 5000, max: 20000 },
      group: { size: 2, type: 'couple' },
      departureCity: 'Mumbai',
      freeText: 'beach vacation',
    };

    const serviceResult = { destination: 'Goa', itinerary: [] };
    mockService.itinerary.mockResolvedValue(serviceResult);

    const result = await controller.itinerary(dto as any);

    expect(mockService.itinerary).toHaveBeenCalledWith(dto, false);
    expect(result).toEqual(serviceResult);
  });

  it('calls service.foodGuide with the DTO and returns result', async () => {
    const dto = {
      destination: 'Jaipur',
      state: 'Rajasthan',
      dates: { from: '2026-11-15', to: '2026-11-18' },
      group: { size: 2, type: 'couple' },
      departureCity: 'Mumbai',
      freeText: 'love spicy food',
      dietType: 'non-veg',
    };

    const serviceResult = { destination: 'Jaipur', mustTryDishes: [] };
    mockService.foodGuide.mockResolvedValue(serviceResult);

    const result = await controller.foodGuide(dto as any);

    expect(mockService.foodGuide).toHaveBeenCalledWith(dto, false);
    expect(result).toEqual(serviceResult);
  });
});

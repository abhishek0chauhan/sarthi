import { DestinationQueryService } from './destination-query.service';
import { PrismaService } from '../prisma/prisma.service';
import { SearchDestinationsDto } from './dto/search-destinations.dto';

function makeDto(
  overrides: Partial<SearchDestinationsDto> = {},
): SearchDestinationsDto {
  return {
    dates: { from: '2025-05-01', to: '2025-05-07' },
    budget: { min: 5000, max: 15000 },
    experienceTypes: ['mountains', 'adventure'],
    departureCity: 'Mumbai',
    group: { size: 4, type: 'friends' },
    freeText: 'offbeat trek',
    ...overrides,
  };
}

describe('DestinationQueryService', () => {
  let service: DestinationQueryService;
  let prismaMock: { destination: { findMany: jest.Mock } };

  beforeEach(() => {
    prismaMock = { destination: { findMany: jest.fn() } };
    service = new DestinationQueryService(
      prismaMock as unknown as PrismaService,
    );
  });

  describe('findShortlist', () => {
    it('calls prisma with correct budget overlap filter', async () => {
      prismaMock.destination.findMany.mockResolvedValue([]);
      await service.findShortlist(makeDto());

      expect(prismaMock.destination.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            budgetMin: { lte: 15000 },
            budgetMax: { gte: 5000 },
          }),
        }),
      );
    });

    it('filters on experienceTypes using hasSome', async () => {
      prismaMock.destination.findMany.mockResolvedValue([]);
      await service.findShortlist(makeDto());

      expect(prismaMock.destination.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            experienceTypes: { hasSome: ['mountains', 'adventure'] },
          }),
        }),
      );
    });

    it('extracts month 5 for a May trip', async () => {
      prismaMock.destination.findMany.mockResolvedValue([]);
      await service.findShortlist(
        makeDto({ dates: { from: '2025-05-01', to: '2025-05-07' } }),
      );

      expect(prismaMock.destination.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            bestMonths: { hasSome: [5] },
          }),
        }),
      );
    });

    it('extracts both months for a cross-month trip', async () => {
      prismaMock.destination.findMany.mockResolvedValue([]);
      await service.findShortlist(
        makeDto({ dates: { from: '2025-04-28', to: '2025-05-03' } }),
      );

      const call = prismaMock.destination.findMany.mock.calls[0][0];
      expect(call.where.bestMonths.hasSome).toEqual(
        expect.arrayContaining([4, 5]),
      );
    });

    it('limits results to 15', async () => {
      prismaMock.destination.findMany.mockResolvedValue([]);
      await service.findShortlist(makeDto());

      expect(prismaMock.destination.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 15 }),
      );
    });

    it('returns the destinations from prisma', async () => {
      const mockDests = [{ id: 'uuid-1', name: 'Kasol' }];
      prismaMock.destination.findMany.mockResolvedValue(mockDests);

      const result = await service.findShortlist(makeDto());
      expect(result).toEqual(mockDests);
    });
  });
});

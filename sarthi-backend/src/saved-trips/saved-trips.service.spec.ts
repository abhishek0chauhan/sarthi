import { SavedTripsService } from './saved-trips.service';
import { UserService } from './user.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

const mockUser = {
  id: 'user-1',
  firebaseUid: 'fb-123',
  displayName: 'Abhishek',
  email: 'a@b.com',
};

const mockItinerary = {
  destination: 'Goa',
  totalEstimate: '₹30k',
  itinerary: [
    {
      day: 1,
      title: 'Arrival',
      activities: [
        {
          time: '10:00 AM',
          activity: 'Check in',
          cost: '₹2000',
          healthNote: '',
        },
        {
          time: '03:00 PM',
          activity: 'Beach walk',
          cost: 'Free',
          healthNote: '',
        },
      ],
      meals: { breakfast: '', lunch: '', dinner: '' },
      healthNote: '',
    },
    {
      day: 2,
      title: 'Explore',
      activities: [
        {
          time: '09:00 AM',
          activity: 'Fort tour',
          cost: '₹50',
          healthNote: '',
        },
      ],
      meals: { breakfast: '', lunch: '', dinner: '' },
      healthNote: '',
    },
  ],
  packingList: [],
};

const mockTrip = {
  id: 'trip-1',
  userId: 'user-1',
  name: 'Goa Trip',
  destination: 'Goa',
  state: 'Goa',
  dates: { from: '2026-11-10', to: '2026-11-14' },
  travelMode: null,
  destinationData: { name: 'Goa' },
  itineraryData: null,
  foodGuideData: null,
  shareToken: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const mockTripWithItinerary = {
  ...mockTrip,
  itineraryData: mockItinerary,
};

let correctionsService: { create: jest.Mock };
let profileService: { getProfile: jest.Mock };
let aiServiceMock: { suggestActivityReplacement: jest.Mock };

describe('SavedTripsService', () => {
  let service: SavedTripsService;
  let prisma: {
    savedTrip: {
      create: jest.Mock;
      findMany: jest.Mock;
      findUnique: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
  };
  let userService: { findOrCreate: jest.Mock };

  beforeEach(() => {
    prisma = {
      savedTrip: {
        create: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };
    userService = { findOrCreate: jest.fn() };
    correctionsService = { create: jest.fn().mockResolvedValue({}) };
    profileService = { getProfile: jest.fn().mockResolvedValue(null) };
    aiServiceMock = {
      suggestActivityReplacement: jest.fn().mockResolvedValue([]),
    };
    service = new SavedTripsService(
      prisma as any,
      userService as any,
      correctionsService as any,
      profileService as any,
      aiServiceMock as any,
    );
  });

  describe('create', () => {
    it('creates a trip with all fields populated', async () => {
      userService.findOrCreate.mockResolvedValue(mockUser);
      prisma.savedTrip.create.mockResolvedValue(mockTrip);

      const dto = {
        destination: 'Goa',
        state: 'Goa',
        dates: { from: '2026-11-10', to: '2026-11-14' },
        destinationData: { name: 'Goa' },
      };

      const result = await service.create(dto as any, {
        uid: 'fb-123',
        name: 'Abhishek',
        email: 'a@b.com',
      });

      expect(userService.findOrCreate).toHaveBeenCalledWith(
        'fb-123',
        'Abhishek',
        'a@b.com',
      );
      expect(prisma.savedTrip.create).toHaveBeenCalledWith({
        data: {
          userId: 'user-1',
          name: 'Goa Trip',
          destination: 'Goa',
          state: 'Goa',
          dates: { from: '2026-11-10', to: '2026-11-14' },
          travelMode: undefined,
          destinationData: { name: 'Goa' },
          itineraryData: undefined,
          foodGuideData: undefined,
        },
      });
      expect(result).toEqual(mockTrip);
    });

    it('uses provided name instead of default', async () => {
      userService.findOrCreate.mockResolvedValue(mockUser);
      prisma.savedTrip.create.mockResolvedValue({
        ...mockTrip,
        name: 'My Custom Trip',
      });

      const dto = {
        name: 'My Custom Trip',
        destination: 'Goa',
        state: 'Goa',
        dates: { from: '2026-11-10', to: '2026-11-14' },
        destinationData: { name: 'Goa' },
      };

      await service.create(dto as any, {
        uid: 'fb-123',
        name: 'Abhishek',
        email: 'a@b.com',
      });

      expect(prisma.savedTrip.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'My Custom Trip' }),
        }),
      );
    });
  });

  describe('listByUser', () => {
    it('returns trips ordered by createdAt desc with summary flags', async () => {
      userService.findOrCreate.mockResolvedValue(mockUser);
      prisma.savedTrip.findMany.mockResolvedValue([
        { ...mockTrip, itineraryData: { day: 1 }, foodGuideData: null },
        {
          ...mockTrip,
          id: 'trip-2',
          itineraryData: null,
          foodGuideData: { overview: 'x' },
        },
      ]);

      const result = await service.listByUser({
        uid: 'fb-123',
        name: 'Abhishek',
        email: 'a@b.com',
      });

      expect(prisma.savedTrip.findMany).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
        orderBy: { createdAt: 'desc' },
      });
      expect(result[0].hasItinerary).toBe(true);
      expect(result[0].hasFoodGuide).toBe(false);
      expect(result[1].hasItinerary).toBe(false);
      expect(result[1].hasFoodGuide).toBe(true);
    });
  });

  describe('getById', () => {
    it('returns full trip for owner', async () => {
      userService.findOrCreate.mockResolvedValue(mockUser);
      prisma.savedTrip.findUnique.mockResolvedValue(mockTrip);

      const result = await service.getById('trip-1', {
        uid: 'fb-123',
        name: 'Abhishek',
        email: 'a@b.com',
      });
      expect(result).toEqual(mockTrip);
    });

    it('throws 404 when trip not found', async () => {
      userService.findOrCreate.mockResolvedValue(mockUser);
      prisma.savedTrip.findUnique.mockResolvedValue(null);

      await expect(
        service.getById('bad-id', {
          uid: 'fb-123',
          name: 'Abhishek',
          email: 'a@b.com',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws 403 when trip belongs to another user', async () => {
      userService.findOrCreate.mockResolvedValue(mockUser);
      prisma.savedTrip.findUnique.mockResolvedValue({
        ...mockTrip,
        userId: 'other-user',
      });

      await expect(
        service.getById('trip-1', {
          uid: 'fb-123',
          name: 'Abhishek',
          email: 'a@b.com',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('update', () => {
    it('updates trip name and travel mode', async () => {
      userService.findOrCreate.mockResolvedValue(mockUser);
      prisma.savedTrip.findUnique.mockResolvedValue(mockTrip);
      prisma.savedTrip.update.mockResolvedValue({
        ...mockTrip,
        name: 'Updated',
        travelMode: 'train',
      });

      const result = await service.update(
        'trip-1',
        { name: 'Updated', travelMode: 'train' } as any,
        { uid: 'fb-123', name: 'Abhishek', email: 'a@b.com' },
      );

      expect(prisma.savedTrip.update).toHaveBeenCalledWith({
        where: { id: 'trip-1' },
        data: { name: 'Updated', travelMode: 'train' },
      });
      expect(result.name).toBe('Updated');
    });

    it('rejects update for non-owner', async () => {
      userService.findOrCreate.mockResolvedValue(mockUser);
      prisma.savedTrip.findUnique.mockResolvedValue({
        ...mockTrip,
        userId: 'other-user',
      });

      await expect(
        service.update('trip-1', { name: 'x' } as any, {
          uid: 'fb-123',
          name: 'Abhishek',
          email: 'a@b.com',
        }),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('delete', () => {
    it('deletes trip for owner', async () => {
      userService.findOrCreate.mockResolvedValue(mockUser);
      prisma.savedTrip.findUnique.mockResolvedValue(mockTrip);
      prisma.savedTrip.delete.mockResolvedValue(mockTrip);

      await service.remove('trip-1', {
        uid: 'fb-123',
        name: 'Abhishek',
        email: 'a@b.com',
      });
      expect(prisma.savedTrip.delete).toHaveBeenCalledWith({
        where: { id: 'trip-1' },
      });
    });
  });

  describe('sharing', () => {
    it('generates share token', async () => {
      userService.findOrCreate.mockResolvedValue(mockUser);
      prisma.savedTrip.findUnique.mockResolvedValue(mockTrip);
      prisma.savedTrip.update.mockResolvedValue({
        ...mockTrip,
        shareToken: 'token-uuid',
      });

      const result = await service.enableSharing('trip-1', {
        uid: 'fb-123',
        name: 'Abhishek',
        email: 'a@b.com',
      });
      expect(result.shareToken).toBe('token-uuid');
      expect(prisma.savedTrip.update).toHaveBeenCalled();
    });

    it('returns existing token if already shared', async () => {
      userService.findOrCreate.mockResolvedValue(mockUser);
      prisma.savedTrip.findUnique.mockResolvedValue({
        ...mockTrip,
        shareToken: 'existing-token',
      });

      const result = await service.enableSharing('trip-1', {
        uid: 'fb-123',
        name: 'Abhishek',
        email: 'a@b.com',
      });
      expect(result.shareToken).toBe('existing-token');
      expect(prisma.savedTrip.update).not.toHaveBeenCalled();
    });

    it('removes share token on disable', async () => {
      userService.findOrCreate.mockResolvedValue(mockUser);
      prisma.savedTrip.findUnique.mockResolvedValue({
        ...mockTrip,
        shareToken: 'token',
      });
      prisma.savedTrip.update.mockResolvedValue({
        ...mockTrip,
        shareToken: null,
      });

      await service.disableSharing('trip-1', {
        uid: 'fb-123',
        name: 'Abhishek',
        email: 'a@b.com',
      });
      expect(prisma.savedTrip.update).toHaveBeenCalledWith({
        where: { id: 'trip-1' },
        data: { shareToken: null },
      });
    });

    it('getShared returns trip with sharer name', async () => {
      prisma.savedTrip.findUnique.mockResolvedValue({
        ...mockTrip,
        shareToken: 'token',
        user: mockUser,
      });

      const result = await service.getShared('token');
      expect(result.sharedBy).toBe('Abhishek');
    });

    it('getShared throws 404 for invalid token', async () => {
      prisma.savedTrip.findUnique.mockResolvedValue(null);

      await expect(service.getShared('bad-token')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('addActivity', () => {
    it('appends activity to end of day by default', async () => {
      userService.findOrCreate.mockResolvedValue(mockUser);
      prisma.savedTrip.findUnique.mockResolvedValue(mockTripWithItinerary);
      prisma.savedTrip.update.mockImplementation(({ data }) =>
        Promise.resolve({
          ...mockTripWithItinerary,
          itineraryData: data.itineraryData,
        }),
      );

      await service.addActivity('trip-1', 1, { activity: 'Sunset cruise' }, {
        uid: 'fb-123',
      } as any);

      const updateCall = prisma.savedTrip.update.mock.calls[0][0];
      const updatedDay = updateCall.data.itineraryData.itinerary[0];
      expect(updatedDay.activities).toHaveLength(3);
      expect(updatedDay.activities[2].activity).toBe('Sunset cruise');
    });

    it('inserts activity at specified position', async () => {
      userService.findOrCreate.mockResolvedValue(mockUser);
      prisma.savedTrip.findUnique.mockResolvedValue(mockTripWithItinerary);
      prisma.savedTrip.update.mockImplementation(({ data }) =>
        Promise.resolve({
          ...mockTripWithItinerary,
          itineraryData: data.itineraryData,
        }),
      );

      await service.addActivity(
        'trip-1',
        1,
        { activity: 'Market visit', position: 0 },
        { uid: 'fb-123' } as any,
      );

      const updateCall = prisma.savedTrip.update.mock.calls[0][0];
      const updatedDay = updateCall.data.itineraryData.itinerary[0];
      expect(updatedDay.activities[0].activity).toBe('Market visit');
    });

    it('throws NotFoundException when itinerary has no such day', async () => {
      userService.findOrCreate.mockResolvedValue(mockUser);
      prisma.savedTrip.findUnique.mockResolvedValue(mockTripWithItinerary);

      await expect(
        service.addActivity('trip-1', 99, { activity: 'anything' }, {
          uid: 'fb-123',
        } as any),
      ).rejects.toThrow('Day 99 not found in itinerary');
    });
  });

  describe('removeActivity', () => {
    it('removes activity at given index', async () => {
      userService.findOrCreate.mockResolvedValue(mockUser);
      prisma.savedTrip.findUnique.mockResolvedValue(mockTripWithItinerary);
      prisma.savedTrip.update.mockImplementation(({ data }) =>
        Promise.resolve({
          ...mockTripWithItinerary,
          itineraryData: data.itineraryData,
        }),
      );

      await service.removeActivity('trip-1', 1, 0, { uid: 'fb-123' } as any);

      const updateCall = prisma.savedTrip.update.mock.calls[0][0];
      const updatedDay = updateCall.data.itineraryData.itinerary[0];
      expect(updatedDay.activities).toHaveLength(1);
      expect(updatedDay.activities[0].activity).toBe('Beach walk');
    });

    it('throws BadRequestException for out-of-range index', async () => {
      userService.findOrCreate.mockResolvedValue(mockUser);
      prisma.savedTrip.findUnique.mockResolvedValue(mockTripWithItinerary);

      await expect(
        service.removeActivity('trip-1', 1, 99, { uid: 'fb-123' } as any),
      ).rejects.toThrow();
    });
  });

  describe('swapActivity', () => {
    it('replaces activity at index', async () => {
      userService.findOrCreate.mockResolvedValue(mockUser);
      prisma.savedTrip.findUnique.mockResolvedValue(mockTripWithItinerary);
      prisma.savedTrip.update.mockImplementation(({ data }) =>
        Promise.resolve({
          ...mockTripWithItinerary,
          itineraryData: data.itineraryData,
        }),
      );

      await service.swapActivity('trip-1', 1, 0, { activity: 'Yoga session' }, {
        uid: 'fb-123',
      } as any);

      const updateCall = prisma.savedTrip.update.mock.calls[0][0];
      const updatedDay = updateCall.data.itineraryData.itinerary[0];
      expect(updatedDay.activities[0].activity).toBe('Yoga session');
    });
  });

  describe('reorderActivities', () => {
    it('reorders activities by new index array', async () => {
      userService.findOrCreate.mockResolvedValue(mockUser);
      prisma.savedTrip.findUnique.mockResolvedValue(mockTripWithItinerary);
      prisma.savedTrip.update.mockImplementation(({ data }) =>
        Promise.resolve({
          ...mockTripWithItinerary,
          itineraryData: data.itineraryData,
        }),
      );

      await service.reorderActivities('trip-1', 1, [1, 0], {
        uid: 'fb-123',
      } as any);

      const updateCall = prisma.savedTrip.update.mock.calls[0][0];
      const updatedDay = updateCall.data.itineraryData.itinerary[0];
      expect(updatedDay.activities[0].activity).toBe('Beach walk');
      expect(updatedDay.activities[1].activity).toBe('Check in');
    });
  });

  describe('suggestReplacement', () => {
    it('calls AI with trip context and returns suggestions', async () => {
      userService.findOrCreate.mockResolvedValue(mockUser);
      prisma.savedTrip.findUnique.mockResolvedValue(mockTripWithItinerary);
      aiServiceMock.suggestActivityReplacement.mockResolvedValue([
        { activity: 'Dudhsagar Falls' },
      ]);

      const result = await service.suggestReplacement('trip-1', 1, 0, {
        uid: 'fb-123',
      } as any);

      expect(aiServiceMock.suggestActivityReplacement).toHaveBeenCalledWith(
        expect.objectContaining({ destination: 'Goa', day: 1 }),
      );
      expect(result[0].activity).toBe('Dudhsagar Falls');
    });
  });
});

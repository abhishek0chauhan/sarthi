import { UserService } from './user.service';

describe('UserService', () => {
  let service: UserService;
  let prisma: { user: { upsert: jest.Mock } };

  beforeEach(() => {
    prisma = { user: { upsert: jest.fn() } };
    service = new UserService(prisma as any);
  });

  it('creates a new user when firebaseUid not found', async () => {
    const mockUser = { id: 'uuid-1', firebaseUid: 'fb-123', displayName: 'Abhishek', email: 'a@b.com' };
    prisma.user.upsert.mockResolvedValue(mockUser);

    const result = await service.findOrCreate('fb-123', 'Abhishek', 'a@b.com');

    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { firebaseUid: 'fb-123' },
      update: { displayName: 'Abhishek', email: 'a@b.com' },
      create: { firebaseUid: 'fb-123', displayName: 'Abhishek', email: 'a@b.com' },
    });
    expect(result).toEqual(mockUser);
  });

  it('returns existing user and updates profile on match', async () => {
    const existing = { id: 'uuid-1', firebaseUid: 'fb-123', displayName: 'Updated', email: 'new@b.com' };
    prisma.user.upsert.mockResolvedValue(existing);

    const result = await service.findOrCreate('fb-123', 'Updated', 'new@b.com');
    expect(result.displayName).toBe('Updated');
  });

  it('handles missing displayName and email', async () => {
    const mockUser = { id: 'uuid-1', firebaseUid: 'fb-123', displayName: undefined, email: undefined };
    prisma.user.upsert.mockResolvedValue(mockUser);

    const result = await service.findOrCreate('fb-123');

    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { firebaseUid: 'fb-123' },
      update: { displayName: undefined, email: undefined },
      create: { firebaseUid: 'fb-123', displayName: undefined, email: undefined },
    });
    expect(result).toEqual(mockUser);
  });
});

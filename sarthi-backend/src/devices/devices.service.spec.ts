import { Test } from '@nestjs/testing';
import { DevicesService } from './devices.service';
import { PrismaService } from '../prisma/prisma.service';

const mockPrisma = {
  user: { upsert: jest.fn() },
  userDevice: { upsert: jest.fn(), findMany: jest.fn(), deleteMany: jest.fn() },
};

describe('DevicesService', () => {
  let service: DevicesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [DevicesService, { provide: PrismaService, useValue: mockPrisma }],
    }).compile();
    service = module.get(DevicesService);
  });

  it('register: upserts device under user', async () => {
    mockPrisma.user.upsert.mockResolvedValue({ id: 'db-uid' });
    mockPrisma.userDevice.upsert.mockResolvedValue({ fcmToken: 'tok', platform: 'android' });
    await service.register('fb-uid', { fcmToken: 'tok', platform: 'android' });
    expect(mockPrisma.userDevice.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { fcmToken: 'tok' } }),
    );
  });

  it('unregister: deletes device belonging to user', async () => {
    mockPrisma.user.upsert.mockResolvedValue({ id: 'db-uid' });
    mockPrisma.userDevice.deleteMany.mockResolvedValue({ count: 1 });
    await service.unregister('fb-uid', 'tok');
    expect(mockPrisma.userDevice.deleteMany).toHaveBeenCalledWith({
      where: { fcmToken: 'tok', userId: 'db-uid' },
    });
  });

  it('getTokensForUser: returns array of tokens', async () => {
    mockPrisma.userDevice.findMany.mockResolvedValue([{ fcmToken: 'a' }, { fcmToken: 'b' }]);
    const tokens = await service.getTokensForUser('db-uid');
    expect(tokens).toEqual(['a', 'b']);
  });
})
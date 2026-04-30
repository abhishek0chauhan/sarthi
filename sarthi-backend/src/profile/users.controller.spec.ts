import { Test } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { ProfileService } from './profile.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';

const mockService = { updateNotificationPrefs: jest.fn() };

describe('UsersController', () => {
  let controller: UsersController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [{ provide: ProfileService, useValue: mockService }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(UsersController);
  });

  it('PATCH /users/me/notification-prefs calls service', async () => {
    mockService.updateNotificationPrefs.mockResolvedValue({ notificationPrefs: { morningBriefing: false } });
    const result = await controller.updatePrefs({ morningBriefing: false }, { user: { uid: 'fb' } } as any);
    expect(mockService.updateNotificationPrefs).toHaveBeenCalledWith('fb', { morningBriefing: false });
    expect(result).toBeDefined();
  });
})

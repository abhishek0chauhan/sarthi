import { Test } from '@nestjs/testing';
import { DevicesController } from './devices.controller';
import { DevicesService } from './devices.service';
import { FirebaseAuthGuard } from '../auth/firebase-auth.guard';

const mockService = { register: jest.fn(), unregister: jest.fn() };

describe('DevicesController', () => {
  let controller: DevicesController;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      controllers: [DevicesController],
      providers: [{ provide: DevicesService, useValue: mockService }],
    })
      .overrideGuard(FirebaseAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    controller = module.get(DevicesController);
  });

  it('POST /devices calls service.register', async () => {
    mockService.register.mockResolvedValue({ fcmToken: 'tok' });
    const result = await controller.register({ fcmToken: 'tok', platform: 'android' }, { user: { uid: 'fb-uid' } } as any);
    expect(mockService.register).toHaveBeenCalledWith('fb-uid', { fcmToken: 'tok', platform: 'android' });
    expect(result).toEqual({ fcmToken: 'tok' });
  });

  it('DELETE /devices/:fcmToken calls service.unregister', async () => {
    mockService.unregister.mockResolvedValue(undefined);
    await controller.unregister('tok', { user: { uid: 'fb-uid' } } as any);
    expect(mockService.unregister).toHaveBeenCalledWith('fb-uid', 'tok');
  });
})

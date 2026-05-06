import { Test } from '@nestjs/testing';
import { CorrectionsController } from './corrections.controller';
import { CorrectionsService } from './corrections.service';

const mockService = {
  create: jest.fn(),
  listByUser: jest.fn(),
};

const req = { user: { uid: 'fb-1' } };

describe('CorrectionsController', () => {
  let controller: CorrectionsController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [CorrectionsController],
      providers: [{ provide: CorrectionsService, useValue: mockService }],
    }).compile();
    controller = module.get(CorrectionsController);
    jest.clearAllMocks();
  });

  it('POST /corrections calls service.create', async () => {
    mockService.create.mockResolvedValue({ id: 'c-1' });
    const dto = {
      tripId: 't-1',
      type: 'thumbs_down',
      context: { place: 'Elephant Falls' },
    };
    const result = await controller.create(req, dto as any);
    expect(mockService.create).toHaveBeenCalledWith('fb-1', dto);
  });

  it('GET /corrections calls service.listByUser', async () => {
    mockService.listByUser.mockResolvedValue([]);
    await controller.list(req);
    expect(mockService.listByUser).toHaveBeenCalledWith('fb-1');
  });
});

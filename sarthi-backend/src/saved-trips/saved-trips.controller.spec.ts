import { SavedTripsController } from './saved-trips.controller';

const mockService = {
  create: jest.fn(),
  listByUser: jest.fn(),
  getById: jest.fn(),
  update: jest.fn(),
  remove: jest.fn(),
  enableSharing: jest.fn(),
  disableSharing: jest.fn(),
};

const mockRequest = {
  user: { uid: 'fb-123', name: 'Abhishek', email: 'a@b.com' },
};

describe('SavedTripsController', () => {
  let controller: SavedTripsController;

  beforeEach(() => {
    controller = new SavedTripsController(mockService as any);
    Object.values(mockService).forEach(fn => fn.mockReset());
  });

  it('create calls service.create with dto and user', async () => {
    const dto = { destination: 'Goa', state: 'Goa', dates: { from: '2026-11-10', to: '2026-11-14' }, destinationData: {} };
    mockService.create.mockResolvedValue({ id: 'trip-1' });

    const result = await controller.create(dto as any, mockRequest as any);

    expect(mockService.create).toHaveBeenCalledWith(dto, mockRequest.user);
    expect(result).toEqual({ id: 'trip-1' });
  });

  it('list calls service.listByUser', async () => {
    mockService.listByUser.mockResolvedValue([]);
    const result = await controller.list(mockRequest as any);
    expect(mockService.listByUser).toHaveBeenCalledWith(mockRequest.user);
    expect(result).toEqual([]);
  });

  it('get calls service.getById', async () => {
    mockService.getById.mockResolvedValue({ id: 'trip-1' });
    const result = await controller.get('trip-1', mockRequest as any);
    expect(mockService.getById).toHaveBeenCalledWith('trip-1', mockRequest.user);
    expect(result).toEqual({ id: 'trip-1' });
  });

  it('update calls service.update', async () => {
    mockService.update.mockResolvedValue({ id: 'trip-1', name: 'Updated' });
    const result = await controller.update('trip-1', { name: 'Updated' } as any, mockRequest as any);
    expect(mockService.update).toHaveBeenCalledWith('trip-1', { name: 'Updated' }, mockRequest.user);
    expect(result).toEqual({ id: 'trip-1', name: 'Updated' });
  });

  it('delete calls service.remove', async () => {
    mockService.remove.mockResolvedValue(undefined);
    await controller.remove('trip-1', mockRequest as any);
    expect(mockService.remove).toHaveBeenCalledWith('trip-1', mockRequest.user);
  });

  it('share calls service.enableSharing', async () => {
    mockService.enableSharing.mockResolvedValue({ shareToken: 'abc', url: '/shared-trips/abc' });
    const result = await controller.share('trip-1', mockRequest as any);
    expect(mockService.enableSharing).toHaveBeenCalledWith('trip-1', mockRequest.user);
    expect(result).toEqual({ shareToken: 'abc', url: '/shared-trips/abc' });
  });

  it('unshare calls service.disableSharing', async () => {
    mockService.disableSharing.mockResolvedValue(undefined);
    await controller.unshare('trip-1', mockRequest as any);
    expect(mockService.disableSharing).toHaveBeenCalledWith('trip-1', mockRequest.user);
  });
});

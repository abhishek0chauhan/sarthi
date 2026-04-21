import { SharedTripsController } from './shared-trips.controller';

const mockService = {
  getShared: jest.fn(),
};

describe('SharedTripsController', () => {
  let controller: SharedTripsController;

  beforeEach(() => {
    controller = new SharedTripsController(mockService as any);
    mockService.getShared.mockReset();
  });

  it('getShared calls service.getShared with token', async () => {
    const tripData = { id: 'trip-1', destination: 'Goa', sharedBy: 'Abhishek' };
    mockService.getShared.mockResolvedValue(tripData);

    const result = await controller.getShared('abc-token');

    expect(mockService.getShared).toHaveBeenCalledWith('abc-token');
    expect(result).toEqual(tripData);
  });
});

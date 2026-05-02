jest.mock('socket.io-client');
jest.mock('@/config/api');

import { socketService } from '@/services/socket.service';
import { mockSocket, io } from '../../__mocks__/socket.io-client';

const mockIo = io as jest.MockedFunction<typeof io>;

beforeEach(() => {
  jest.clearAllMocks();
  mockSocket.connected = false;
  socketService.disconnect();
});

describe('socketService', () => {
  it('connect calls io with correct url and auth token', () => {
    socketService.connect('test-token');
    expect(mockIo).toHaveBeenCalledWith('http://test:3000', {
      auth: { token: 'test-token' },
      transports: ['websocket'],
    });
  });

  it('connect does not reconnect if already connected', () => {
    mockSocket.connected = true;
    socketService.connect('token-1');
    socketService.connect('token-2');
    expect(mockIo).toHaveBeenCalledTimes(1);
  });

  it('emit calls socket.emit', () => {
    socketService.connect('token');
    socketService.emit('activate_guide', { tripId: 'trip-1' });
    expect(mockSocket.emit).toHaveBeenCalledWith('activate_guide', { tripId: 'trip-1' });
  });

  it('on registers event listener', () => {
    socketService.connect('token');
    const cb = jest.fn();
    socketService.on('guide_activated', cb);
    expect(mockSocket.on).toHaveBeenCalledWith('guide_activated', cb);
  });

  it('off removes event listener', () => {
    socketService.connect('token');
    socketService.off('guide_activated');
    expect(mockSocket.off).toHaveBeenCalledWith('guide_activated');
  });

  it('disconnect calls socket.disconnect', () => {
    socketService.connect('token');
    socketService.disconnect();
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it('isConnected returns socket.connected', () => {
    socketService.connect('token');
    mockSocket.connected = true;
    expect(socketService.isConnected()).toBe(true);
    mockSocket.connected = false;
    expect(socketService.isConnected()).toBe(false);
  });
});

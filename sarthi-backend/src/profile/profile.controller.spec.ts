import { Test } from '@nestjs/testing';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';

const mockService = {
  getProfile: jest.fn(),
  submitStory: jest.fn(),
  submitQuiz: jest.fn(),
  getQuizPrefill: jest.fn(),
  resetProfile: jest.fn(),
};

const req = { user: { uid: 'fb-1' } };

describe('ProfileController', () => {
  let controller: ProfileController;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      controllers: [ProfileController],
      providers: [{ provide: ProfileService, useValue: mockService }],
    }).compile();
    controller = module.get(ProfileController);
    jest.clearAllMocks();
  });

  it('GET /profile calls service.getProfile', async () => {
    mockService.getProfile.mockResolvedValue({ id: 'p-1' });
    const result = await controller.get(req);
    expect(mockService.getProfile).toHaveBeenCalledWith('fb-1');
    expect(result).toEqual({ id: 'p-1' });
  });

  it('POST /profile/story calls service.submitStory', async () => {
    mockService.submitStory.mockResolvedValue({
      id: 'p-1',
      travelPace: 'loose',
    });
    const result = await controller.story(req, { story: 'I loved Spiti...' });
    expect(mockService.submitStory).toHaveBeenCalledWith(
      'fb-1',
      'I loved Spiti...',
    );
    expect(result).toHaveProperty('travelPace', 'loose');
  });

  it('PUT /profile/quiz calls service.submitQuiz', async () => {
    mockService.submitQuiz.mockResolvedValue({
      id: 'p-1',
      travelPace: 'packed',
    });
    const result = await controller.quiz(req, { travelPace: 'packed' });
    expect(mockService.submitQuiz).toHaveBeenCalledWith('fb-1', {
      travelPace: 'packed',
    });
    expect(result).toHaveProperty('travelPace', 'packed');
  });

  it('GET /profile/quiz-prefill calls service.getQuizPrefill', async () => {
    mockService.getQuizPrefill.mockResolvedValue({ id: 'p-1' });
    const result = await controller.quizPrefill(req);
    expect(mockService.getQuizPrefill).toHaveBeenCalledWith('fb-1');
  });

  it('DELETE /profile calls service.resetProfile', async () => {
    await controller.reset(req);
    expect(mockService.resetProfile).toHaveBeenCalledWith('fb-1');
  });
});

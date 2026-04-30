import { Test } from '@nestjs/testing';
import { SchedulerService } from './scheduler.service';
import { LiveGuideService } from './live-guide.service';
import { SessionService } from './session.service';

const mockLiveGuideService = { sendMorningBriefing: jest.fn(), sendMealNudge: jest.fn() };
const mockSessionService = { getAllActiveSessions: jest.fn() };

describe('SchedulerService', () => {
  let service: SchedulerService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [
        SchedulerService,
        { provide: LiveGuideService, useValue: mockLiveGuideService },
        { provide: SessionService, useValue: mockSessionService },
      ],
    }).compile();
    service = module.get(SchedulerService);
  });

  it('tick: calls sendMorningBriefing when IST hour is 7 and briefing not sent today', async () => {
    const session = {
      id: 'sess-1',
      lastBriefingAt: null,
      lastBreakfastAt: null, lastLunchAt: null, lastDinnerAt: null,
    };
    mockSessionService.getAllActiveSessions.mockResolvedValue([session]);
    mockLiveGuideService.sendMorningBriefing.mockResolvedValue(undefined);

    await service.tick(7, 30);
    expect(mockLiveGuideService.sendMorningBriefing).toHaveBeenCalledWith(session);
  });

  it('tick: skips morning briefing if already sent today', async () => {
    const today = new Date().toISOString().split('T')[0];
    const session = {
      id: 'sess-1',
      lastBriefingAt: new Date(`${today}T02:00:00Z`),
      lastBreakfastAt: null, lastLunchAt: null, lastDinnerAt: null,
    };
    mockSessionService.getAllActiveSessions.mockResolvedValue([session]);

    await service.tick(7, 30);
    expect(mockLiveGuideService.sendMorningBriefing).not.toHaveBeenCalled();
  });

  it('tick: sends lunch nudge at 13:00 IST', async () => {
    const session = {
      id: 'sess-1',
      lastBriefingAt: new Date(),
      lastBreakfastAt: null, lastLunchAt: null, lastDinnerAt: null,
    };
    mockSessionService.getAllActiveSessions.mockResolvedValue([session]);
    mockLiveGuideService.sendMealNudge.mockResolvedValue(undefined);

    await service.tick(13, 0);
    expect(mockLiveGuideService.sendMealNudge).toHaveBeenCalledWith(session, 'lunch');
  });

  it('tick: does nothing outside trigger windows', async () => {
    const session = { id: 'sess-1', lastBriefingAt: null, lastBreakfastAt: null, lastLunchAt: null, lastDinnerAt: null };
    mockSessionService.getAllActiveSessions.mockResolvedValue([session]);

    await service.tick(10, 0);
    expect(mockLiveGuideService.sendMorningBriefing).not.toHaveBeenCalled();
    expect(mockLiveGuideService.sendMealNudge).not.toHaveBeenCalled();
  });
})

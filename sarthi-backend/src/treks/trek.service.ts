import { Injectable } from '@nestjs/common';
import { Trek } from './trek.interface';
import treksData from './treks.json';

const TREK_INTENT_EXPERIENCE_TYPES = new Set([
  'trekking', 'trek', 'hiking', 'hike', 'mountaineering',
]);

const TREK_INTENT_KEYWORDS = /\b(trek|treks|trekking|hike|hiking|summit|mountaineering|base\s*camp|high\s*altitude)\b/i;

export interface TrekFilter {
  month?: number;
  maxDays?: number;
  difficulties?: Trek['difficulty'][];
  state?: string;
}

export interface SearchTrekFilter {
  dates: { from: string; to: string };
  age?: number;
  medicalConditions?: string[];
}

@Injectable()
export class TrekService {
  private readonly treks: Trek[] = treksData as Trek[];

  getAll(): Trek[] {
    return this.treks;
  }

  isTrekkingIntent(experienceTypes: string[], freeText: string): boolean {
    const hasTypeMatch = experienceTypes.some(t => TREK_INTENT_EXPERIENCE_TYPES.has(t.toLowerCase()));
    if (hasTypeMatch) return true;
    return TREK_INTENT_KEYWORDS.test(freeText);
  }

  filterTreks(filter: TrekFilter): Trek[] {
    let result = this.treks;

    if (filter.month !== undefined) {
      result = result.filter(t => t.bestMonths.includes(filter.month!));
    }

    if (filter.maxDays !== undefined) {
      result = result.filter(t => t.durationDays <= filter.maxDays!);
    }

    if (filter.difficulties?.length) {
      result = result.filter(t => filter.difficulties!.includes(t.difficulty));
    }

    if (filter.state) {
      result = result.filter(t => t.state === filter.state);
    }

    return result;
  }

  filterForSearch(filter: SearchTrekFilter): Trek[] {
    const from = new Date(filter.dates.from);
    const to = new Date(filter.dates.to);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new Error('TrekService.filterForSearch: invalid date range');
    }
    const travelMonth = from.getMonth() + 1;
    const tripDays = Math.ceil(
      (to.getTime() - from.getTime()) / 86400000,
    ) + 1;

    const needsEasier = (filter.age && filter.age >= 55) ||
      (filter.medicalConditions && filter.medicalConditions.length > 0);

    const difficulties: Trek['difficulty'][] | undefined = needsEasier
      ? ['easy', 'easy_to_moderate', 'moderate']
      : undefined;

    const filtered = this.filterTreks({
      month: travelMonth,
      maxDays: tripDays,
      difficulties,
    });

    return filtered.slice(0, 20);
  }
}

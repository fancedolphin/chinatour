import { describe, expect, it, vi } from 'vitest';

import type { PlanningIntent, StructuredItinerary } from '@/services/planning/dataContracts';
import { weatherReplanningService } from '@/services/planning/weatherReplanningService';
import { ragService } from '@/services/planning/ragService';

describe('weatherReplanningService', () => {
  it('replans a day with indoor-only candidates and introduces new RAG results', async () => {
    const retrieveIndoorCandidates = vi
      .spyOn(ragService, 'retrieveIndoorCandidates')
      .mockResolvedValue([
        {
          id: 'indoor-1',
          name: '中国考古博物馆',
          description: '全天室内馆藏路线',
          slot: 'core_attractions',
          source: 'rag',
          confidence: 0.92,
          indoorOutdoor: 'indoor',
        },
        {
          id: 'indoor-2',
          name: '中国工艺美术馆',
          description: '室内工艺主题展览',
          slot: 'core_attractions',
          source: 'rag',
          confidence: 0.88,
          indoorOutdoor: 'indoor',
        },
      ]);
    const retrieveOptionalSlots = vi
      .spyOn(ragService, 'retrieveOptionalSlots')
      .mockResolvedValue({
        cultural_experiences: {
          satisfied: true,
          items: [
            {
              id: 'culture-1',
              name: '茶道体验',
              description: '室内文化体验',
              slot: 'cultural_experiences',
              source: 'rag',
              confidence: 0.81,
              indoorOutdoor: 'indoor',
            },
          ],
        },
        food: { satisfied: false, items: [] },
      });
    const fetchBookingTipsForDestination = vi
      .spyOn(ragService, 'fetchBookingTipsForDestination')
      .mockResolvedValue([{ id: 'tip-1', title: '预约提醒', content: '博物馆建议预约' }]);

    const itinerary: StructuredItinerary = {
      destination: '北京',
      dates: '2026年4月1日 - 4月3日',
      budget: '约¥3000',
      days: [
        {
          day: 1,
          theme: '户外历史线',
          activities: [
            {
              time: '09:00',
              name: '天坛公园',
              description: '户外参观',
              type: 'attraction',
              source: 'rag',
              confidence: 0.9,
              indoorOutdoor: 'outdoor',
            },
            {
              time: '14:00',
              name: '景山公园',
              description: '继续户外步行',
              type: 'attraction',
              source: 'rag',
              confidence: 0.82,
              indoorOutdoor: 'outdoor',
            },
          ],
          meals: {},
        },
      ],
      unknowns: [],
    };

    const intent: PlanningIntent = {
      rawQuery: '北京1天，下雨也能玩的室内历史文化路线',
      destination: '北京',
      durationDays: 1,
      travelStyle: 'relaxed',
      interestTags: ['history', 'art'],
      includeIndustrial: false,
      contractVersion: '1.1',
    };

    const replanned = await weatherReplanningService.replanDayForBadWeather({
      day: 1,
      itinerary,
      intent,
    });

    expect(retrieveIndoorCandidates).toHaveBeenCalledTimes(1);
    expect(
      replanned.dayPlan.activities
        .filter((activity) => activity.type === 'attraction')
        .every((activity) => ['indoor', 'both'].includes(activity.indoorOutdoor ?? 'outdoor')),
    ).toBe(true);
    expect(
      replanned.dayPlan.activities.some(
        (activity) =>
          activity.type === 'attraction' &&
          !itinerary.days[0].activities.some((existing) => existing.name === activity.name),
      ),
    ).toBe(true);
    expect(replanned.bookingTips.length).toBeGreaterThanOrEqual(0);

    retrieveIndoorCandidates.mockRestore();
    retrieveOptionalSlots.mockRestore();
    fetchBookingTipsForDestination.mockRestore();
  });
});

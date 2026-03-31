import type { BookingTip, DayPlan, PlaceCandidate, PlanningIntent, StructuredItinerary, SlotResult } from './contracts';
import { plannerService } from './plannerService';
import { ragService } from './ragService';

type WeatherReplanContext = {
  dayPlan: DayPlan;
  bookingTips: BookingTip[];
  slots: {
    core_attractions: SlotResult;
    cultural_experiences: SlotResult;
  };
};

class WeatherReplanningService {
  async replanDayForBadWeather(input: {
    day: number;
    itinerary: StructuredItinerary;
    intent: PlanningIntent;
  }): Promise<WeatherReplanContext> {
    const indoorCandidates = await ragService.retrieveIndoorCandidates(
      input.intent,
      `weather_replan_day_${input.day}`,
    );
    const optionalSlots = await ragService.retrieveOptionalSlots(
      input.intent,
      ['cultural_experiences', 'food'],
      `weather_replan_context_${input.day}`,
    );
    const bookingTips = await ragService.fetchBookingTipsForDestination(input.intent.destination);
    const culturalCandidates: PlaceCandidate[] = optionalSlots.cultural_experiences?.items ?? [];
    const foodCandidates: PlaceCandidate[] = optionalSlots.food?.items ?? [];

    const dayPlan = plannerService.replanDayForBadWeather({
      itinerary: input.itinerary,
      day: input.day,
      indoorCandidates,
      culturalCandidates,
      foodCandidates,
      bookingTips,
    });

    return {
      dayPlan,
      bookingTips,
      slots: {
        core_attractions: {
          satisfied: indoorCandidates.length > 0,
          items: indoorCandidates,
        },
        cultural_experiences: {
          satisfied: culturalCandidates.length > 0,
          items: culturalCandidates,
        },
      },
    };
  }
}

export const weatherReplanningService = new WeatherReplanningService();

export type SourceType = 'rag' | 'amap' | 'rag+amap' | 'llm';

export type SlotName = 'core_attractions' | 'food';

export type TravelStyle = 'relaxed' | 'balanced' | 'aggressive';

export interface PlanningIntent {
  rawQuery: string;
  destination: string;
  durationDays: number;
  travelStyle: TravelStyle;
  interestTags: string[];
  cuisinePreference?: string;
}

export interface PlaceLocation {
  lat: number;
  lng: number;
  address?: string;
}

export interface PlaceCandidate {
  id: string;
  name: string;
  description: string;
  slot: SlotName;
  source: SourceType;
  confidence: number;
  location?: PlaceLocation;
  price?: string;
  ticketPrice?: string;
  recommendedDuration?: string;
  tags?: string[];
}

export interface SlotResult {
  items: PlaceCandidate[];
  satisfied: boolean;
}

export interface BookingTip {
  id: string;
  title: string;
  content: string;
  category?: string | null;
}

export interface RagRetrievalResult {
  slots: Record<SlotName, SlotResult>;
  unsatisfiedSlots: SlotName[];
  bookingTips: BookingTip[];
  stageTimings: {
    embedding: number;
    rag_retrieve: number;
  };
}

export interface PlannedActivity {
  time: string;
  name: string;
  description: string;
  type: 'attraction' | 'transport' | 'rest';
  source: SourceType;
  confidence: number;
  location?: PlaceLocation;
}

export interface DayPlan {
  day: number;
  theme: string;
  activities: PlannedActivity[];
  meals: {
    breakfast?: string;
    lunch?: string;
    dinner?: string;
  };
  alternativePlan?: string;
}

export interface StructuredItinerary {
  destination: string;
  dates: string;
  budget: string;
  days: DayPlan[];
  unknowns: string[];
}

export interface ValidationWarning {
  rule: 'daily_overload' | 'geographic_conflict' | 'booking_constraint';
  day: number;
  severity: 'warning';
  message: string;
}

export interface ValidationResult {
  can_generate: boolean;
  warnings: ValidationWarning[];
}

export interface FallbackResult {
  slots: Record<SlotName, SlotResult>;
  fallbackTriggered: boolean;
  amapCalls: number;
}

export interface TripPlanningResponse {
  requestId: string;
  text: string;
  tripPlan: StructuredItinerary;
  validation: ValidationResult;
  diagnostics: {
    unsatisfiedSlots: SlotName[];
    amapCalls: number;
    stageTimings: {
      embedding: number;
      rag_retrieve: number;
      amap_fallback: number;
      planner: number;
      validator: number;
      total: number;
    };
  };
}

import { z } from 'zod';

export const CONTRACT_VERSION = '1.1' as const;

export const sourceTypeSchema = z.enum(['rag', 'amap', 'rag+amap', 'llm']);
export type SourceType = z.infer<typeof sourceTypeSchema>;

export const slotNameSchema = z.enum([
  'core_attractions',
  'food',
  'industrial_tourism',
  'booking_constraints',
  'cultural_experiences',
  'events',
  'markets',
]);
export type SlotName = z.infer<typeof slotNameSchema>;

export const travelStyleSchema = z.enum(['relaxed', 'moderate', 'packed']);
export type TravelStyle = z.infer<typeof travelStyleSchema>;

export const groupTypeSchema = z.enum(['solo', 'couple', 'family', 'group']);
export type GroupType = z.infer<typeof groupTypeSchema>;

export const indoorOutdoorSchema = z.enum(['indoor', 'outdoor', 'both']);
export type IndoorOutdoor = z.infer<typeof indoorOutdoorSchema>;

export const signatureItemSchema = z.object({
  name: z.string().min(1),
  nameEn: z.string().optional(),
  priceRmb: z.number().nullable().optional(),
  bargainTip: z.string().nullable().optional(),
  note: z.string().nullable().optional(),
});
export type SignatureItem = z.infer<typeof signatureItemSchema>;

export const planningIntentSchema = z.object({
  rawQuery: z.string().min(1),
  destination: z.string().min(1),
  durationDays: z.number().int().min(1).max(14),
  travelStyle: travelStyleSchema,
  interestTags: z.array(z.string()).default([]),
  cuisinePreference: z.string().optional(),
  includeIndustrial: z.boolean().default(false),
  groupType: groupTypeSchema.optional(),
  travelMonth: z.number().int().min(1).max(12).optional(),
  contractVersion: z.literal(CONTRACT_VERSION).default(CONTRACT_VERSION),
});
export type PlanningIntent = z.infer<typeof planningIntentSchema>;

export const placeLocationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  address: z.string().optional(),
});
export type PlaceLocation = z.infer<typeof placeLocationSchema>;

export const foreignerFriendlyFeatureSchema = z.object({
  type: z.string().min(1),
  note: z.string().optional(),
});
export type ForeignerFriendlyFeature = z.infer<typeof foreignerFriendlyFeatureSchema>;

export const placeCandidateSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  nameEn: z.string().optional(),
  description: z.string().min(1),
  slot: slotNameSchema,
  source: sourceTypeSchema,
  confidence: z.number().min(0).max(1),
  location: placeLocationSchema.optional(),
  category: z.string().optional(),
  price: z.string().optional(),
  priceRange: z.string().optional(),
  ticketPrice: z.string().optional(),
  recommendedDuration: z.string().optional(),
  indoorOutdoor: indoorOutdoorSchema.optional(),
  reservationNotes: z.string().optional(),
  crowdLevel: z.string().optional(),
  physicalIntensity: z.string().optional(),
  monthStart: z.number().int().min(1).max(12).optional(),
  monthEnd: z.number().int().min(1).max(12).optional(),
  operatingHours: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  suitableFor: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
  signatureItems: z.array(signatureItemSchema).optional(),
  allergens: z.array(z.string()).optional(),
  foreignerFriendlyFeatures: z.array(foreignerFriendlyFeatureSchema).optional(),
});
export type PlaceCandidate = z.infer<typeof placeCandidateSchema>;

export const slotResultSchema = z.object({
  items: z.array(placeCandidateSchema),
  satisfied: z.boolean(),
});
export type SlotResult = z.infer<typeof slotResultSchema>;

export const ragSlotMapSchema = z.object({
  core_attractions: slotResultSchema.optional(),
  food: slotResultSchema.optional(),
  industrial_tourism: slotResultSchema.optional(),
  booking_constraints: slotResultSchema.optional(),
  cultural_experiences: slotResultSchema.optional(),
  events: slotResultSchema.optional(),
  markets: slotResultSchema.optional(),
});
export type RagSlotMap = Partial<Record<SlotName, SlotResult>>;

export const bookingTipSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  content: z.string().min(1),
  category: z.string().nullable().optional(),
});
export type BookingTip = z.infer<typeof bookingTipSchema>;

export const ragRetrievalResultSchema = z.object({
  slots: ragSlotMapSchema,
  unsatisfiedSlots: z.array(slotNameSchema),
  bookingTips: z.array(bookingTipSchema),
  stageTimings: z.object({
    embedding: z.number().min(0),
    rag_retrieve: z.number().min(0),
  }),
});
export type RagRetrievalResult = z.infer<typeof ragRetrievalResultSchema>;

export const plannedActivitySchema = z.object({
  time: z.string().min(1),
  name: z.string().min(1),
  description: z.string().min(1),
  type: z.enum(['attraction', 'transport', 'rest']),
  source: sourceTypeSchema,
  confidence: z.number().min(0).max(1),
  location: placeLocationSchema.optional(),
  indoorOutdoor: indoorOutdoorSchema.optional(),
});
export type PlannedActivity = z.infer<typeof plannedActivitySchema>;

export const dayPlanSchema = z.object({
  day: z.number().int().min(1),
  theme: z.string().min(1),
  activities: z.array(plannedActivitySchema),
  meals: z.object({
    breakfast: z.string().optional(),
    lunch: z.string().optional(),
    dinner: z.string().optional(),
  }),
  alternativePlan: z.string().optional(),
});
export type DayPlan = z.infer<typeof dayPlanSchema>;

export const structuredItinerarySchema = z.object({
  destination: z.string().min(1),
  dates: z.string().min(1),
  budget: z.string().min(1),
  days: z.array(dayPlanSchema),
  unknowns: z.array(z.string()),
});
export type StructuredItinerary = z.infer<typeof structuredItinerarySchema>;

export const validationWarningSchema = z.object({
  rule: z.enum(['daily_overload', 'geographic_conflict', 'booking_constraint', 'time_of_day']),
  day: z.number().int().min(1),
  severity: z.enum(['warning']),
  message: z.string().min(1),
});
export type ValidationWarning = z.infer<typeof validationWarningSchema>;

export const validationResultSchema = z.object({
  can_generate: z.boolean(),
  warnings: z.array(validationWarningSchema),
});
export type ValidationResult = z.infer<typeof validationResultSchema>;

export const fallbackResultSchema = z.object({
  slots: ragSlotMapSchema,
  fallbackTriggered: z.boolean(),
  amapCalls: z.number().int().min(0),
});
export type FallbackResult = z.infer<typeof fallbackResultSchema>;

export const tripPlanningResponseSchema = z.object({
  requestId: z.string().min(1),
  text: z.string().min(1),
  intent: planningIntentSchema,
  tripPlan: structuredItinerarySchema,
  validation: validationResultSchema,
  diagnostics: z.object({
    unsatisfiedSlots: z.array(slotNameSchema),
    amapCalls: z.number().int().min(0),
    stageTimings: z.object({
      embedding: z.number().min(0),
      rag_retrieve: z.number().min(0),
      amap_fallback: z.number().min(0),
      planner: z.number().min(0),
      validator: z.number().min(0),
      total: z.number().min(0),
    }),
  }),
});
export type TripPlanningResponse = z.infer<typeof tripPlanningResponseSchema>;

export const STRUCTURED_ITINERARY_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    destination: { type: 'STRING' },
    dates: { type: 'STRING' },
    budget: { type: 'STRING' },
    days: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          day: { type: 'NUMBER' },
          theme: { type: 'STRING' },
          activities: {
            type: 'ARRAY',
            items: {
              type: 'OBJECT',
              properties: {
                time: { type: 'STRING' },
                name: { type: 'STRING' },
                description: { type: 'STRING' },
                type: { type: 'STRING' },
                source: { type: 'STRING' },
                confidence: { type: 'NUMBER' },
              },
              required: ['time', 'name', 'description', 'type', 'source', 'confidence'],
            },
          },
          meals: {
            type: 'OBJECT',
            properties: {
              breakfast: { type: 'STRING' },
              lunch: { type: 'STRING' },
              dinner: { type: 'STRING' },
            },
          },
          alternativePlan: { type: 'STRING' },
        },
        required: ['day', 'theme', 'activities', 'meals'],
      },
    },
    unknowns: {
      type: 'ARRAY',
      items: { type: 'STRING' },
    },
  },
  required: ['destination', 'dates', 'budget', 'days', 'unknowns'],
} as const;

export function parsePlanningIntent(input: unknown): PlanningIntent {
  return planningIntentSchema.parse(input);
}

export function parseStructuredItinerary(input: unknown): StructuredItinerary {
  return structuredItinerarySchema.parse(input);
}

export function parseValidationResult(input: unknown): ValidationResult {
  return validationResultSchema.parse(input);
}

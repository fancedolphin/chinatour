import { useState } from 'react';

import { extractPlanningIntent } from '@/services/planning/intentService';
import type { PlanningIntent } from '@/services/planning/dataContracts';

export function usePlanningIntent() {
  const [intent, setIntent] = useState<PlanningIntent | null>(null);
  const [unknownFields, setUnknownFields] = useState<string[]>([]);

  function extractFromText(rawQuery: string, destination: string): PlanningIntent {
    const nextIntent = extractPlanningIntent(rawQuery, null, { destination });
    const nextUnknownFields: string[] = [];

    if (!nextIntent.groupType) {
      nextUnknownFields.push('旅行人数/组合');
    }
    if (nextIntent.interestTags.length === 0) {
      nextUnknownFields.push('偏好主题');
    }

    setIntent(nextIntent);
    setUnknownFields(nextUnknownFields);
    return nextIntent;
  }

  return {
    intent,
    unknownFields,
    extractFromText,
  };
}

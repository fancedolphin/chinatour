import { narrativeModel } from '@/services/llm/llmConfig';
import type { StructuredItinerary } from './contracts';

const HAN_REGEX = /[一-鿿]/;

function hasChinese(value: string | null | undefined): boolean {
  return typeof value === 'string' && HAN_REGEX.test(value);
}

type StringEntry = {
  setter: (value: string) => void;
  original: string;
};

function collectStrings(plan: StructuredItinerary): StringEntry[] {
  const entries: StringEntry[] = [];

  const push = (value: string | undefined | null, setter: (next: string) => void) => {
    if (value && hasChinese(value)) {
      entries.push({ setter, original: value });
    }
  };

  push(plan.destination, (next) => {
    plan.destination = next;
  });

  plan.days.forEach((day) => {
    push(day.theme, (next) => {
      day.theme = next;
    });
    push(day.alternativePlan, (next) => {
      day.alternativePlan = next;
    });

    day.activities.forEach((activity) => {
      push(activity.name, (next) => {
        activity.name = next;
      });
      push(activity.description, (next) => {
        activity.description = next;
      });
    });

    if (day.meals) {
      (['breakfast', 'lunch', 'dinner'] as const).forEach((slot) => {
        const value = day.meals[slot];
        push(value, (next) => {
          day.meals[slot] = next;
        });
      });
    }

    if (day.mealDetails) {
      (['breakfast', 'lunch', 'dinner'] as const).forEach((slot) => {
        const detail = day.mealDetails?.[slot];
        if (!detail) return;
        push(detail.name, (next) => {
          detail.name = next;
        });
        push(detail.description, (next) => {
          detail.description = next;
        });
        push(detail.anchorAttractionName, (next) => {
          detail.anchorAttractionName = next;
        });
      });
    }
  });

  plan.unknowns.forEach((value, index) => {
    if (hasChinese(value)) {
      entries.push({
        original: value,
        setter: (next) => {
          plan.unknowns[index] = next;
        },
      });
    }
  });

  return entries;
}

const TRANSLATION_INSTRUCTION =
  'You translate Chinese travel-itinerary fragments into natural, concise English for international visitors. ' +
  'Return strict JSON: {"items": string[]} with the same length and order as the input. ' +
  'For Chinese place, dish, or attraction names, write the English/pinyin form and append the original Chinese in parentheses on first mention, e.g. "West Lake (西湖)". ' +
  'Keep numbers, prices, times, and proper nouns unchanged. Do not add commentary.';

function buildTranslationPrompt(values: string[]): string {
  const payload = JSON.stringify({ items: values }, null, 0);
  return `Translate each item in "items" to English following the rules. Input:\n${payload}\nOutput JSON only.`;
}

function parseTranslated(raw: string, expectedLength: number): string[] | null {
  const trimmed = raw.trim().replace(/^```json\s*/i, '').replace(/```$/g, '').trim();
  try {
    const parsed = JSON.parse(trimmed) as { items?: unknown };
    const items = parsed?.items;
    if (!Array.isArray(items) || items.length !== expectedLength) {
      return null;
    }
    if (items.some((item) => typeof item !== 'string')) {
      return null;
    }
    return items as string[];
  } catch {
    return null;
  }
}

class ItineraryTranslator {
  async translateToEnglish(plan: StructuredItinerary): Promise<StructuredItinerary> {
    const cloned: StructuredItinerary = JSON.parse(JSON.stringify(plan));
    const entries = collectStrings(cloned);
    if (entries.length === 0) {
      return cloned;
    }

    const uniqueOriginals = Array.from(new Set(entries.map((entry) => entry.original)));
    try {
      const prompt = buildTranslationPrompt(uniqueOriginals);
      const result = await narrativeModel
        .get(TRANSLATION_INSTRUCTION)
        .generateContent(prompt);
      const translated = parseTranslated(result.response.text(), uniqueOriginals.length);
      if (!translated) {
        console.warn('[itineraryTranslator] translation parse failed; keeping original text');
        return cloned;
      }

      const translationMap = new Map<string, string>();
      uniqueOriginals.forEach((original, index) => {
        translationMap.set(original, translated[index]);
      });

      entries.forEach((entry) => {
        const next = translationMap.get(entry.original);
        if (next) entry.setter(next);
      });

      return cloned;
    } catch (error) {
      console.warn('[itineraryTranslator] translation request failed; keeping original text', error);
      return cloned;
    }
  }
}

export const itineraryTranslator = new ItineraryTranslator();

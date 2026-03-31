import {
  GoogleGenerativeAI,
  HarmBlockThreshold,
  HarmCategory,
  type Content,
  type GenerationConfig,
} from '@google/generative-ai';

export const GEMINI_MODELS = {
  PLANNER: 'gemini-2.5-flash',
  NARRATIVE: 'gemini-2.5-flash',
  EMBEDDING: 'text-embedding-004',
} as const;

const TRAVEL_SAFETY = [
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
  },
] as const;

export const TOKEN_BUDGET = {
  PLANNER_CONTEXT_MAX: 8_000,
  NARRATIVE_CONTEXT_MAX: 6_000,
  DAILY_API_CALLS_LIMIT: 500,
} as const;

const MODEL_CONFIG = {
  planner: {
    model: GEMINI_MODELS.PLANNER,
    generationConfig: {
      temperature: 0.2,
      topP: 0.8,
      maxOutputTokens: 4_096,
      responseMimeType: 'application/json',
    } satisfies GenerationConfig,
  },
  narrative: {
    model: GEMINI_MODELS.NARRATIVE,
    generationConfig: {
      temperature: 0.7,
      topP: 0.9,
      maxOutputTokens: 4_096,
    } satisfies GenerationConfig,
  },
} as const;

let cachedGenAI: GoogleGenerativeAI | null = null;

function getApiKey(): string {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    throw new Error('VITE_GEMINI_API_KEY 未配置');
  }
  return apiKey;
}

function getGenAI(): GoogleGenerativeAI {
  if (!cachedGenAI) {
    cachedGenAI = new GoogleGenerativeAI(getApiKey());
  }
  return cachedGenAI;
}

function resolveModel(kind: keyof typeof MODEL_CONFIG, systemInstruction?: string) {
  const config = MODEL_CONFIG[kind];
  return getGenAI().getGenerativeModel({
    model: config.model,
    generationConfig: config.generationConfig,
    safetySettings: [...TRAVEL_SAFETY],
    systemInstruction,
  });
}

export const plannerModel = {
  get(systemInstruction?: string) {
    return resolveModel('planner', systemInstruction);
  },
};

export const narrativeModel = {
  get(systemInstruction?: string) {
    return resolveModel('narrative', systemInstruction);
  },
  startChat(systemInstruction: string, history: Content[]) {
    return resolveModel('narrative', systemInstruction).startChat({ history });
  },
};

export function createGeminiModel(
  model: keyof typeof GEMINI_MODELS,
  systemInstruction?: string,
) {
  if (model === 'PLANNER') {
    return plannerModel.get(systemInstruction);
  }
  if (model === 'NARRATIVE') {
    return narrativeModel.get(systemInstruction);
  }

  return getGenAI().getGenerativeModel({
    model: GEMINI_MODELS[model],
    systemInstruction,
  });
}

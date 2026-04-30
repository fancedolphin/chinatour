import { supabase } from '@/utils/supabase/client';

export const GEMINI_MODELS = {
  PLANNER: 'gemini-2.5-flash',
  NARRATIVE: 'gemini-2.5-flash',
  EMBEDDING: 'text-embedding-004',
} as const;

const TRAVEL_SAFETY = [
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
] as const;

export const TOKEN_BUDGET = {
  PLANNER_CONTEXT_MAX: 8_000,
  NARRATIVE_CONTEXT_MAX: 6_000,
  DAILY_API_CALLS_LIMIT: 500,
} as const;

export interface ContentPart {
  text: string;
}

export interface Content {
  role: 'user' | 'model';
  parts: ContentPart[];
}

export interface GenerationConfig {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
  responseMimeType?: string;
}

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

export interface GeminiResult {
  response: { text: () => string };
}

interface ProxyPayload {
  model: string;
  systemInstruction?: string;
  contents: Content[];
  generationConfig: GenerationConfig;
  safetySettings: ReadonlyArray<{ category: string; threshold: string }>;
}

async function invokeProxy(payload: ProxyPayload): Promise<GeminiResult> {
  const { data, error } = await supabase.functions.invoke('gemini-proxy', {
    body: payload,
  });
  if (error) {
    throw new Error(`gemini-proxy invoke failed: ${error.message ?? 'unknown'}`);
  }
  if (data && typeof data === 'object' && 'error' in data) {
    throw new Error(`gemini-proxy upstream error: ${(data as { error: string }).error}`);
  }
  const text =
    data && typeof data === 'object' && 'text' in data && typeof (data as { text: unknown }).text === 'string'
      ? (data as { text: string }).text
      : '';
  return { response: { text: () => text } };
}

function normalizePromptToContents(prompt: string | Content | Content[]): Content[] {
  if (typeof prompt === 'string') {
    return [{ role: 'user', parts: [{ text: prompt }] }];
  }
  if (Array.isArray(prompt)) {
    return prompt;
  }
  return [prompt];
}

function buildModel(kind: keyof typeof MODEL_CONFIG, systemInstruction?: string) {
  const config = MODEL_CONFIG[kind];
  return {
    async generateContent(prompt: string | Content | Content[]): Promise<GeminiResult> {
      return invokeProxy({
        model: config.model,
        systemInstruction,
        contents: normalizePromptToContents(prompt),
        generationConfig: config.generationConfig,
        safetySettings: TRAVEL_SAFETY,
      });
    },
    startChat(options: { history: Content[] }) {
      return startChatInternal(kind, systemInstruction, options.history);
    },
  };
}

function startChatInternal(
  kind: keyof typeof MODEL_CONFIG,
  systemInstruction: string | undefined,
  history: Content[],
) {
  const config = MODEL_CONFIG[kind];
  let currentHistory: Content[] = [...history];
  return {
    async sendMessage(userMessage: string): Promise<GeminiResult> {
      const contents: Content[] = [
        ...currentHistory,
        { role: 'user', parts: [{ text: userMessage }] },
      ];
      const result = await invokeProxy({
        model: config.model,
        systemInstruction,
        contents,
        generationConfig: config.generationConfig,
        safetySettings: TRAVEL_SAFETY,
      });
      currentHistory = [
        ...contents,
        { role: 'model', parts: [{ text: result.response.text() }] },
      ];
      return result;
    },
  };
}

export const plannerModel = {
  get(systemInstruction?: string) {
    return buildModel('planner', systemInstruction);
  },
};

export const narrativeModel = {
  get(systemInstruction?: string) {
    return buildModel('narrative', systemInstruction);
  },
  startChat(systemInstruction: string, history: Content[]) {
    return startChatInternal('narrative', systemInstruction, history);
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
  throw new Error(
    `createGeminiModel: model "${model}" must be invoked via the dedicated edge function (e.g. generate-embedding for EMBEDDING)`,
  );
}

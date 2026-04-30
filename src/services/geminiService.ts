/**
 * Gemini Service
 * 封装 Google Generative AI 对话，用于旅行行程规划
 */

import { narrativeModel, type Content } from './llm/llmConfig';
import { getSystemPrompt } from './llm/prompts';

export type ChatHistory = Content[];

export interface TripPlanData {
  destination: string;
  dates: string;
  budget: string;
  days: Array<{
    day: number;
    theme: string;
    activities: Array<{
      time: string;
      name: string;
      description: string;
      type: 'attraction' | 'transport' | 'rest';
    }>;
    meals: {
      breakfast?: string;
      lunch?: string;
      dinner?: string;
    };
    alternativePlan?: string;
  }>;
}

export interface GeminiResponse {
  text: string;
  tripPlan?: TripPlanData;
}

function parseResponse(raw: string): GeminiResponse {
  const jsonMatch = raw.match(/```json\s*([\s\S]*?)```/);
  let tripPlan: TripPlanData | undefined;

  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      if (parsed?.tripPlan) {
        tripPlan = parsed.tripPlan as TripPlanData;
      }
    } catch {
      console.warn('[geminiService] 解析 tripPlan JSON 失败');
    }
  }

  const text = raw.replace(/```json[\s\S]*?```/g, '').trim();
  return { text, tripPlan };
}

export async function sendGeminiMessage(
  history: ChatHistory,
  userMessage: string,
): Promise<{ response: GeminiResponse; updatedHistory: ChatHistory }> {
  const chat = narrativeModel.startChat(getSystemPrompt(), history);
  const result = await chat.sendMessage(userMessage);
  const rawText = result.response.text();

  const updatedHistory: ChatHistory = [
    ...history,
    { role: 'user', parts: [{ text: userMessage }] },
    { role: 'model', parts: [{ text: rawText }] },
  ];

  return { response: parseResponse(rawText), updatedHistory };
}

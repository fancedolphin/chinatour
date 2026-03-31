/**
 * Gemini Service
 * 封装 Google Generative AI 对话，用于旅行行程规划
 */

import type { Content } from '@google/generative-ai';
import { narrativeModel } from './llm/llmConfig';

const SYSTEM_PROMPT = `你是专业的AI旅行规划助手，帮助用户制定详细的旅行行程。

## 回复规则
1. 始终用中文回复，语气亲切专业
2. 生成或更新行程时，在对话文字末尾附上 JSON 代码块（格式见下）
3. 仅回答问题、不涉及行程变更时，只返回文字，不加 JSON

## JSON 格式（严格遵守字段名）
\`\`\`json
{
  "tripPlan": {
    "destination": "目的地名称",
    "dates": "2024年X月X日 - X月X日",
    "budget": "总预算描述",
    "days": [
      {
        "day": 1,
        "theme": "今日主题",
        "activities": [
          {
            "time": "09:00",
            "name": "活动/景点名称",
            "description": "简短描述",
            "type": "attraction"
          }
        ],
        "meals": {
          "breakfast": "餐厅名 - 特色描述，人均XX元",
          "lunch": "餐厅名 - 特色描述，人均XX元",
          "dinner": "餐厅名 - 特色描述，人均XX元"
        },
        "alternativePlan": "如遇下雨：备选活动描述"
      }
    ]
  }
}
\`\`\`

## activity type 枚举
- attraction：景点/观光/购物
- transport：交通/转移
- rest：休息/住宿/自由活动`;

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
  const chat = narrativeModel.startChat(SYSTEM_PROMPT, history);
  const result = await chat.sendMessage(userMessage);
  const rawText = result.response.text();

  const updatedHistory: ChatHistory = [
    ...history,
    { role: 'user', parts: [{ text: userMessage }] },
    { role: 'model', parts: [{ text: rawText }] },
  ];

  return { response: parseResponse(rawText), updatedHistory };
}

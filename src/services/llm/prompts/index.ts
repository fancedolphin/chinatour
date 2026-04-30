import { getCurrentLocale } from '@/i18n';
import { SYSTEM_PROMPT_ZH } from './systemPrompt.zh';
import { SYSTEM_PROMPT_EN } from './systemPrompt.en';

/**
 * 按 locale 返回当前站点的 chat SYSTEM_PROMPT。
 * 双站构建下，VITE_LOCALE 决定默认值；用户在 Settings 切语言时也跟随。
 */
export function getSystemPrompt(): string {
  return getCurrentLocale() === 'en' ? SYSTEM_PROMPT_EN : SYSTEM_PROMPT_ZH;
}

export { SYSTEM_PROMPT_ZH, SYSTEM_PROMPT_EN };

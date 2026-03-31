import type { PlaceCandidate, SourceType } from '@/services/planning/dataContracts';

const INJECTION_PATTERN =
  /(ignore\s+(all|above|previous)|reveal\s+system\s+prompt|system\s+prompt|developer\s+message|follow these instructions|覆写规则|忽略(以上|之前)规则|系统提示|开发者消息)/i;
const INJECTION_REPLACE_PATTERN =
  /(ignore\s+(all|above|previous)|reveal\s+system\s+prompt|system\s+prompt|developer\s+message|follow these instructions|覆写规则|忽略(以上|之前)规则|系统提示|开发者消息)/gi;
const CONTROL_CHAR_PATTERN = /[\u0000-\u001f\u007f]/g;

export function sanitizePromptField(value: string, maxLength = 240): string {
  return value
    .replace(CONTROL_CHAR_PATTERN, ' ')
    .replace(/\s+/g, ' ')
    .replace(INJECTION_REPLACE_PATTERN, '[filtered]')
    .trim()
    .slice(0, maxLength);
}

export function isHighRiskPromptInjection(value: string): boolean {
  return INJECTION_PATTERN.test(value);
}

export function sourceTrustRank(source: SourceType): number {
  switch (source) {
    case 'rag':
      return 4;
    case 'rag+amap':
      return 3;
    case 'amap':
      return 2;
    case 'llm':
    default:
      return 1;
  }
}

export function sortCandidatesByTrust(items: PlaceCandidate[]): PlaceCandidate[] {
  return [...items].sort((left, right) => {
    const trustDelta = sourceTrustRank(right.source) - sourceTrustRank(left.source);
    if (trustDelta !== 0) {
      return trustDelta;
    }
    return right.confidence - left.confidence;
  });
}

export function summarizeSourceTrust(items: Array<Pick<PlaceCandidate, 'source'>>): string {
  const counters = new Map<SourceType, number>();
  for (const item of items) {
    counters.set(item.source, (counters.get(item.source) || 0) + 1);
  }

  return ['rag', 'rag+amap', 'amap', 'llm']
    .filter((source) => counters.has(source as SourceType))
    .map((source) => `${source}:${counters.get(source as SourceType)}`)
    .join(', ');
}

const KEYWORD_PATTERN = /[^\u4e00-\u9fa5a-zA-Z0-9\s\-]/g;
const CONTROL_CHAR_PATTERN = /[\u0000-\u001f\u007f]/g;
const INJECTION_PATTERN =
  /(ignore\s+(all|above|previous)|reveal\s+system\s+prompt|system\s+prompt|developer\s+message|忽略(以上|之前)规则|系统提示)/gi;

export function sanitizeKeywords(value: string): string {
  return value
    .replace(CONTROL_CHAR_PATTERN, '')
    .replace(/\r?\n/g, '')
    .replace(INJECTION_PATTERN, '')
    .replace(KEYWORD_PATTERN, '')
    .trim()
    .slice(0, 50);
}

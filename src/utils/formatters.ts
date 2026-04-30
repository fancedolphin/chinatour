/**
 * Locale-aware formatters built on the Intl API.
 *
 * 设计原则：
 *  1. 不依赖 React/i18next，纯函数；服务层和组件均可使用。
 *  2. locale 由调用方显式传入；默认 fallback 为 'zh'。
 *  3. 若调用方未指定 locale，从 i18next 当前语言读取（运行时轻量耦合，不引入循环依赖）。
 */

export type SupportedLocale = 'zh' | 'en';

const FALLBACK_LOCALE: SupportedLocale = 'zh';

let currentLocaleResolver: () => SupportedLocale = () => {
  // build-time 默认值（与 src/i18n/index.ts 的 resolveInitialLocale 行为对齐，但不导入它以避免循环依赖）
  const buildLocale = import.meta.env.VITE_LOCALE;
  if (buildLocale === 'zh' || buildLocale === 'en') return buildLocale;
  return FALLBACK_LOCALE;
};

/**
 * 由 i18n 初始化代码注册当前 locale 来源（可选）。
 * 调用 setLocaleResolver(() => i18n.language) 后，formatters 默认 locale 跟随 i18next。
 */
export function setLocaleResolver(resolver: () => SupportedLocale) {
  currentLocaleResolver = resolver;
}

function resolveLocale(locale?: SupportedLocale): SupportedLocale {
  if (locale === 'zh' || locale === 'en') return locale;
  try {
    return currentLocaleResolver();
  } catch {
    return FALLBACK_LOCALE;
  }
}

/** Map our locale code to a BCP-47 tag accepted by Intl. */
function toIntlLocale(locale: SupportedLocale): string {
  return locale === 'en' ? 'en-US' : 'zh-CN';
}

/**
 * 完整日期。
 * zh: 2026年4月1日 / en: April 1, 2026
 */
export function formatDate(date: Date | string | number, locale?: SupportedLocale): string {
  const d = toDate(date);
  if (!d) return '';
  return new Intl.DateTimeFormat(toIntlLocale(resolveLocale(locale)), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  }).format(d);
}

/**
 * 短日期（不含年份）。
 * zh: 4月1日 / en: Apr 1
 */
export function formatShortDate(date: Date | string | number, locale?: SupportedLocale): string {
  const d = toDate(date);
  if (!d) return '';
  return new Intl.DateTimeFormat(toIntlLocale(resolveLocale(locale)), {
    month: 'short',
    day: 'numeric',
  }).format(d);
}

/**
 * 日期区间。
 * zh: 2026年4月1日 - 4月3日 / en: April 1 – 3, 2026 (区间内 Intl 自动处理共享月份)
 */
export function formatDateRange(
  start: Date | string | number,
  end: Date | string | number,
  locale?: SupportedLocale,
): string {
  const startDate = toDate(start);
  const endDate = toDate(end);
  if (!startDate || !endDate) return '';
  const formatter = new Intl.DateTimeFormat(toIntlLocale(resolveLocale(locale)), {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  if (typeof formatter.formatRange === 'function') {
    return formatter.formatRange(startDate, endDate);
  }
  return `${formatter.format(startDate)} - ${formatter.format(endDate)}`;
}

/**
 * 相对时间（与现在的距离）。
 * zh: 3 分钟前 / en: 3 minutes ago
 */
export function formatRelativeTime(date: Date | string | number, locale?: SupportedLocale): string {
  const d = toDate(date);
  if (!d) return '';
  const rtf = new Intl.RelativeTimeFormat(toIntlLocale(resolveLocale(locale)), { numeric: 'auto' });
  const diffSec = Math.round((d.getTime() - Date.now()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, 'second');
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), 'minute');
  if (abs < 86_400) return rtf.format(Math.round(diffSec / 3600), 'hour');
  if (abs < 604_800) return rtf.format(Math.round(diffSec / 86_400), 'day');
  if (abs < 2_592_000) return rtf.format(Math.round(diffSec / 604_800), 'week');
  if (abs < 31_536_000) return rtf.format(Math.round(diffSec / 2_592_000), 'month');
  return rtf.format(Math.round(diffSec / 31_536_000), 'year');
}

/**
 * 货币（默认 CNY）。
 * zh: ¥800 / en: ¥800
 */
export function formatCurrency(
  amount: number,
  locale?: SupportedLocale,
  currency: string = 'CNY',
): string {
  if (!Number.isFinite(amount)) return '';
  return new Intl.NumberFormat(toIntlLocale(resolveLocale(locale)), {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * 数字。
 * zh: 1,234.5 / en: 1,234.5
 */
export function formatNumber(
  value: number,
  locale?: SupportedLocale,
  options?: Intl.NumberFormatOptions,
): string {
  if (!Number.isFinite(value)) return '';
  return new Intl.NumberFormat(toIntlLocale(resolveLocale(locale)), options).format(value);
}

/**
 * 时长（输入为分钟）。
 * zh: 2小时30分钟 / en: 2h 30min
 */
export function formatDuration(minutes: number, locale?: SupportedLocale): string {
  if (!Number.isFinite(minutes) || minutes < 0) return '';
  const lng = resolveLocale(locale);
  const totalMinutes = Math.round(minutes);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (lng === 'en') {
    if (h === 0) return `${m}min`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}min`;
  }
  if (h === 0) return `${m}分钟`;
  if (m === 0) return `${h}小时`;
  return `${h}小时${m}分钟`;
}

/**
 * 行程预算字符串。统一封装替代 plannerService 内手写的 `约¥${total}（人均¥${perDay}/天）`。
 */
export function formatTripBudget(
  total: number,
  perDay: number,
  locale?: SupportedLocale,
): string {
  const lng = resolveLocale(locale);
  if (lng === 'en') {
    return `~${formatCurrency(total, lng)} (${formatCurrency(perDay, lng)}/day)`;
  }
  return `约${formatCurrency(total, lng)}（人均${formatCurrency(perDay, lng)}/天）`;
}

function toDate(input: Date | string | number): Date | null {
  if (input instanceof Date) {
    return Number.isFinite(input.getTime()) ? input : null;
  }
  const d = new Date(input);
  return Number.isFinite(d.getTime()) ? d : null;
}

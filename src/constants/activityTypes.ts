export const ACTIVITY_STYLES = {
  attraction: 'bg-orange-50 text-orange-600',
  transport: 'bg-blue-50 text-blue-600',
  rest: 'bg-green-50 text-green-600',
  meal: 'bg-yellow-50 text-yellow-600',
} as const;

export const ACTIVITY_LABELS = {
  attraction: '景点',
  transport: '交通',
  rest: '休息',
  meal: '餐饮',
} as const;

export type ActivityType = keyof typeof ACTIVITY_STYLES;

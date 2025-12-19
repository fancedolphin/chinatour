import { toast } from 'sonner@2.0.3';

/**
 * 应用内统一的错误类型定义。
 */
export enum ErrorType {
  NETWORK = 'NETWORK',
  AUTH = 'AUTH',
  VALIDATION = 'VALIDATION',
  DATABASE = 'DATABASE',
  UNKNOWN = 'UNKNOWN',
}

/**
 * 针对不同错误类型的默认用户提示文案。
 */
const ERROR_MESSAGES: Record<ErrorType, string> = {
  [ErrorType.NETWORK]: '网络连接失败，请检查网络设置',
  [ErrorType.AUTH]: '认证失败，请重新登录',
  [ErrorType.VALIDATION]: '输入信息有误，请检查后重试',
  [ErrorType.DATABASE]: '数据操作失败，请稍后重试',
  [ErrorType.UNKNOWN]: '操作失败，请稍后重试',
};

/**
 * 统一的业务错误对象。
 */
export class AppError extends Error {
  public readonly type: ErrorType;
  public readonly userMessage: string;
  public readonly originalError?: unknown;

  /**
   * @param type 错误分类
   * @param message 原始错误消息
   * @param userMessage 用户可见的友好提示
   * @param originalError 原始错误对象
   */
  constructor(type: ErrorType, message: string, userMessage: string, originalError?: unknown) {
    super(message);
    this.name = 'AppError';
    this.type = type;
    this.userMessage = userMessage;
    this.originalError = originalError;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

type NormalizedError = {
  message: string;
  code?: string;
  status?: number;
};

const LOGGER_NAMESPACE = '[errorHandler]';

/**
 * 入口方法：解析错误、记录日志并反馈提示。
 *
 * @param error 未知错误对象
 * @param context 上下文标识（如 service 名称）
 */
export function handleError(error: unknown, context?: string): void {
  const parsed = parseError(error);
  logError(parsed, context);
  showErrorToast(parsed);
}

/**
 * 将未知错误解析为 AppError。
 *
 * 识别优先级：
 * 1) Supabase 错误（code/message）
 * 2) HTTP 状态码
 * 3) 网络错误
 * 4) 默认 UNKNOWN
 *
 * @param error 未知错误对象
 * @returns 标准化的 AppError
 */
function parseError(error: unknown): AppError {
  if (error instanceof AppError) {
    return error;
  }

  const normalized = normalizeError(error);

  const supabaseType = resolveSupabaseErrorType(normalized.code, normalized.message);
  if (supabaseType) {
    return new AppError(supabaseType, normalized.message, ERROR_MESSAGES[supabaseType], error);
  }

  const httpType = resolveHttpErrorType(normalized.status);
  if (httpType) {
    return new AppError(httpType, normalized.message, ERROR_MESSAGES[httpType], error);
  }

  if (isNetworkError(normalized.message, normalized.code)) {
    return new AppError(ErrorType.NETWORK, normalized.message, ERROR_MESSAGES[ErrorType.NETWORK], error);
  }

  return new AppError(ErrorType.UNKNOWN, normalized.message, ERROR_MESSAGES[ErrorType.UNKNOWN], error);
}

/**
 * 根据错误信息判断是否为 Supabase 错误。
 */
function resolveSupabaseErrorType(code?: string, message?: string): ErrorType | null {
  const normalizedCode = code ?? '';
  const normalizedMessage = (message ?? '').toLowerCase();

  const looksLikeSupabaseCode = /^pgrst\d+/i.test(normalizedCode) || /^\d{5}$/.test(normalizedCode);
  const mentionsSupabase = /supabase|postgres|pgrst/.test(normalizedMessage);

  if (!looksLikeSupabaseCode && !mentionsSupabase) {
    return null;
  }

  if (normalizedCode === 'PGRST116' || normalizedMessage.includes('rls') || normalizedMessage.includes('permission denied')) {
    return ErrorType.AUTH;
  }

  if (normalizedCode === '23505' || normalizedCode === '22P02' || normalizedMessage.includes('duplicate key') || normalizedMessage.includes('unique constraint')) {
    return ErrorType.VALIDATION;
  }

  return ErrorType.DATABASE;
}

/**
 * 基于 HTTP 状态码识别错误类型。
 */
function resolveHttpErrorType(status?: number): ErrorType | null {
  if (typeof status !== 'number') {
    return null;
  }

  if (status === 401 || status === 403) {
    return ErrorType.AUTH;
  }

  if (status === 422) {
    return ErrorType.VALIDATION;
  }

  if (status >= 500) {
    return ErrorType.DATABASE;
  }

  return null;
}

/**
 * 标准化未知错误，提取 message/code/status。
 */
function normalizeError(error: unknown): NormalizedError {
  const fallbackMessage = 'Unknown error';

  if (error instanceof AppError) {
    return { message: error.message, code: error.type, status: undefined };
  }

  if (error instanceof Error) {
    const anyError = error as Record<string, unknown>;
    return {
      message: error.message || fallbackMessage,
      code: typeof anyError.code === 'string' ? anyError.code : undefined,
      status: typeof anyError.status === 'number' ? anyError.status : undefined,
    };
  }

  if (typeof error === 'string') {
    return { message: error };
  }

  if (isRecord(error)) {
    return {
      message: typeof error.message === 'string' ? error.message : fallbackMessage,
      code: typeof error.code === 'string' ? error.code : undefined,
      status: typeof error.status === 'number' ? error.status : undefined,
    };
  }

  return { message: fallbackMessage };
}

/**
 * 判定是否为网络错误。
 */
function isNetworkError(message: string, code?: string): boolean {
  const normalizedMessage = message.toLowerCase();
  return normalizedMessage.includes('network') || code === 'ECONNREFUSED';
}

/**
 * 按统一格式记录错误日志。
 */
function logError(error: AppError, context?: string): void {
  const contextLabel = context ?? 'unknown';
  console.error(`${LOGGER_NAMESPACE} ${contextLabel}: ${error.userMessage}`, error);
}

/**
 * 使用 Sonner 弹出错误提示。
 */
function showErrorToast(error: AppError): void {
  toast.error(error.userMessage, { duration: 5000 });
}

export { ErrorType, AppError, handleError };

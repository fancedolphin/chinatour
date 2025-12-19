/**
 * Enumerates supported log severity levels.
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
}

const isDevelopment = process.env.NODE_ENV !== 'production';

/**
 * Lightweight console logger scoped by namespace.
 */
export class Logger {
  private readonly namespace: string;

  /**
   * @param namespace Identifies the log source, e.g. service or module name.
   */
  constructor(namespace: string) {
    this.namespace = namespace;
  }

  /**
   * Logs debug-level details in non-production environments.
   */
  debug(message: string, ...args: unknown[]): void {
    if (!isDevelopment) return;
    console.debug(this.formatMessage(message), ...args);
  }

  /**
   * Logs informational messages in non-production environments.
   */
  info(message: string, ...args: unknown[]): void {
    if (!isDevelopment) return;
    console.info(this.formatMessage(message), ...args);
  }

  /**
   * Logs warnings in all environments.
   */
  warn(message: string, ...args: unknown[]): void {
    console.warn(this.formatMessage(message), ...args);
  }

  /**
   * Logs errors in all environments.
   */
  error(message: string, error?: unknown): void {
    const formatted = this.formatMessage(message);
    if (typeof error !== 'undefined') {
      console.error(formatted, error);
      return;
    }
    console.error(formatted);
  }

  /**
   * Starts a performance timer for the provided label (non-production only).
   */
  time(label: string): void {
    if (!isDevelopment) return;
    console.time(this.formatLabel(label));
  }

  /**
   * Ends a performance timer for the provided label (non-production only).
   */
  timeEnd(label: string): void {
    if (!isDevelopment) return;
    console.timeEnd(this.formatLabel(label));
  }

  private formatMessage(message: string): string {
    if (isDevelopment) {
      const timestamp = new Date().toISOString();
      return `[${timestamp}] [${this.namespace}] ${message}`;
    }
    return `[${this.namespace}] ${message}`;
  }

  private formatLabel(label: string): string {
    return `[${this.namespace}] ${label}`;
  }
}

/**
 * Factory helper to create a namespaced logger.
 */
export function createLogger(namespace: string): Logger {
  return new Logger(namespace);
}

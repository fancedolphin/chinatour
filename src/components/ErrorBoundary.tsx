/**
 * Error Boundary
 *
 * React 18 错误边界组件，为子树提供统一的错误捕获与降级 UI。
 * 支持自定义 fallback 视图以及错误回调，遵循严格模式与命名空间日志格式。
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { handleError } from '@/utils/errorHandler';
import i18n from '@/i18n';

/**
 * ErrorBoundary 组件的属性。
 */
export interface ErrorBoundaryProps {
  /** 子组件树 */
  children: ReactNode;
  /** 可选的自定义降级 UI */
  fallback?: ReactNode;
  /** 可选的错误回调，便于外部上报或记录 */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

/**
 * ErrorBoundary 组件的状态。
 */
export interface ErrorBoundaryState {
  /** 是否已捕获错误 */
  hasError: boolean;
  /** 捕获的错误实例 */
  error?: Error;
}

/**
 * 捕获渲染错误并提供降级体验的错误边界。
 */
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    handleError(error, 'ErrorBoundary');
    this.props.onError?.(error, errorInfo);
    // 可选：将错误上报至监控服务
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback || <DefaultErrorFallback error={this.state.error} />;
    }
    return this.props.children;
  }
}

/**
 * 默认的错误降级 UI，提供刷新入口与开发态的错误详情。
 */
function DefaultErrorFallback({ error }: { error?: Error }): JSX.Element {
  const t = (key: string) => i18n.t(key);
  return (
    <div style={{ padding: '2rem', textAlign: 'center' }}>
      <h2>{t('errorBoundary.title')}</h2>
      <p>{t('errorBoundary.message')}</p>
      {process.env.NODE_ENV === 'development' && error && (
        <details style={{ marginTop: '1rem', textAlign: 'left' }}>
          <summary>{t('errorBoundary.details')}</summary>
          <pre style={{ overflow: 'auto' }}>{error.stack}</pre>
        </details>
      )}
      <button
        onClick={() => window.location.reload()}
        style={{ marginTop: '1rem', padding: '0.5rem 1rem' }}
      >
        {t('errorBoundary.refresh')}
      </button>
    </div>
  );
}

export { ErrorBoundary, DefaultErrorFallback };
export default ErrorBoundary;

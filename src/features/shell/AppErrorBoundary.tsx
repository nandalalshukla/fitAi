import { Component, type ErrorInfo, type ReactNode } from 'react';
import { View } from 'react-native';

import { logger } from '@/core';
import { i18n } from '@/i18n';
import { ErrorState } from '@/ui';

interface State {
  error: Error | null;
}

/**
 * Last-resort boundary: a render crash shows a friendly error with "Try again" instead of a
 * blank screen, and is reported (scrubbed) through the logger → Sentry sink.
 */
export class AppErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    logger.error('Unhandled render error', { error, componentStack: info.componentStack ?? '' });
  }

  override render() {
    if (!this.state.error) return this.props.children;
    return (
      <View testID="app-error" style={{ flex: 1, justifyContent: 'center' }}>
        <ErrorState
          title={i18n.t('errors.crashTitle')}
          message={i18n.t('errors.crashMessage')}
          retryLabel={i18n.t('common.retry')}
          onRetry={() => this.setState({ error: null })}
        />
      </View>
    );
  }
}

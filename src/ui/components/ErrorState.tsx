import { EmptyState } from './EmptyState';

export interface ErrorStateProps {
  title: string;
  message?: string;
  retryLabel?: string;
  onRetry?: () => void;
  testID?: string;
}

/** Error variant of EmptyState: warning icon + retry action. */
export function ErrorState({ title, message, retryLabel, onRetry, testID }: ErrorStateProps) {
  return (
    <EmptyState
      testID={testID}
      icon="alert-circle-outline"
      iconColor="dangerText"
      title={title}
      message={message}
      actionLabel={retryLabel}
      onAction={onRetry}
    />
  );
}

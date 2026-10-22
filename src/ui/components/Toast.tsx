import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { View } from 'react-native';
import Animated, { FadeOutUp, SlideInUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { haptics } from '../haptics';
import { spring } from '../hooks/useMotion';
import { durations } from '../theme/motion';
import { useTheme } from '../theme/ThemeProvider';
import { Icon, type IconName } from './Icon';
import { PressableScale } from './PressableScale';
import { Text } from './Text';

export type ToastKind = 'info' | 'success' | 'warning' | 'error';

export interface ToastOptions {
  message: string;
  kind?: ToastKind;
  /** Optional action, e.g. "Undo". */
  actionLabel?: string;
  onAction?: () => void;
  durationMs?: number;
}

interface ToastItem extends ToastOptions {
  id: number;
}

const ToastContext = createContext<{ show: (o: ToastOptions) => void } | null>(null);

const ICONS: Record<ToastKind, IconName> = {
  info: 'information-circle',
  success: 'checkmark-circle',
  warning: 'warning',
  error: 'alert-circle',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ToastItem | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(1);

  const show = useCallback((o: ToastOptions) => {
    if (timer.current) clearTimeout(timer.current);
    if (o.kind === 'error') haptics.error();
    else if (o.kind === 'warning') haptics.warning();
    setToast({ ...o, id: nextId.current++ });
    timer.current = setTimeout(() => setToast(null), o.durationMs ?? 3200);
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toast ? <ToastView key={toast.id} toast={toast} onDismiss={() => setToast(null)} /> : null}
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onDismiss }: { toast: ToastItem; onDismiss: () => void }) {
  const { colors, radii, spacing } = useTheme();
  const insets = useSafeAreaInsets();
  const kind = toast.kind ?? 'info';
  const iconColor = (
    { info: 'info', success: 'successText', warning: 'warningText', error: 'dangerText' } as const
  )[kind];

  return (
    <Animated.View
      entering={SlideInUp.springify()
        .damping(spring('gentle').damping ?? 22)
        .stiffness(spring('gentle').stiffness ?? 180)}
      exiting={FadeOutUp.duration(durations.fast)}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
      style={{
        position: 'absolute',
        top: insets.top + spacing[2],
        left: spacing[4],
        right: spacing[4],
        flexDirection: 'row',
        alignItems: 'center',
        gap: spacing[3],
        padding: spacing[4],
        borderRadius: radii.lg,
        backgroundColor: colors.surfaceElevated,
        borderWidth: 1,
        borderColor: colors.borderStrong,
      }}
    >
      <Icon name={ICONS[kind]} color={iconColor} />
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{toast.message}</Text>
      </View>
      {toast.actionLabel ? (
        <PressableScale
          onPress={() => {
            toast.onAction?.();
            onDismiss();
          }}
          accessibilityLabel={toast.actionLabel}
          hitSlop={12}
        >
          <Text variant="label" color="accentText">
            {toast.actionLabel}
          </Text>
        </PressableScale>
      ) : null}
    </Animated.View>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}

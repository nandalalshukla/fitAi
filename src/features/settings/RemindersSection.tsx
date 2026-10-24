import { View } from 'react-native';

import { track } from '@/core';
import { requestNotificationPermission, useReminderSettings } from '@/features/reminders';
import { useTranslation } from '@/i18n';
import { Card, Chip, ListItem, SectionHeader, Switch, Text, useTheme, useToast } from '@/ui';

const TIMES = [6, 7, 8, 12, 17, 18, 19, 20];
const hhmm = (h: number, m: number) =>
  `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;

/** Daily reminder (time) + streak saver. Asks for notification permission when turned on. */
export function RemindersSection() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const toast = useToast();
  const r = useReminderSettings();

  const enable = async (key: 'enabled' | 'streakNudge', on: boolean) => {
    if (on && !(await requestNotificationPermission())) {
      toast.show({ message: t('reminders.permissionDenied'), kind: 'error' });
      return;
    }
    r.update({ [key]: on });
    const next = { ...r, [key]: on };
    track('reminders_changed', { daily: next.enabled, streak: next.streakNudge });
  };

  return (
    <View style={{ gap: spacing[3] }}>
      <SectionHeader title={t('reminders.title')} />
      <Card padding={2}>
        <ListItem
          icon="alarm-outline"
          title={t('reminders.daily')}
          subtitle={t('reminders.dailyHint')}
          trailing={
            <Switch
              testID="reminder-daily"
              value={r.enabled}
              onValueChange={(v) => void enable('enabled', v)}
              accessibilityLabel={t('reminders.daily')}
            />
          }
        />
        <ListItem
          icon="flame-outline"
          title={t('reminders.streak')}
          subtitle={t('reminders.streakHint')}
          trailing={
            <Switch
              testID="reminder-streak"
              value={r.streakNudge}
              onValueChange={(v) => void enable('streakNudge', v)}
              accessibilityLabel={t('reminders.streak')}
            />
          }
        />
      </Card>
      {r.enabled ? (
        <View style={{ gap: spacing[2] }}>
          <Text variant="label" color="textMuted">
            {t('reminders.time')}
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] }}>
            {TIMES.map((h) => (
              <Chip
                key={h}
                label={hhmm(h, 0)}
                selected={r.hour === h && r.minute === 0}
                onPress={() => r.update({ hour: h, minute: 0 })}
              />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

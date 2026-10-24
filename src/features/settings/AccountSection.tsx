import { File, Paths } from 'expo-file-system';
import { router } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { View } from 'react-native';

import { track } from '@/core';
import { authService, useAuthStore } from '@/features/auth';
import { useTranslation } from '@/i18n';
import { Card, ListItem, Modal, SectionHeader, useTheme, useToast } from '@/ui';

/** Account status + sign in/out, data export and account deletion (store requirement). */
export function AccountSection() {
  const { t } = useTranslation();
  const { spacing } = useTheme();
  const toast = useToast();
  const user = useAuthStore((s) => s.user);
  const [confirm, setConfirm] = useState<null | 'signOut' | 'delete'>(null);
  const [busy, setBusy] = useState(false);
  const isGuest = !user || user.isGuest;

  const exportData = async () => {
    const r = await authService.exportData();
    if (!r.ok) return toast.show({ message: r.error.message, kind: 'error' });
    const file = new File(
      Paths.cache,
      `formfit-export-${new Date().toISOString().slice(0, 10)}.json`,
    );
    await file.write(JSON.stringify(r.value, null, 2));
    if (await Sharing.isAvailableAsync())
      await Sharing.shareAsync(file.uri, { mimeType: 'application/json' });
    track('data_exported', {});
    toast.show({ message: t('account.exportDone'), kind: 'success' });
  };

  const run = async (action: 'signOut' | 'delete') => {
    setBusy(true);
    const r = action === 'delete' ? await authService.deleteAccount() : await authService.signOut();
    setBusy(false);
    setConfirm(null);
    if (!r.ok) return toast.show({ message: r.error.message, kind: 'error' });
    if (action === 'delete') {
      track('account_deleted', {});
      toast.show({ message: t('account.deleted'), kind: 'success' });
    }
  };

  return (
    <View style={{ gap: spacing[3] }}>
      <SectionHeader title={t('account.title')} />
      <Card padding={2}>
        <ListItem
          icon={isGuest ? 'person-outline' : 'person-circle-outline'}
          title={
            isGuest ? t('account.guest') : t('account.signedInAs', { email: user?.email ?? '' })
          }
          subtitle={isGuest ? t('account.guestSubtitle') : undefined}
        />
        {isGuest ? (
          <ListItem
            testID="create-account"
            icon="cloud-upload-outline"
            title={t('account.createAccount')}
            onPress={() => router.push('/auth/sign-in')}
          />
        ) : null}
        <ListItem
          testID="export-data"
          icon="download-outline"
          title={t('account.export')}
          onPress={exportData}
        />
        {user ? (
          <ListItem
            icon="log-out-outline"
            title={t('account.signOut')}
            onPress={() => setConfirm('signOut')}
          />
        ) : null}
        {user ? (
          <ListItem
            testID="delete-account"
            icon="trash-outline"
            title={t('account.delete')}
            destructive
            onPress={() => setConfirm('delete')}
          />
        ) : null}
      </Card>
      <Modal
        testID="account-confirm"
        visible={confirm !== null}
        onClose={() => (busy ? undefined : setConfirm(null))}
        title={confirm === 'delete' ? t('account.deleteTitle') : t('account.signOutTitle')}
        message={
          confirm === 'delete'
            ? t('account.deleteMessage')
            : isGuest
              ? t('account.signOutGuestMessage')
              : t('account.signOutMessage')
        }
        confirmLabel={confirm === 'delete' ? t('account.deleteConfirm') : t('account.signOut')}
        cancelLabel={t('common.cancel')}
        destructive
        onConfirm={() => confirm && void run(confirm)}
      />
    </View>
  );
}

import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Platform, View } from 'react-native';

import { env, isBackendConfigured, track } from '@/core';
import { authService, useAuthStore } from '@/features/auth';
import { useTranslation } from '@/i18n';
import { Button, Icon, PressableScale, Screen, Text, TextField, useTheme, useToast } from '@/ui';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function SignInScreen() {
  const { t } = useTranslation();
  const { colors, spacing, radii, hitTarget, scheme } = useTheme();
  const toast = useToast();
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [upgrade, setUpgrade] = useState(false);
  const [busy, setBusy] = useState<null | 'email' | 'code' | 'google' | 'apple' | 'guest'>(null);
  const [error, setError] = useState<string | null>(null);
  const [appleAvailable, setAppleAvailable] = useState(false);
  const backend = isBackendConfigured();

  useEffect(() => {
    if (Platform.OS === 'ios') void AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  const done = () => {
    const u = useAuthStore.getState().user;
    if (u) track('account_signed_in', { provider: u.provider, upgraded_guest: upgrade });
    toast.show({ message: t('auth.welcome'), kind: 'success' });
    router.back();
  };
  const fail = (message: string) => {
    setError(message);
    toast.show({ message, kind: 'error' });
  };

  const sendCode = async () => {
    if (!EMAIL_RE.test(email.trim())) return setError(t('auth.invalidEmail'));
    setError(null);
    setBusy('email');
    const r = await authService.sendEmailCode(email.trim());
    setBusy(null);
    if (!r.ok) return fail(r.error.message);
    setUpgrade(r.value.upgrade);
    setStep('code');
  };

  const verify = async () => {
    if (!/^\d{6}$/.test(code.trim())) return setError(t('auth.invalidCode'));
    setError(null);
    setBusy('code');
    const r = await authService.verifyEmailCode(email.trim(), code, upgrade);
    setBusy(null);
    return r.ok ? done() : fail(r.error.message);
  };

  const google = async () => {
    const webClientId = env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    if (!webClientId) return fail(t('auth.unavailable'));
    setBusy('google');
    const r = await authService.signInWithGoogle(webClientId, env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID);
    setBusy(null);
    return r.ok ? done() : fail(r.error.message);
  };

  const apple = async () => {
    setBusy('apple');
    const r = await authService.signInWithApple();
    setBusy(null);
    return r.ok ? done() : fail(r.error.message);
  };

  const guest = async () => {
    setBusy('guest');
    await authService.continueAsGuest();
    setBusy(null);
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Screen testID="sign-in-screen" edges={['top', 'bottom']}>
        <PressableScale
          accessibilityLabel={t('common.close')}
          onPress={() => router.back()}
          style={{
            width: hitTarget,
            height: hitTarget,
            borderRadius: radii.pill,
            backgroundColor: colors.surface,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Icon name="close" />
        </PressableScale>
        <View style={{ gap: spacing[2] }}>
          <Text variant="displayM" accessibilityRole="header">
            {t('auth.title')}
          </Text>
          <Text variant="body" color="textMuted">
            {backend ? t('auth.subtitle') : t('auth.unavailable')}
          </Text>
        </View>

        {backend ? (
          <View style={{ gap: spacing[3] }}>
            {appleAvailable ? (
              <AppleAuthentication.AppleAuthenticationButton
                buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
                buttonStyle={
                  scheme === 'dark'
                    ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
                    : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
                }
                cornerRadius={radii.pill}
                style={{ height: hitTarget + 4 }}
                onPress={apple}
              />
            ) : null}
            <Button
              label={t('auth.google')}
              icon="logo-google"
              variant="secondary"
              fullWidth
              loading={busy === 'google'}
              onPress={google}
            />
            <Text variant="caption" color="textSubtle" align="center">
              {t('auth.or')}
            </Text>
            {step === 'email' ? (
              <>
                <TextField
                  testID="email-input"
                  label={t('auth.email')}
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  returnKeyType="send"
                  onSubmitEditing={sendCode}
                  error={error}
                />
                <Button
                  testID="send-code"
                  label={t('auth.sendCode')}
                  fullWidth
                  loading={busy === 'email'}
                  onPress={sendCode}
                />
              </>
            ) : (
              <>
                <TextField
                  testID="code-input"
                  label={t('auth.code')}
                  hint={t('auth.codeHint', { email })}
                  value={code}
                  onChangeText={setCode}
                  keyboardType="number-pad"
                  textContentType="oneTimeCode"
                  autoComplete="one-time-code"
                  maxLength={6}
                  error={error}
                  onSubmitEditing={verify}
                />
                <Button
                  testID="verify-code"
                  label={t('auth.verify')}
                  fullWidth
                  loading={busy === 'code'}
                  onPress={verify}
                />
                <Button label={t('auth.resend')} variant="ghost" onPress={sendCode} />
              </>
            )}
          </View>
        ) : null}

        <View style={{ gap: spacing[1] }}>
          <Button
            testID="continue-guest"
            label={t('auth.guest')}
            variant="ghost"
            loading={busy === 'guest'}
            onPress={guest}
          />
          <Text variant="caption" color="textSubtle" align="center">
            {t('auth.guestHint')}
          </Text>
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}

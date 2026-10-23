import { useState } from 'react';
import { TextInput, View, type TextInputProps } from 'react-native';

import { useTheme } from '../theme/ThemeProvider';
import { Text } from './Text';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string | null;
  hint?: string;
}

/** Labelled text input with focus ring and error message (announced to screen readers). */
export function TextField({ label, error, hint, ...input }: TextFieldProps) {
  const { colors, radii, spacing, typography, hitTarget } = useTheme();
  const [focused, setFocused] = useState(false);
  return (
    <View style={{ gap: spacing[1] }}>
      <Text variant="label" color="textMuted">
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor={colors.textSubtle}
        selectionColor={colors.accent}
        {...input}
        onFocus={(e) => {
          setFocused(true);
          input.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          input.onBlur?.(e);
        }}
        style={{
          minHeight: hitTarget + 4,
          paddingHorizontal: spacing[4],
          borderRadius: radii.md,
          borderWidth: focused ? 2 : 1,
          borderColor: error ? colors.danger : focused ? colors.accent : colors.borderStrong,
          backgroundColor: colors.surface,
          color: colors.text,
          fontFamily: typography.bodyL.fontFamily,
          fontSize: typography.bodyL.fontSize,
        }}
      />
      {error ? (
        <Text variant="caption" color="dangerText" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="textSubtle">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

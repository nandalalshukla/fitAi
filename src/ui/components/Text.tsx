import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import type { ColorTokens } from '../theme/colors';
import { useTheme } from '../theme/ThemeProvider';
import type { TypographyVariant } from '../theme/typography';

export interface TextProps extends RNTextProps {
  variant?: TypographyVariant;
  color?: keyof ColorTokens;
  align?: 'left' | 'center' | 'right';
}

export function Text({ variant = 'body', color = 'text', align, style, ...rest }: TextProps) {
  const theme = useTheme();
  const { maxFontSizeMultiplier, ...type } = theme.typography[variant];
  return (
    <RNText
      maxFontSizeMultiplier={maxFontSizeMultiplier ?? 1.6}
      {...rest}
      style={[type, { color: theme.colors[color], textAlign: align }, style]}
    />
  );
}

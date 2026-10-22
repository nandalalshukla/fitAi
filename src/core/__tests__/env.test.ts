import { isBackendConfigured, parseEnv } from '../env';

describe('parseEnv', () => {
  it('treats blank values as unset', () => {
    expect(parseEnv({ EXPO_PUBLIC_SUPABASE_URL: '  ' })).toEqual({});
  });

  it('accepts valid values', () => {
    const env = parseEnv({
      EXPO_PUBLIC_SUPABASE_URL: 'https://abc.supabase.co',
      EXPO_PUBLIC_SUPABASE_ANON_KEY: 'anon',
    });
    expect(isBackendConfigured(env)).toBe(true);
  });

  it('throws in dev for malformed URLs', () => {
    expect(() => parseEnv({ EXPO_PUBLIC_SUPABASE_URL: 'not a url' })).toThrow(
      /Invalid environment/,
    );
  });
});

// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');
const prettierRecommended = require('eslint-plugin-prettier/recommended');

module.exports = defineConfig([
  expoConfig,
  prettierRecommended,
  {
    ignores: ['dist/*', 'node_modules/*', '.expo/*', 'android/*', 'ios/*', 'coverage/*'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': ['warn', { prefer: 'type-imports' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
    },
  },
  {
    // Jest setup/mocks legitimately use require() inside jest.mock factories.
    files: ['jest.setup.tsx', 'jest/**/*.js', '**/__mocks__/**'],
    rules: { '@typescript-eslint/no-require-imports': 'off' },
  },
  {
    // Design-system rule: feature code and routes must use theme tokens, not raw hex colors.
    files: ['app/**/*.tsx', 'src/features/**/*.tsx'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: 'Literal[value=/^#[0-9a-fA-F]{3,8}$/]',
          message: 'Use theme color tokens from @/ui instead of hard-coded hex colors.',
        },
      ],
    },
  },
]);

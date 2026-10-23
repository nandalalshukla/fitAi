/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  resolver: '<rootDir>/jest/resolver.js',
  moduleNameMapper: {
    '\\.(tflite)$': '<rootDir>/jest/fileStub.js',
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.tsx'],
  // backend/supabase/tests run under Node's test runner (npm run test:db).
  testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/backend/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|react-native-svg|react-native-reanimated|react-native-worklets|standard-navigation)',
  ],
  collectCoverageFrom: ['src/**/*.{ts,tsx}', '!src/**/*.d.ts', '!src/**/index.ts'],
};

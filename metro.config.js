// Learn more https://docs.expo.dev/guides/customizing-metro
// Sentry's Expo config adds debug IDs to bundles so crash stack traces map to source.
const { getSentryExpoConfig } = require('@sentry/react-native/metro');

const config = getSentryExpoConfig(__dirname);

// Bundle TFLite pose models as assets (offline-first, see docs/POSE_MODELS.md).
config.resolver.assetExts.push('tflite');

module.exports = config;

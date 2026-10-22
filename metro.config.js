// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Bundle TFLite pose models as assets (offline-first, see docs/POSE_MODELS.md).
config.resolver.assetExts.push('tflite');

module.exports = config;

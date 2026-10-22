import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Dynamic Expo config. Build-time values (bundle IDs, EAS project ID) come from
 * env so they never need to be hard-coded per environment. See `.env.example`.
 */
const APP_VARIANT = process.env.APP_VARIANT ?? 'production';
const IS_DEV = APP_VARIANT === 'development';
const IS_PREVIEW = APP_VARIANT === 'preview';

const BASE_ID = process.env.APP_BUNDLE_ID ?? 'com.formfit.app';
const bundleId = IS_DEV ? `${BASE_ID}.dev` : IS_PREVIEW ? `${BASE_ID}.preview` : BASE_ID;
const appName = IS_DEV ? 'FormFit (Dev)' : IS_PREVIEW ? 'FormFit (Preview)' : 'FormFit';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: appName,
  slug: 'formfit',
  scheme: 'formfit',
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  backgroundColor: '#0B0D10',
  ios: {
    bundleIdentifier: bundleId,
    supportsTablet: true,
    infoPlist: {
      NSCameraUsageDescription:
        'FormFit uses the camera to count your reps and check your form. Video is processed on your device and is never recorded or uploaded.',
    },
  },
  android: {
    package: bundleId,
    adaptiveIcon: {
      backgroundColor: '#0B0D10',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
    permissions: ['android.permission.CAMERA'],
    // The camera library must never record audio or ask for the microphone.
    blockedPermissions: ['android.permission.RECORD_AUDIO'],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-localization',
    [
      'react-native-fast-tflite',
      {
        // Hardware acceleration for pose models (falls back to CPU automatically).
        enableCoreMLDelegate: true,
        enableAndroidGpuLibraries: true,
      },
    ],
    [
      'expo-splash-screen',
      {
        image: './assets/splash-icon.png',
        imageWidth: 160,
        resizeMode: 'contain',
        backgroundColor: '#0B0D10',
      },
    ],
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    appVariant: APP_VARIANT,
    eas: process.env.EAS_PROJECT_ID ? { projectId: process.env.EAS_PROJECT_ID } : undefined,
  },
});

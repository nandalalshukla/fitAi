import type { ConfigContext, ExpoConfig } from 'expo/config';

import pkg from './package.json';

/**
 * Dynamic Expo config. Build-time values (bundle IDs, EAS project ID) come from
 * env so they never need to be hard-coded per environment. See `.env.example`.
 */
const APP_VARIANT = process.env.APP_VARIANT ?? 'production';
const IS_DEV = APP_VARIANT === 'development';
const IS_PREVIEW = APP_VARIANT === 'preview';

const BASE_ID = process.env.APP_BUNDLE_ID ?? 'com.formfit.app';
const bundleId = IS_DEV ? `${BASE_ID}.dev` : IS_PREVIEW ? `${BASE_ID}.preview` : BASE_ID;
// Google Sign-In needs the reversed iOS client ID as a URL scheme; only added when configured.
const GOOGLE_IOS_URL_SCHEME = process.env.GOOGLE_IOS_URL_SCHEME;
// Sentry source-map upload at build time (auth token is an EAS secret, never bundled).
const SENTRY_ORG = process.env.SENTRY_ORG;
const SENTRY_PROJECT = process.env.SENTRY_PROJECT;
const appName = IS_DEV ? 'FormFit (Dev)' : IS_PREVIEW ? 'FormFit (Preview)' : 'FormFit';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: appName,
  slug: 'formfit',
  scheme: 'formfit',
  // Single source of truth for the marketing version; build numbers are managed by EAS
  // (`appVersionSource: remote`, auto-incremented on production builds).
  version: pkg.version,
  // Locked to portrait in code; the workout player unlocks rotation (phone sideways on the floor).
  orientation: 'default',
  icon: './assets/icon.png',
  userInterfaceStyle: 'automatic',
  backgroundColor: '#0B0D10',
  ios: {
    bundleIdentifier: bundleId,
    supportsTablet: true,
    usesAppleSignIn: true,
    // HTTPS + standard OS crypto only: exempt from US export documentation.
    config: { usesNonExemptEncryption: false },
    privacyManifests: {
      NSPrivacyTracking: false,
      NSPrivacyTrackingDomains: [],
      NSPrivacyCollectedDataTypes: [
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeFitness',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeEmailAddress',
          NSPrivacyCollectedDataTypeLinked: true,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeCrashData',
          NSPrivacyCollectedDataTypeLinked: false,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAppFunctionality'],
        },
        {
          NSPrivacyCollectedDataType: 'NSPrivacyCollectedDataTypeProductInteraction',
          NSPrivacyCollectedDataTypeLinked: false,
          NSPrivacyCollectedDataTypeTracking: false,
          NSPrivacyCollectedDataTypePurposes: ['NSPrivacyCollectedDataTypePurposeAnalytics'],
        },
      ],
      NSPrivacyAccessedAPITypes: [
        {
          // MMKV / AsyncStorage-style app preferences.
          NSPrivacyAccessedAPIType: 'NSPrivacyAccessedAPICategoryUserDefaults',
          NSPrivacyAccessedAPITypeReasons: ['CA92.1'],
        },
      ],
    },
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
    // Workout history stays out of OS cloud backups; it syncs through the account instead.
    allowBackup: false,
    permissions: ['android.permission.CAMERA'],
    // The camera library must never record audio or ask for the microphone.
    blockedPermissions: [
      'android.permission.RECORD_AUDIO',
      'android.permission.READ_EXTERNAL_STORAGE',
      'android.permission.WRITE_EXTERNAL_STORAGE',
      'android.permission.SYSTEM_ALERT_WINDOW',
    ],
  },
  web: {
    favicon: './assets/favicon.png',
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-localization',
    [
      'expo-build-properties',
      {
        // R8 code shrinking + resource shrinking for smaller, obfuscated release APKs/AABs.
        android: {
          enableMinifyInReleaseBuilds: true,
          enableShrinkResourcesInReleaseBuilds: true,
          // Nitro modules (camera, TFLite, MMKV, image) are created from C++ via JNI and
          // ship no consumer rules: keep them from being stripped/renamed by R8.
          extraProguardRules: [
            '-keep class com.margelo.nitro.** { *; }',
            '-keep class com.madebyevan.thumbhash.** { *; }',
            '-keepclassmembers class * { @com.facebook.proguard.annotations.DoNotStrip *; }',
          ].join('\n'),
        },
      },
    ],
    'expo-screen-orientation',
    'expo-sqlite',
    'expo-secure-store',
    'expo-apple-authentication',
    ['expo-notifications', { color: '#C6FF3D' }],
    ...(SENTRY_ORG && SENTRY_PROJECT
      ? [
          ['@sentry/react-native/expo', { organization: SENTRY_ORG, project: SENTRY_PROJECT }] as [
            string,
            unknown,
          ],
        ]
      : []),
    ...(GOOGLE_IOS_URL_SCHEME
      ? [
          [
            '@react-native-google-signin/google-signin',
            { iosUrlScheme: GOOGLE_IOS_URL_SCHEME },
          ] as [string, unknown],
        ]
      : []),
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

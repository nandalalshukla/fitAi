# audio-focus (local Expo module)

Android-only: `requestDuck()` takes transient "may duck" audio focus (navigation-guidance
attributes) so other apps' music is lowered while the FormFit voice coach speaks; `abandon()`
releases it. Autolinked from `./modules` by Expo. iOS ducking is handled by expo-speech's own
speech session, so this module has no iOS part. See `docs/VOICE.md`.

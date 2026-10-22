# i18n

i18next + react-i18next. `locales/en.ts` is the typed source of truth; add a language by creating
`locales/<code>.ts` with the same shape (`TranslationShape`) and registering it in `index.ts`.
Spoken voice cues will live under `cues.*` so they are translated with the rest of the UI.

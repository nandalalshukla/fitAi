# features

One folder per product feature (`auth`, `onboarding`, `plans`, `workout-session`, `pose`,
`exercises`, `voice`, `history`, `settings`, `shell`). Each exposes a small public surface; pure
domain logic lives in a `domain/` subfolder with no React imports.

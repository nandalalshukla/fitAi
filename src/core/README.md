# core

Cross-cutting infrastructure with no feature knowledge: env parsing, logging,
typed errors (`Result`), feature flags, the analytics interface and the service
locator used for dependency injection. Nothing here imports from `features/`.

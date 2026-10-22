/** Privacy-respecting analytics interface. No PII, no media, opt-out respected. */
export type AnalyticsProps = Record<string, string | number | boolean | null>;

export interface Analytics {
  track(event: string, props?: AnalyticsProps): void;
  screen(name: string, props?: AnalyticsProps): void;
  identify(anonymousId: string): void;
  reset(): void;
  setEnabled(enabled: boolean): void;
}

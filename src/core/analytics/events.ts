import { getService } from '../services';

/**
 * The complete analytics event taxonomy. Properties are coarse and non-personal
 * (no names, emails, free text, health data beyond counts). Adding an event = adding it here.
 */
export interface AnalyticsEvents {
  onboarding_completed: { goal: string; level: string; plan: string; reminders: boolean };
  plan_enrolled: { plan: string; switched: boolean };
  workout_started: {
    mode: 'plan' | 'free';
    plan: string | null;
    camera: boolean;
    resumed: boolean;
  };
  workout_finished: {
    status: 'completed' | 'abandoned';
    sets: number;
    reps: number;
    minutes: number;
    camera_sets: number;
  };
  rest_day_completed: { plan: string };
  account_signed_in: { provider: string; upgraded_guest: boolean };
  account_deleted: Record<string, never>;
  data_exported: Record<string, never>;
  reminders_changed: { daily: boolean; streak: boolean };
  camera_unavailable: { reason: 'permission' | 'model' };
}

export function track<E extends keyof AnalyticsEvents>(event: E, props: AnalyticsEvents[E]): void {
  getService('analytics').track(event, props as Record<string, string | number | boolean | null>);
}

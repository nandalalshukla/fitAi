import { useQuery } from '@tanstack/react-query';

import type { PlanEnrollment, Profile, WorkoutSession, WorkoutSet } from './models';
import { getDataRuntime } from './runtime';

/**
 * TanStack Query bindings over the local repositories. Keys always include the
 * user id so switching accounts never shows another user's cached data.
 */
export const queryKeys = {
  all: (userId: string | null) => ['user', userId] as const,
  profile: (userId: string | null) => ['user', userId, 'profile'] as const,
  enrollment: (userId: string | null) => ['user', userId, 'enrollment'] as const,
  inProgress: (userId: string | null) => ['user', userId, 'inProgress'] as const,
  sessions: (userId: string | null) => ['user', userId, 'sessions'] as const,
  sets: (userId: string | null) => ['user', userId, 'sets'] as const,
  session: (id: string) => ['session', id] as const,
};

const repos = () => getDataRuntime().repos;

export function useProfileQuery(userId: string | null) {
  return useQuery<Profile | null>({
    queryKey: queryKeys.profile(userId),
    queryFn: () => (userId ? repos().profiles.get(userId) : Promise.resolve(null)),
  });
}

export function useEnrollmentQuery(userId: string | null) {
  return useQuery<PlanEnrollment | null>({
    queryKey: queryKeys.enrollment(userId),
    queryFn: () => (userId ? repos().plans.getActive(userId) : Promise.resolve(null)),
  });
}

export function useInProgressSessionQuery(userId: string | null) {
  return useQuery<WorkoutSession | null>({
    queryKey: queryKeys.inProgress(userId),
    queryFn: () => (userId ? repos().workouts.getInProgress(userId) : Promise.resolve(null)),
  });
}

/** All sessions (any status) of the user, newest first. History is small: one row per workout. */
export function useSessionsQuery(userId: string | null) {
  return useQuery<WorkoutSession[]>({
    queryKey: queryKeys.sessions(userId),
    queryFn: () =>
      userId
        ? repos().workouts.listSessions(
            userId,
            '1970-01-01T00:00:00.000Z',
            '9999-12-31T00:00:00.000Z',
          )
        : Promise.resolve([]),
  });
}

export function useSetsQuery(userId: string | null) {
  return useQuery<WorkoutSet[]>({
    queryKey: queryKeys.sets(userId),
    queryFn: () => (userId ? repos().workouts.allSets(userId) : Promise.resolve([])),
  });
}

export function useSessionQuery(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.session(id ?? ''),
    enabled: Boolean(id),
    queryFn: async () => {
      const session = await repos().workouts.getSession(id!);
      return session ? { session, sets: await repos().workouts.getSets(id!) } : null;
    },
  });
}

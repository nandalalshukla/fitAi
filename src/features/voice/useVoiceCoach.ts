import { useEffect } from 'react';
import { AppState } from 'react-native';

import { getVoiceCoach } from './voiceCoachInstance';

/**
 * Returns the app voice coach and pauses it while the app is in the background
 * (calls, app switch) so it never talks over a phone call or after leaving.
 */
export function useVoiceCoach() {
  const coach = getVoiceCoach();
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') coach.resume();
      else coach.pause();
    });
    return () => sub.remove();
  }, [coach]);
  return coach;
}

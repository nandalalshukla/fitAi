import { File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useCallback, useRef, useState } from 'react';
import { useAnimatedReaction, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { logger } from '@/core';
import type { Pose } from '@/features/pose/domain/types';

import type { Difficulty, ExerciseId } from '../domain/types';
import { encodePose, FIXTURE_VERSION, type PoseFixture } from '../replay/fixture';

/**
 * DEV ONLY: records live poses into a replay fixture (same format as the
 * synthetic ones) and opens the share sheet so the file can be added to
 * src/features/exercises/replay/__fixtures__ with hand-filled expectations.
 */
export function usePoseRecorder(pose: SharedValue<Pose | null>) {
  const [recording, setRecording] = useState(false);
  const frames = useRef<number[][]>([]);
  const frameSize = useRef({ width: 0, height: 0 });
  const t0 = useRef(0);

  const onPose = useCallback((p: Pose | null) => {
    const t = (p?.timestamp ?? Date.now()) - t0.current;
    if (p) frameSize.current = { width: p.frameWidth, height: p.frameHeight };
    frames.current.push(encodePose(p, t));
  }, []);

  useAnimatedReaction(
    () => pose.get(),
    (p, prev) => {
      if (recording && p !== prev) scheduleOnRN(onPose, p);
    },
    [recording],
  );

  const start = useCallback(() => {
    frames.current = [];
    t0.current = Date.now();
    setRecording(true);
  }, []);

  const stop = useCallback(async (exercise: ExerciseId, difficulty: Difficulty) => {
    setRecording(false);
    const rows = frames.current;
    if (rows.length === 0) return null;
    const first = rows[0]?.[0] ?? 0;
    const duration = ((rows[rows.length - 1]?.[0] ?? 0) - first) / 1000;
    const fixture: PoseFixture = {
      version: FIXTURE_VERSION,
      name: `device_${exercise}_${new Date().toISOString().replace(/[:.]/g, '-')}`,
      description:
        'Recorded in the Pose lab. Fill in `expect` (e.g. the real rep count) before committing.',
      source: 'device',
      exercise,
      options: { difficulty },
      frame: frameSize.current,
      fps: Math.round(rows.length / Math.max(duration, 1e-3)),
      expect: {},
      frames: rows.map((r) => [(r[0] ?? 0) - first, ...r.slice(1)]),
    };
    try {
      const file = new File(Paths.document, `${fixture.name}.json`);
      await file.write(JSON.stringify(fixture));
      if (await Sharing.isAvailableAsync())
        await Sharing.shareAsync(file.uri, { mimeType: 'application/json' });
      return file.uri;
    } catch (e) {
      logger.error('Failed to save pose recording', { error: String(e) });
      return null;
    }
  }, []);

  return { recording, start, stop };
}

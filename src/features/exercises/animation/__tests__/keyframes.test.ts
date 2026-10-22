import { KEYPOINT_COUNT, KP } from '@/features/pose/domain/keypoints';
import type { Skeleton } from '@/features/pose/domain/skeleton';

import { getExercise } from '../../domain/registry';
import { resolveThresholds } from '../../domain/thresholds';
import type { RepThresholds } from '../../domain/types';
import { forwardKinematics, project, PROPORTIONS, type Vec3 } from '../body3d';
import { bodyAt, poseAt, stepAt } from '../interpolate';
import { ANIMATIONS } from '../keyframes/library';

const dist = (a: Vec3, b: Vec3) => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);

/** Projects an animation frame into a skeleton (px) the exercise features understand. */
function skeletonAt(id: keyof typeof ANIMATIONS, t: number): Skeleton {
  const anim = ANIMATIONS[id];
  const pr = project(bodyAt(anim, t), { yawDeg: anim.yawDeg });
  return {
    x: pr.x.map((v) => v * 300),
    y: pr.y.map((v) => v * 300),
    score: Array<number>(KEYPOINT_COUNT).fill(0.95),
    t: 0,
  };
}

describe.each(Object.values(ANIMATIONS).map((a) => [a.id, a] as const))(
  '%s keyframes',
  (id, anim) => {
    it('are ordered, span 0..1 and loop perfectly', () => {
      const kf = anim.keyframes;
      expect(kf[0]!.t).toBe(0);
      expect(kf[kf.length - 1]!.t).toBe(1);
      kf.slice(1).forEach((k, i) => expect(k.t).toBeGreaterThanOrEqual(kf[i]!.t));
      expect(kf[kf.length - 1]!.pose).toEqual(kf[0]!.pose);
      expect(poseAt(anim, 0)).toEqual(poseAt(anim, 1));
    });

    it('keep limb lengths constant (rigid skeleton)', () => {
      for (let i = 0; i <= 20; i++) {
        const b = forwardKinematics(poseAt(anim, i / 20));
        expect(dist(b[KP.left_hip]!, b[KP.left_knee]!)).toBeCloseTo(PROPORTIONS.thigh, 6);
        expect(dist(b[KP.right_knee]!, b[KP.right_ankle]!)).toBeCloseTo(PROPORTIONS.shin, 6);
        expect(dist(b[KP.left_shoulder]!, b[KP.left_elbow]!)).toBeCloseTo(PROPORTIONS.upperArm, 6);
        expect(dist(b[KP.right_elbow]!, b[KP.right_wrist]!)).toBeCloseTo(PROPORTIONS.forearm, 6);
      }
    });

    it('stay within anatomical joint ranges', () => {
      for (const { pose } of anim.keyframes) {
        for (const l of [pose.left, pose.right]) {
          expect(l.knee).toBeGreaterThanOrEqual(0);
          expect(l.knee).toBeLessThanOrEqual(150);
          expect(l.elbow).toBeGreaterThanOrEqual(0);
          expect(l.elbow).toBeLessThanOrEqual(155);
          expect(l.hipAbd).toBeGreaterThanOrEqual(-20);
          expect(l.hipAbd).toBeLessThanOrEqual(45);
          expect(l.shoulderAbd).toBeGreaterThanOrEqual(0);
          expect(l.shoulderAbd).toBeLessThanOrEqual(180);
          // Hip flexion relative to the torso (0 = thigh in line with the torso): -35° extension .. 145° flexion.
          const rel = l.hipFlex + pose.torsoPitch;
          expect(rel).toBeGreaterThanOrEqual(-35);
          expect(rel).toBeLessThanOrEqual(145);
        }
        expect(Math.abs(pose.headFlex)).toBeLessThanOrEqual(45);
      }
    });

    it('start and peak keyframes land inside the rep-counter thresholds', () => {
      const def = getExercise(id);
      const view = anim.yawDeg === 0 ? 'front' : 'side';
      const th = resolveThresholds(def.thresholds, 'intermediate', view);
      const features = (t: number) => {
        const s = skeletonAt(id, t);
        const torso = Math.hypot(
          s.x[KP.left_shoulder]! - s.x[KP.left_hip]!,
          s.y[KP.left_shoulder]! - s.y[KP.left_hip]!,
        );
        return def.features({ skeleton: s, side: 'left', view, torso }, th);
      };
      if (def.mode === 'hold') {
        expect(def.hold!.inPosition(features(0), th)).toBe(true);
        return;
      }
      const cfg = def.counter!;
      const r = th as unknown as RepThresholds;
      const dir = cfg.peakWhen === 'below' ? -1 : 1;
      const start = features(0);
      const peakT = anim.peakT;
      const peakVals = cfg.signals.map((s) => features(peakT)[s] ?? NaN);
      const peakOther = cfg.signals.map((s) => features(peakT + 0.5)[s] ?? NaN);
      for (const s of cfg.signals) expect(((start[s] ?? NaN) - r.start) * dir).toBeLessThan(0);
      // At least one signal reaches the peak at peakT (alternating: the other half of the loop).
      const best = Math.max(...[...peakVals, ...peakOther].map((v) => (v - r.peak) * dir));
      expect(best).toBeGreaterThanOrEqual(0);
    });

    it('maps loop time to instruction steps', () => {
      expect(stepAt(anim, 0)).toBe(anim.keyframes[0]!.step);
      // Within one loop steps never go backwards (t = 1 wraps to the start).
      for (let i = 1; i < 10; i++)
        expect(stepAt(anim, i / 10)).toBeGreaterThanOrEqual(stepAt(anim, (i - 1) / 10));
    });
  },
);

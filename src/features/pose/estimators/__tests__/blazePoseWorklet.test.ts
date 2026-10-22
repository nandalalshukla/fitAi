import fixture from '../../domain/__fixtures__/blazepose-astronaut.json';
import { BLAZEPOSE_ANCHOR_COUNT } from '../../domain/anchors';
import type { FrameDesc } from '../../domain/frame';
import { BLAZEPOSE_TO_CANONICAL } from '../../domain/keypoints';
import { createBlazePoseWorklet, type RunnableModel } from '../blazePoseEstimator';
import { createMoveNetWorklet } from '../moveNetEstimator';

jest.mock('react-native-fast-tflite', () => ({ loadTensorflowModel: jest.fn() }));

const { width: W, height: H } = fixture.image;
const desc: FrameDesc = {
  width: W,
  height: H,
  bytesPerRow: W * 4,
  bytesPerPixel: 4,
  channelOrder: 'bgra',
  orientation: 'up',
  mirrored: false,
};
const frame = { pixels: new Uint8Array(W * H * 4), desc, timestamp: 1 };

const buf = (a: Float32Array) => a.buffer as ArrayBuffer;

function fakeDetector(): RunnableModel & { calls: number } {
  const boxes = new Float32Array(BLAZEPOSE_ANCHOR_COUNT * 12);
  const scores = new Float32Array(BLAZEPOSE_ANCHOR_COUNT).fill(-10);
  boxes.set(fixture.detector.rawBox, fixture.detector.bestIndex * 12);
  const p = fixture.detector.score;
  scores[fixture.detector.bestIndex] = Math.log(p / (1 - p));
  const m = {
    calls: 0,
    runSync(input: ArrayBuffer[]) {
      m.calls++;
      expect(input[0]!.byteLength).toBe(224 * 224 * 3 * 4);
      return [buf(boxes), buf(scores)];
    },
  };
  return m;
}

function fakeLandmarks(presence: () => number): RunnableModel {
  return {
    runSync(input: ArrayBuffer[]) {
      expect(input[0]!.byteLength).toBe(256 * 256 * 3 * 4);
      return [buf(Float32Array.from(fixture.landmarks.raw)), buf(Float32Array.of(presence()))];
    },
  };
}

describe('BlazePose estimate worklet', () => {
  it('detects, decodes landmarks, then tracks without re-running the detector', () => {
    const detector = fakeDetector();
    let presence = fixture.landmarks.poseFlag;
    const estimate = createBlazePoseWorklet({
      detector,
      landmarks: fakeLandmarks(() => presence),
      boxesOut: 0,
      scoresOut: 1,
      landmarksOut: 0,
      presenceOut: 1,
    });

    const pose = estimate(frame);
    expect(pose).not.toBeNull();
    expect(pose!.frameWidth).toBe(W);
    expect(pose!.score).toBeCloseTo(fixture.landmarks.poseFlag, 5);
    BLAZEPOSE_TO_CANONICAL.forEach((src, k) => {
      expect(pose!.points[k * 3]).toBeCloseTo(fixture.landmarks.expected[src]!.x, 3);
      expect(pose!.points[k * 3 + 1]).toBeCloseTo(fixture.landmarks.expected[src]!.y, 3);
    });
    expect(detector.calls).toBe(1);

    estimate({ ...frame, timestamp: 2 });
    expect(detector.calls).toBe(1); // tracked via ROI from previous landmarks

    presence = 0.1; // person left the frame
    expect(estimate({ ...frame, timestamp: 3 })).toBeNull();
    presence = 0.99;
    estimate({ ...frame, timestamp: 4 });
    expect(detector.calls).toBe(2); // re-detected after losing track
  });

  it('returns null when the detector finds nobody', () => {
    const estimate = createBlazePoseWorklet({
      detector: {
        runSync: () => [
          buf(new Float32Array(BLAZEPOSE_ANCHOR_COUNT * 12)),
          buf(new Float32Array(BLAZEPOSE_ANCHOR_COUNT).fill(-8)),
        ],
      },
      landmarks: fakeLandmarks(() => 1),
      boxesOut: 0,
      scoresOut: 1,
      landmarksOut: 0,
      presenceOut: 1,
    });
    expect(estimate(frame)).toBeNull();
  });
});

describe('BlazePose native preprocessing path', () => {
  it('routes frames through the preprocessing graphs and feeds their output to the networks', () => {
    const detector = fakeDetector();
    const detTensor = new Float32Array(224 * 224 * 3).buffer as ArrayBuffer;
    const lmTensor = new Float32Array(256 * 256 * 3).buffer as ArrayBuffer;
    const calls: { n: number; params: Float32Array; stagingBytes: number }[] = [];
    const pre = (n: number, outBuf: ArrayBuffer): RunnableModel => ({
      runSync(input) {
        calls.push({
          n,
          params: new Float32Array(input[1]!.slice(0)),
          stagingBytes: input[0]!.byteLength,
        });
        return [outBuf];
      },
    });
    const landmarks: RunnableModel = {
      runSync(input) {
        expect(input[0]).toBe(lmTensor); // graph output passed straight through
        return [buf(Float32Array.from(fixture.landmarks.raw)), buf(Float32Array.of(0.99))];
      },
    };
    const estimate = createBlazePoseWorklet({
      detector: {
        runSync(input) {
          expect(input[0]).toBe(detTensor);
          return detector.runSync([new Float32Array(224 * 224 * 3).buffer as ArrayBuffer]);
        },
      },
      landmarks,
      preprocess224: pre(224, detTensor),
      preprocess256: pre(256, lmTensor),
      boxesOut: 0,
      scoresOut: 1,
      landmarksOut: 0,
      presenceOut: 1,
    });

    const pose = estimate(frame);
    expect(pose).not.toBeNull();
    expect(calls.map((c) => c.n)).toEqual([224, 256]);
    expect(calls[0]!.stagingBytes).toBe(1280 * 960 * 4);
    // Detector: [-1, 1] normalization; landmarks: [0, 1]; BGRA channel indices R=2, G=1, B=0.
    expect(calls[0]!.params[10]).toBeCloseTo(2 / 255);
    expect(calls[0]!.params[11]).toBe(-1);
    expect(calls[1]!.params[11]).toBe(0);
    expect(Array.from(calls[1]!.params.slice(12))).toEqual([2, 1, 0]);
    expect(pose!.points[0]).toBeCloseTo(fixture.landmarks.expected[0]!.x, 3);
  });

  it('falls back to the JS sampler for 3-byte RGB frames', () => {
    const preCalls: number[] = [];
    const estimate = createBlazePoseWorklet({
      detector: fakeDetector(),
      landmarks: fakeLandmarks(() => 0.99),
      preprocess224: { runSync: () => (preCalls.push(224), []) },
      preprocess256: { runSync: () => (preCalls.push(256), []) },
      boxesOut: 0,
      scoresOut: 1,
      landmarksOut: 0,
      presenceOut: 1,
    });
    const rgbDesc = { ...desc, bytesPerRow: W * 3, bytesPerPixel: 3, channelOrder: 'rgb' as const };
    expect(
      estimate({ pixels: new Uint8Array(W * H * 3), desc: rgbDesc, timestamp: 1 }),
    ).not.toBeNull();
    expect(preCalls).toEqual([]);
  });
});

describe('MoveNet estimate worklet', () => {
  it('feeds a uint8 letterboxed tensor and decodes keypoints', () => {
    const raw = new Float32Array(51);
    for (let k = 0; k < 17; k++) {
      raw[k * 3] = 0.5;
      raw[k * 3 + 1] = 0.5;
      raw[k * 3 + 2] = 0.8;
    }
    const model: RunnableModel = {
      runSync(input) {
        expect(input[0]!.byteLength).toBe(192 * 192 * 3);
        return [buf(raw)];
      },
    };
    const pose = createMoveNetWorklet(model, 192)(frame);
    expect(pose!.score).toBeCloseTo(0.8);
    expect(pose!.points[0]).toBeCloseTo(0.5);
  });
});

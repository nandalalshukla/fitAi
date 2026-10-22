import fs from 'node:fs';
import path from 'node:path';

import {
  availableModels,
  DEFAULT_POSE_MODEL,
  HIGH_ACCURACY_POSE_MODEL,
  isModelAvailable,
} from '../modelRegistry';

jest.mock('react-native-fast-tflite', () => ({ loadTensorflowModel: jest.fn() }));

describe('pose model registry', () => {
  it('bundles the default and high-accuracy BlazePose models', () => {
    expect(isModelAvailable(DEFAULT_POSE_MODEL)).toBe(true);
    expect(isModelAvailable(HIGH_ACCURACY_POSE_MODEL)).toBe(true);
  });

  it('only lists models whose files are all present', () => {
    expect(availableModels({ blazeposeDetector: 1, blazeposeLandmarksLite: 2 })).toEqual([
      'blazepose-lite',
    ]);
    expect(availableModels({ movenetLightning: 3 })).toEqual(['movenet-lightning']);
  });

  it('keeps bundled model weight under the 15 MB budget', () => {
    const dir = path.join(__dirname, '../../../../../assets/models');
    const total = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith('.tflite'))
      .reduce((sum, f) => sum + fs.statSync(path.join(dir, f)).size, 0);
    expect(total).toBeGreaterThan(0);
    expect(total / 1e6).toBeLessThanOrEqual(15);
  });
});

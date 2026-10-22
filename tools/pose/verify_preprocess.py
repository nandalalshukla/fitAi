"""Verifies the ROI preprocessing graphs against the numpy reference sampler and
checks the landmark model gives the same output through either path.

usage: python tools/pose/verify_preprocess.py   (run from the repo root)
"""
import json, math, os, sys, time
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
import blazepose_ref as R  # noqa: E402
from ai_edge_litert.interpreter import Interpreter  # noqa: E402
from skimage import data  # noqa: E402

MODELS = 'assets/models'
FIXTURE = 'src/features/pose/domain/__fixtures__/blazepose-astronaut.json'
MAX = 1280 * 960

img = data.astronaut(); H, W, _ = img.shape
bgra = np.zeros((H, W, 4), np.uint8)
bgra[..., 0], bgra[..., 1], bgra[..., 2], bgra[..., 3] = img[..., 2], img[..., 1], img[..., 0], 255
staging = np.zeros((MAX, 4), np.uint8); staging[: H * W] = bgra.reshape(-1, 4)

def params(cx, cy, size, rot, n, scale, offset):
    c, s = math.cos(rot), math.sin(rot); step = size / n; half = (n / 2 - 0.5) * step
    ox = cx - (c * half - s * half); oy = cy - (s * half + c * half)
    return np.array([ox, oy, c * step, s * step, -s * step, c * step, W, H, W, 0, scale, offset, 2, 1, 0], np.float32)

def run_pre(path, prm):
    it = Interpreter(model_path=path); it.allocate_tensors()
    ins = {d['name']: d['index'] for d in it.get_input_details()}
    it.set_tensor(ins['pixels'], staging); it.set_tensor(ins['params'], prm); it.invoke()
    out = it.get_tensor(it.get_output_details()[0]['index'])
    t0 = time.perf_counter()
    for _ in range(50): it.invoke()
    return out, (time.perf_counter() - t0) / 50 * 1000

fx = json.load(open(FIXTURE)); r = fx['roi']; ok = True
for n, roi, rng in [(256, (r['cx'], r['cy'], r['size'], r['rotation']), (0, 1)), (224, (W / 2, H / 2, max(W, H), 0), (-1, 1))]:
    lo, hi = rng
    out, ms = run_pre(f'{MODELS}/roi_preprocess_{n}.tflite', params(*roi, n, (hi - lo) / 255, lo))
    diff = float(np.abs(out - R.sample(img, *roi, n, rng)).max())
    ok &= diff < 1e-5
    print(f'roi_preprocess_{n}: max|diff| vs reference = {diff:.2e}, invoke {ms:.2f} ms (this CPU)')
    if n == 256:
        lm = Interpreter(model_path=f'{MODELS}/blazepose_landmarks_lite.tflite'); lm.allocate_tensors()
        lm.set_tensor(lm.get_input_details()[0]['index'], out); lm.invoke()
        outs = {d['name']: d['index'] for d in lm.get_output_details()}
        d = float(np.abs(lm.get_tensor(outs['Identity'])[0] - np.array(fx['landmarks']['raw'])).max())
        ok &= d < 1e-2
        print(f'  landmarks via graph vs fixture: max|diff| = {d:.2e} px')
print('OK' if ok else 'FAILED'); sys.exit(0 if ok else 1)

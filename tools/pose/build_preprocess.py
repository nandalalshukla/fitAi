"""Builds FormFit's ROI preprocessing TFLite graphs (see docs/POSE_MODELS.md).

Input 0  `pixels`: uint8 [MAX_PIXELS, 4] — 4-byte camera pixels (RGBA/BGRA/RGBX)
         copied from the frame (row stride bytesPerRow, must be a multiple of 4).
         The LAST pixel must stay all-zero: out-of-frame samples read it.
Input 1  `params`: float32 [15] —
         0 ox, 1 oy       buffer-space position of output pixel (0,0) centre
         2 colX, 3 colY   buffer-space step per output column
         4 rowX, 5 rowY   buffer-space step per output row
         6 bufW, 7 bufH   frame size in pixels
         8 pixelsPerRow   bytesPerRow / 4
         9 (unused)
         10 scale, 11 offset   out = byte * scale + offset
         12 r, 13 g, 14 b      channel index (0..3) of R, G, B within a pixel
Output   float32 [1, N, N, 3]
Nearest-neighbour sampling, identical to src/features/pose/domain/sampler.ts.
"""
import sys
import tensorflow as tf

MAX_PIXELS = 1280 * 960

def make(n):
    @tf.function(input_signature=[
        tf.TensorSpec([MAX_PIXELS, 4], tf.uint8, name='pixels'),
        tf.TensorSpec([15], tf.float32, name='params'),
    ])
    def preprocess(pixels, params):
        p = params
        j = tf.range(n, dtype=tf.float32)[tf.newaxis, :]
        i = tf.range(n, dtype=tf.float32)[:, tf.newaxis]
        x = tf.floor(p[0] + j * p[2] + i * p[4])
        y = tf.floor(p[1] + j * p[3] + i * p[5])
        inb = tf.logical_and(tf.logical_and(x >= 0.0, y >= 0.0), tf.logical_and(x < p[6], y < p[7]))
        idx = tf.cast(y * p[8] + x, tf.int32)
        idx = tf.where(inb, idx, MAX_PIXELS - 1)  # reserved zero pixel
        px = tf.gather(pixels, idx)  # [n, n, 4] uint8
        rgb = tf.gather(px, tf.cast(p[12:15], tf.int32), axis=2)  # [n, n, 3]
        out = tf.cast(rgb, tf.float32) * p[10] + p[11]
        return tf.identity(out[tf.newaxis], name='tensor')
    return preprocess

for n in (224, 256):
    conv = tf.lite.TFLiteConverter.from_concrete_functions([make(n).get_concrete_function()])
    conv.target_spec.supported_ops = [tf.lite.OpsSet.TFLITE_BUILTINS]
    open(f'{sys.argv[1]}/roi_preprocess_{n}.tflite', 'wb').write(conv.convert())
    print('built', n)

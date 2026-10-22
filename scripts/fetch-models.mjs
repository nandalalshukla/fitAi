#!/usr/bin/env node
/**
 * Downloads the optional MoveNet SinglePose TFLite models (Apache-2.0, Google)
 * into assets/models/ and registers them in
 * src/features/pose/estimators/bundledModels.ts so Metro bundles them.
 *
 *   npm run models:fetch                 # Lightning only (default, ~2.9 MB)
 *   npm run models:fetch -- --thunder    # also Thunder (~7 MB; watch the 15 MB budget)
 *   npm run models:fetch -- --file lightning=/path/to/movenet_lightning_int8.tflite
 *
 * Sources tried in order: TF Hub (redirects to Kaggle Models), then the Kaggle
 * Models API tarball. A downloaded file is only accepted if it has the TFLite
 * "TFL3" identifier, so HTML error pages can never be bundled by accident.
 */
import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const modelsDir = join(root, 'assets/models');
const registry = join(root, 'src/features/pose/estimators/bundledModels.ts');
const MARKER = '  // @models:optional (managed by scripts/fetch-models.mjs)';

const MODELS = {
  lightning: {
    key: 'movenetLightning',
    file: 'movenet_lightning_int8.tflite',
    urls: [
      'https://tfhub.dev/google/lite-model/movenet/singlepose/lightning/tflite/int8/4?lite-format=tflite',
      'https://www.kaggle.com/api/v1/models/google/movenet/tfLite/singlepose-lightning-tflite-int8/1/download',
    ],
  },
  thunder: {
    key: 'movenetThunder',
    file: 'movenet_thunder_int8.tflite',
    urls: [
      'https://tfhub.dev/google/lite-model/movenet/singlepose/thunder/tflite/int8/4?lite-format=tflite',
      'https://www.kaggle.com/api/v1/models/google/movenet/tfLite/singlepose-thunder-tflite-int8/1/download',
    ],
  },
};

const isTflite = (buf) => buf.length > 8 && buf.subarray(4, 8).toString('latin1') === 'TFL3';

async function download(url) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (isTflite(buf)) return buf;
  // Kaggle serves a .tar.gz containing the .tflite file.
  if (buf[0] === 0x1f && buf[1] === 0x8b) {
    const dir = mkdtempSync(join(tmpdir(), 'movenet-'));
    const tgz = join(dir, 'model.tar.gz');
    writeFileSync(tgz, buf);
    execFileSync('tar', ['-xzf', tgz, '-C', dir]);
    const found = readdirSync(dir).find((f) => f.endsWith('.tflite'));
    if (found) {
      const inner = readFileSync(join(dir, found));
      if (isTflite(inner)) return inner;
    }
  }
  throw new Error('response is not a TFLite model');
}

function register(key, file) {
  const src = readFileSync(registry, 'utf8');
  if (src.includes(`${key}:`)) return;
  const line = `  ${key}: require('../../../../assets/models/${file}'),`;
  writeFileSync(registry, src.replace(MARKER, `${line}\n${MARKER}`));
}

const args = process.argv.slice(2);
const wanted = new Set(['lightning']);
if (args.includes('--thunder')) wanted.add('thunder');
const manual = Object.fromEntries(
  args.flatMap((a, i) => (a === '--file' && args[i + 1] ? [args[i + 1].split('=')] : [])),
);
Object.keys(manual).forEach((k) => wanted.add(k));

let failed = false;
for (const name of wanted) {
  const m = MODELS[name];
  if (!m) {
    console.error(`Unknown model "${name}" (expected lightning|thunder)`);
    failed = true;
    continue;
  }
  let buf;
  if (manual[name]) {
    buf = readFileSync(manual[name]);
    if (!isTflite(buf)) {
      console.error(`${manual[name]} is not a TFLite file`);
      failed = true;
      continue;
    }
  } else {
    for (const url of m.urls) {
      try {
        buf = await download(url);
        console.log(`✓ ${name} from ${new URL(url).host}`);
        break;
      } catch (e) {
        console.warn(`  ${name}: ${new URL(url).host} failed (${e.message})`);
      }
    }
  }
  if (!buf) {
    console.error(
      `✗ Could not download MoveNet ${name}. Download it manually and pass --file ${name}=<path>.`,
    );
    failed = true;
    continue;
  }
  const out = join(modelsDir, m.file);
  writeFileSync(out, buf);
  register(m.key, m.file);
  console.log(
    `  saved ${m.file} (${(statSync(out).size / 1e6).toFixed(1)} MB) and registered ${m.key}`,
  );
}

process.exit(failed ? 1 : 0);

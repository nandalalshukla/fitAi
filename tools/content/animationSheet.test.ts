/**
 * Dev tool: renders every keyframe of every exercise animation into one HTML contact sheet
 * (SVG stick figures with a floor line) for quick visual review of new keyframes.
 *
 *   npm run animations:sheet            # all animations
 *   IDS=squat,bird_dog npm run animations:sheet
 *
 * Output: tools/content/out/animation-sheet.html (gitignored). Skipped in normal test runs.
 */
import { mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

import { getAnimation, allAnimationIds } from '@/features/exercises/animation';
import { project } from '@/features/exercises/animation/body3d';
import { bodyAt } from '@/features/exercises/animation/interpolate';
import { KP, SKELETON_EDGES } from '@/features/pose/domain/keypoints';

const run = process.env.ANIMATION_SHEET === '1' ? it : it.skip;

run('renders the animation contact sheet', () => {
  const only = (process.env.IDS ?? '').split(',').filter(Boolean);
  const ids = allAnimationIds().filter((id) => only.length === 0 || only.includes(id));
  const S = 38;
  const W = 200;
  const H = 150;
  const floor = H - 12;
  let html =
    '<!doctype html><meta charset="utf-8"><title>FormFit animation sheet</title>' +
    '<body style="font:12px sans-serif;margin:0">';
  for (const id of ids) {
    const a = getAnimation(id)!;
    html += `<div style="display:flex;align-items:center;border-bottom:1px solid #ccc"><div style="width:150px;padding:4px">${id}<br>yaw ${a.yawDeg} · ${a.anchor}</div>`;
    for (const k of a.keyframes.filter((x) => x.t < 1)) {
      const p = project(bodyAt(a, k.t), { yawDeg: a.yawDeg });
      const x = (i: number) => (W / 2 + p.x[i]! * S).toFixed(1);
      const y = (i: number) => (floor + p.y[i]! * S).toFixed(1);
      let svg = `<svg width="${W}" height="${H}" style="border-left:1px solid #eee"><line x1="0" x2="${W}" y1="${floor}" y2="${floor}" stroke="#999"/>`;
      for (const [i, j] of SKELETON_EDGES) {
        const far = p.depth[i]! + p.depth[j]! < 0;
        svg += `<line x1="${x(i)}" y1="${y(i)}" x2="${x(j)}" y2="${y(j)}" stroke="${far ? '#9ab' : '#d33'}" stroke-width="4" stroke-linecap="round"/>`;
      }
      svg += `<circle cx="${x(KP.nose)}" cy="${y(KP.nose)}" r="7" fill="#d33"/><text x="4" y="12">t=${k.t} · step ${k.step ?? '-'}</text></svg>`;
      html += svg;
    }
    html += '</div>';
  }
  const dir = join(__dirname, 'out');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'animation-sheet.html'), `${html}</body>`);
});

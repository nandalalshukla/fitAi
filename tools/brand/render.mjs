// Renders all icon/splash/store assets from glyph.mjs (needs Playwright + Chromium):
//   node tools/brand/render.mjs [outputDir=assets]
import { mkdirSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join } from 'node:path';

import { EMBER, INK, VOLT, glyph, svg } from './glyph.mjs';

const require = createRequire(import.meta.url);
const { chromium } = require(process.env.PLAYWRIGHT_PATH ?? 'playwright');
const out = process.argv[2] ?? 'assets';

const assets = [
  // iOS / default icon: opaque, full bleed.
  { file: 'icon.png', size: 1024, svg: svg(1024, glyph({ scale: 0.86 }), INK), opaque: true },
  // Android adaptive icon: art inside the 66 % safe zone on a solid background layer.
  { file: 'android-icon-foreground.png', size: 1024, svg: svg(1024, glyph({ scale: 0.6 })) },
  { file: 'android-icon-background.png', size: 1024, svg: svg(1024, '', INK), opaque: true },
  {
    file: 'android-icon-monochrome.png',
    size: 1024,
    svg: svg(1024, glyph({ scale: 0.6, mono: '#FFFFFF' })),
  },
  // Splash: transparent mark on the configured background colour.
  { file: 'splash-icon.png', size: 1024, svg: svg(1024, glyph({ scale: 0.9 })) },
  { file: 'favicon.png', size: 48, svg: svg(1024, glyph({ scale: 0.9 }), INK), opaque: true },
];

const feature = `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500" viewBox="0 0 1024 500">
  <rect width="1024" height="500" fill="${INK}"/>
  <svg x="40" y="40" width="420" height="420" viewBox="0 0 1024 1024">${glyph({ scale: 0.9 })}</svg>
  <text x="500" y="230" font-family="Arial Black, Arial, sans-serif" font-weight="900" font-size="92" fill="#FFFFFF">FormFit</text>
  <text x="504" y="300" font-family="Arial, sans-serif" font-size="32" fill="${VOLT}">AI coach that counts every rep</text>
  <text x="504" y="352" font-family="Arial, sans-serif" font-size="24" fill="#B8BEC8">Form feedback · voice coaching · on-device</text>
  <circle cx="980" cy="44" r="10" fill="${EMBER}"/>
</svg>`;

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const page = await browser.newPage();
mkdirSync(out, { recursive: true });
mkdirSync(join(out, 'brand'), { recursive: true });
async function shoot(markup, size, path, w = size, h = size, opaque = false) {
  await page.setViewportSize({ width: w, height: h });
  await page.setContent(
    `<html><body style="margin:0;background:transparent">${markup.replace(/width="\d+" height="\d+" viewBox="0 0 1024 1024"/, `width="${w}" height="${h}" viewBox="0 0 1024 1024"`)}</body></html>`,
  );
  await page.screenshot({
    path,
    omitBackground: !opaque,
    clip: { x: 0, y: 0, width: w, height: h },
  });
}
for (const a of assets) {
  await shoot(a.svg, a.size, join(out, a.file), a.size, a.size, a.opaque);
  writeFileSync(join(out, 'brand', a.file.replace('.png', '.svg')), a.svg);
}
await page.setViewportSize({ width: 1024, height: 500 });
await page.setContent(`<html><body style="margin:0">${feature}</body></html>`);
mkdirSync(join(out, 'store'), { recursive: true });
await page.screenshot({
  path: join(out, 'store', 'feature-graphic.png'),
  clip: { x: 0, y: 0, width: 1024, height: 500 },
});
writeFileSync(join(out, 'brand', 'feature-graphic.svg'), feature);
await browser.close();
console.log('rendered', assets.length + 1, 'assets to', out);

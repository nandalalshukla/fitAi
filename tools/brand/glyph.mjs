// FormFit brand mark: a squatting figure inside a progress ring (rep counter).
// Shared by every generated asset. Coordinates in a 1024 × 1024 box.
export const INK = '#0B0D10';
export const VOLT = '#C6FF3D';
export const EMBER = '#FF6B3D';

/** Ring arc path (centre 512,512, radius r) from `fromDeg` sweeping `sweepDeg` clockwise (0° = 12 o'clock). */
function arc(r, fromDeg, sweepDeg) {
  const p = (deg) => {
    const a = ((deg - 90) * Math.PI) / 180;
    return [512 + r * Math.cos(a), 512 + r * Math.sin(a)];
  };
  const [x1, y1] = p(fromDeg);
  const [x2, y2] = p(fromDeg + sweepDeg);
  return `M ${x1.toFixed(1)} ${y1.toFixed(1)} A ${r} ${r} 0 ${sweepDeg > 180 ? 1 : 0} 1 ${x2.toFixed(1)} ${y2.toFixed(1)}`;
}

/**
 * The mark's SVG elements. `scale` shrinks it around the centre (adaptive-icon safe zone),
 * `mono` draws everything in one colour (Android themed / monochrome icon).
 */
export function glyph({ scale = 1, mono = null, figure = '#FFFFFF' } = {}) {
  const ring = mono ?? VOLT;
  const dot = mono ?? EMBER;
  const body = mono ?? figure;
  const end = (() => {
    const a = ((-30 + 300 - 90) * Math.PI) / 180;
    return [512 + 360 * Math.cos(a), 512 + 360 * Math.sin(a)];
  })();
  return `<g transform="translate(512 512) scale(${scale}) translate(-512 -512)">
    <path d="${arc(360, -30, 300)}" fill="none" stroke="${ring}" stroke-width="64" stroke-linecap="round"/>
    <circle cx="${end[0].toFixed(1)}" cy="${end[1].toFixed(1)}" r="46" fill="${dot}"/>
    <g transform="translate(-56 -4)">
      <g fill="none" stroke="${body}" stroke-width="66" stroke-linecap="round" stroke-linejoin="round">
        <path d="M 552 420 L 448 570 L 612 610 L 566 760"/>
        <path d="M 532 450 L 706 470"/>
      </g>
      <circle cx="590" cy="338" r="62" fill="${body}"/>
    </g>
  </g>`;
}

export const svg = (size, inner, bg = null) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 1024 1024">${
    bg ? `<rect width="1024" height="1024" fill="${bg}"/>` : ''
  }${inner}</svg>`;

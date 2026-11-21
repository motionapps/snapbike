// Generates the placeholder bike silhouettes shown on the customer page.
// Side view, front wheel to the right, drawn in a 1000x600 box. Marker
// positions in lib/bikeSilhouette.ts use the same coordinates.
// Run: node scripts/generate-silhouettes.js
const sharp = require('sharp');
const path = require('path');

const R = [250, 400]; // rear axle
const F = [760, 400]; // front axle
const BB = [470, 420];
const S = [420, 210]; // seat cluster
const H1 = [700, 200]; // head tube top
const H2 = [715, 265]; // head tube bottom

const line = ([x1, y1], [x2, y2], w = 14) =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke-width="${w}"/>`;
const circle = ([cx, cy], r, w = 6, fill = 'none') =>
  `<circle cx="${cx}" cy="${cy}" r="${r}" stroke-width="${w}" fill="${fill}"/>`;

function wheel(c) {
  return circle(c, 160, 16) + circle(c, 140, 5) + circle(c, 12, 6, '#3A4450');
}

function common() {
  return [
    wheel(R),
    wheel(F),
    // Frame
    line(S, BB, 16),
    line(BB, H2, 18),
    line(S, H1, 16),
    line(BB, R, 12),
    line(S, R, 10),
    line(H1, H2, 20),
    line(H2, F, 12),
    // Seatpost + saddle
    line(S, [405, 162], 12),
    `<path d="M345 152 Q400 136 455 150 L450 160 Q400 154 350 162 Z" fill="#3A4450"/>`,
    // Stem + handlebar
    line(H1, [690, 152], 12),
    line([650, 148], [730, 142], 12),
    `<path d="M730 142 Q760 150 748 185" stroke-width="10" fill="none"/>`,
    // Lamp
    `<rect x="740" y="168" width="22" height="14" rx="4" fill="#3A4450"/>`,
    // Brakes
    `<path d="M292 240 L316 262 M300 268 L322 244" stroke-width="7"/>`,
    `<path d="M722 236 L748 256 M728 262 L752 240" stroke-width="7"/>`,
    // Chainring, crank, pedal
    circle(BB, 46, 8),
    line(BB, [530, 480], 10),
    `<rect x="510" y="476" width="44" height="12" rx="4" fill="#3A4450"/>`,
    // Kickstand
    `<line x1="440" y1="430" x2="410" y2="560" stroke-width="8" stroke-dasharray="1 0"/>`,
  ].join('');
}

function cassetteParts() {
  return [
    circle(R, 34, 4),
    circle(R, 26, 4),
    circle(R, 18, 4),
    // Rear derailleur with jockey wheels
    line(R, [262, 452], 9),
    circle([258, 458], 8, 5),
    circle([272, 490], 8, 5),
    line([258, 458], [272, 490], 6),
    // Chain
    line([470, 374], [250, 366], 5),
    line([470, 466], [272, 498], 5),
  ].join('');
}

function hubParts() {
  return [
    circle(R, 30, 4, '#3A4450'),
    circle(R, 20, 4),
    // Chain straight to the single cog
    line([470, 374], [250, 380], 5),
    line([470, 466], [250, 420], 5),
  ].join('');
}

function svg(parts) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="600" viewBox="0 0 1000 600">
  <g stroke="#3A4450" stroke-linecap="round" stroke-linejoin="round" fill="none">${parts}</g>
</svg>`;
}

async function main() {
  const out = path.join(__dirname, '..', 'assets', 'silhouettes');
  require('fs').mkdirSync(out, { recursive: true });
  const variants = {
    'bike-cassette.png': common() + cassetteParts(),
    'bike-hub.png': common() + hubParts(),
  };
  for (const [file, parts] of Object.entries(variants)) {
    await sharp(Buffer.from(svg(parts)), { density: 144 })
      .resize(2000, 1200)
      .png()
      .toFile(path.join(out, file));
    console.log('wrote', file);
  }
}

main();

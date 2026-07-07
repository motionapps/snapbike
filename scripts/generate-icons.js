// Generates all app icons from an inline SVG bike glyph.
// Run: node scripts/generate-icons.js
const sharp = require('sharp');
const path = require('path');

const ASSETS = path.join(__dirname, '..', 'assets');

const BG = '#0B0F14';
const BG_MID = '#141C27';
const LIME = '#B9F13C';

// Bike line-art + camera-flash sparkle, drawn in a 1024x1024 box.
// stroke=currentColor so the same glyph works in lime, white, etc.
function glyph(color) {
  return `
  <g stroke="${color}" stroke-width="46" stroke-linecap="round" stroke-linejoin="round" fill="none">
    <circle cx="290" cy="666" r="148"/>
    <circle cx="734" cy="666" r="148"/>
    <path d="M290 666 L512 666 L444 430 L290 666"/>
    <path d="M444 430 L652 430 L734 666 L512 666"/>
    <path d="M652 430 L630 352"/>
    <path d="M582 348 L678 348"/>
    <path d="M444 430 L424 356"/>
    <path d="M376 350 L462 350"/>
  </g>
  <circle cx="512" cy="666" r="34" fill="${color}"/>
  <g fill="${color}">
    <path d="M812 158 L836 226 L904 250 L836 274 L812 342 L788 274 L720 250 L788 226 Z"/>
    <path d="M902 120 L914 152 L946 164 L914 176 L902 208 L890 176 L858 164 L890 152 Z"/>
  </g>`;
}

// group content, scaled around the canvas centre
function scaled(content, scale, cx = 512, cy = 512) {
  return `<g transform="translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})">${content}</g>`;
}

const bgGradient = `
  <defs>
    <radialGradient id="bg" cx="50%" cy="38%" r="80%">
      <stop offset="0%" stop-color="${BG_MID}"/>
      <stop offset="100%" stop-color="${BG}"/>
    </radialGradient>
  </defs>
  <rect width="1024" height="1024" fill="url(#bg)"/>`;

const svgs = {
  // Full-bleed iOS/app icon
  'icon.png': {
    size: 1024,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
      ${bgGradient}
      ${scaled(glyph(LIME), 0.78)}
    </svg>`,
  },
  // Android adaptive foreground: glyph inside the ~66% safe zone, transparent bg
  'android-icon-foreground.png': {
    size: 1024,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
      ${scaled(glyph(LIME), 0.52)}
    </svg>`,
  },
  'android-icon-background.png': {
    size: 1024,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
      ${bgGradient}
    </svg>`,
  },
  'android-icon-monochrome.png': {
    size: 1024,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
      ${scaled(glyph('#FFFFFF'), 0.52)}
    </svg>`,
  },
  'favicon.png': {
    size: 64,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
      ${bgGradient}
      ${scaled(glyph(LIME), 0.82)}
    </svg>`,
  },
  // Splash: lime glyph on transparent, backgroundColor comes from app.json
  'splash-icon.png': {
    size: 1024,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
      ${scaled(glyph(LIME), 0.7)}
    </svg>`,
  },
};

(async () => {
  for (const [file, { size, svg }] of Object.entries(svgs)) {
    const out = path.join(ASSETS, file);
    await sharp(Buffer.from(svg)).resize(size, size).png().toFile(out);
    console.log('wrote', file, `${size}x${size}`);
  }
})();

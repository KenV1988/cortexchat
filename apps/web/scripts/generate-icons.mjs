// Regenerates public/icon-*.png from the inline SVG below.
// Run from apps/web:  node scripts/generate-icons.mjs
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const publicDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public');

// Three bars of increasing size — the router's escalation ladder, tiny models
// first. Accent green on the app's dark background.
const svg = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="112" fill="#171717"/>
  <rect x="112" y="148" width="128" height="56" rx="28" fill="#19c37d"/>
  <rect x="112" y="228" width="208" height="56" rx="28" fill="#19c37d" opacity="0.75"/>
  <rect x="112" y="308" width="288" height="56" rx="28" fill="#19c37d" opacity="0.5"/>
</svg>`;

for (const size of [192, 512]) {
  const out = path.join(publicDir, `icon-${size}.png`);
  await sharp(Buffer.from(svg)).resize(size, size).png().toFile(out);
  console.log(`wrote ${out}`);
}

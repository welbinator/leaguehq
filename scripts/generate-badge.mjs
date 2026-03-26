// scripts/generate-badge.mjs
// Generates a monochrome 96x96 badge PNG for Android notification status bar
// Must be white-on-transparent (Android tints it automatically)
import sharp from 'sharp';
import { mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../public/icons');
mkdirSync(outDir, { recursive: true });

// Simple trophy/shield shape as monochrome white SVG
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
  <path fill="white" d="
    M48 8
    C28 8 16 20 16 20
    L16 52
    C16 68 48 88 48 88
    C48 88 80 68 80 52
    L80 20
    C80 20 68 8 48 8Z
  "/>
  <text x="48" y="58" font-size="36" text-anchor="middle" fill="#111" font-family="sans-serif" font-weight="bold">L</text>
</svg>`;

await sharp(Buffer.from(svg))
  .resize(96, 96)
  .png()
  .toFile(join(outDir, 'badge-96.png'));

console.log('✓ badge-96.png written');

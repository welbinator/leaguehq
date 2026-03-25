// scripts/generate-sport-icons.mjs
// Downloads OpenMoji SVGs and converts to 192x192 PNGs for push notifications
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../public/icons/sports');
mkdirSync(outDir, { recursive: true });

// OpenMoji unicode codepoints for each sport
const sports = [
  { key: 'soccer',     code: '26BD' }, // ⚽
  { key: 'basketball', code: '1F3C0' }, // 🏀
  { key: 'baseball',   code: '26BE' }, // ⚾
  { key: 'football',   code: '1F3C8' }, // 🏈
  { key: 'volleyball', code: '1F3D0' }, // 🏐
  { key: 'tennis',     code: '1F3BE' }, // 🎾
  { key: 'hockey',     code: '1F3D2' }, // 🏒
  { key: 'softball',   code: '1F94E' }, // 🥎
  { key: 'lacrosse',   code: '1F94D' }, // 🥍
  { key: 'rugby',      code: '1F3C9' }, // 🏉
  { key: 'swimming',   code: '1F3CA' }, // 🏊
  { key: 'track',      code: '1F3C3' }, // 🏃
];

const BASE = 'https://raw.githubusercontent.com/hfg-gmuend/openmoji/master/color/svg';

for (const sport of sports) {
  const url = `${BASE}/${sport.code}.svg`;
  const res = await fetch(url);
  if (!res.ok) { console.error(`✗ ${sport.key}: HTTP ${res.status}`); continue; }
  const svgBuffer = Buffer.from(await res.arrayBuffer());
  const outPath = join(outDir, `${sport.key}.png`);
  await sharp(svgBuffer).resize(192, 192).png().toFile(outPath);
  console.log(`✓ ${sport.key}`);
}

console.log('\nDone!');

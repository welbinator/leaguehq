// scripts/generate-sport-icons.mjs
// Generates 192x192 PNG sport icons for push notifications
import sharp from 'sharp';
import { writeFileSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = join(__dirname, '../public/icons/sports');
mkdirSync(outDir, { recursive: true });

const sports = [
  { key: 'Soccer',      emoji: '⚽', bg: '#16a34a' },
  { key: 'Basketball',  emoji: '🏀', bg: '#ea580c' },
  { key: 'Baseball',    emoji: '⚾', bg: '#2563eb' },
  { key: 'Football',    emoji: '🏈', bg: '#854d0e' },
  { key: 'Volleyball',  emoji: '🏐', bg: '#7c3aed' },
  { key: 'Tennis',      emoji: '🎾', bg: '#65a30d' },
  { key: 'Hockey',      emoji: '🏒', bg: '#0891b2' },
  { key: 'Softball',    emoji: '🥎', bg: '#db2777' },
  { key: 'Lacrosse',    emoji: '🥍', bg: '#0f766e' },
  { key: 'Rugby',       emoji: '🏉', bg: '#b45309' },
  { key: 'Swimming',    emoji: '🏊', bg: '#0369a1' },
  { key: 'Track',       emoji: '🏃', bg: '#dc2626' },
];

for (const sport of sports) {
  const size = 192;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
  <circle cx="${size/2}" cy="${size/2}" r="${size/2}" fill="${sport.bg}"/>
  <text x="${size/2}" y="${size/2 + 38}" font-size="100" text-anchor="middle" dominant-baseline="middle">${sport.emoji}</text>
</svg>`;

  const filename = join(outDir, `${sport.key.toLowerCase()}.png`);
  await sharp(Buffer.from(svg)).png().toFile(filename);
  console.log(`✓ ${sport.key} → ${filename}`);
}

console.log('\nDone! Icons written to public/icons/sports/');

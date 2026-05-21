import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const iconsDir = path.join(__dirname, '../src/assets/icons');

const BRAND = {
  purple: '#8B2BE2',
  magenta: '#C724B1',
  orange: '#FF7A00',
  cyan: '#00B4D8',
  success: '#0CC896',
  alert: '#FF4D4D',
  locked: '#333F68',
  muted: '#5A6480',
  light: '#A0AABF',
  gold: '#FBBF24',
  bronze: '#F59E0B',
  silver: '#94A3B8',
  teacher: '#4068D8',
  admin: '#5B20E6',
};

/** Fichiers qui gardent currentColor (contexte nav / admin). */
const KEEP_CURRENT = new Set([
  'nav-accueil.svg',
  'nav-catalogue.svg',
  'nav-progression.svg',
  'nav-profil.svg',
  'nav-teacher-dashboard.svg',
  'nav-teacher-eleves.svg',
  'nav-teacher-parcours.svg',
  'nav-teacher-ressources.svg',
  'admin-dashboard.svg',
  'admin-users.svg',
  'admin-classes.svg',
  'admin-resources.svg',
  'admin-shield.svg',
  'admin-audit.svg',
  'admin-menu.svg',
  'admin-close.svg',
  'admin-logout.svg',
  'flag-france.svg',
]);

const STROKE_COLOR = {
  'level-beginner.svg': BRAND.cyan,
  'level-intermediate.svg': BRAND.magenta,
  'level-advanced.svg': BRAND.purple,
  'status-mastered.svg': BRAND.success,
  'inline-mastered.svg': BRAND.success,
  'status-in-progress.svg': BRAND.orange,
  'inline-in-progress.svg': BRAND.orange,
  'status-locked.svg': BRAND.locked,
  'rank-bronze.svg': BRAND.bronze,
  'rank-silver.svg': BRAND.silver,
  'rank-gold.svg': BRAND.gold,
  'resource-video-1.svg': BRAND.cyan,
  'resource-video-2.svg': BRAND.teacher,
  'resource-video-3.svg': BRAND.purple,
  'resource-exercise-1.svg': BRAND.orange,
  'resource-exercise-2.svg': BRAND.magenta,
  'resource-exercise-3.svg': BRAND.purple,
  'tag-popular.svg': BRAND.orange,
  'alert-warning.svg': BRAND.alert,
  'timer.svg': BRAND.cyan,
  'tip-lightbulb.svg': BRAND.orange,
  'tip-target.svg': BRAND.magenta,
  'brain.svg': BRAND.magenta,
  'bell.svg': BRAND.magenta,
  'moon.svg': BRAND.purple,
  'offline.svg': BRAND.muted,
  'search.svg': BRAND.cyan,
  'play.svg': BRAND.purple,
  'pause.svg': BRAND.magenta,
  'guide-book.svg': BRAND.success,
  'chart-bar.svg': BRAND.cyan,
  'clipboard.svg': BRAND.light,
  'pdf-document.svg': BRAND.alert,
  'link-external.svg': BRAND.cyan,
  'download.svg': BRAND.success,
  'star-outline.svg': BRAND.muted,
  'school.svg': BRAND.purple,
  'student-user.svg': BRAND.magenta,
  'teacher-user.svg': BRAND.teacher,
  'lock.svg': BRAND.muted,
};

function colorizeFile(fileName) {
  if (KEEP_CURRENT.has(fileName)) return;
  const filePath = path.join(iconsDir, fileName);
  let svg = fs.readFileSync(filePath, 'utf8');
  const stroke = STROKE_COLOR[fileName];
  if (!stroke) return;

  svg = svg.replace(/stroke-width="1\.5"/g, 'stroke-width="2"');
  svg = svg.replace(/stroke="currentColor"/g, `stroke="${stroke}"`);
  svg = svg.replace(/fill="currentColor"/g, `fill="${stroke}"`);

  fs.writeFileSync(filePath, svg);
}

for (const file of fs.readdirSync(iconsDir)) {
  if (file.endsWith('.svg')) colorizeFile(file);
}

console.log('Brand colors applied to UI icons.');

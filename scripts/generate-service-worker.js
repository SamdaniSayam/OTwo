#!/usr/bin/env node
/**
 * Post-export PWA step.
 *
 * Run after `expo export -p web`. Scans the exported dist directory and embeds
 * every static asset in the service worker precache list, so an installed app
 * can reload its own bundle while offline.
 */
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const swPath = path.join(distDir, 'sw.js');

const CACHEABLE_EXTENSIONS = new Set([
  '.html',
  '.js',
  '.css',
  '.json',
  '.png',
  '.ico',
  '.svg',
  '.jpg',
  '.jpeg',
  '.webp',
  '.ttf',
  '.otf',
  '.woff',
  '.woff2',
]);

function walk(directory, files) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, files);
      continue;
    }
    if (!entry.isFile()) continue;
    if (entry.name === 'sw.js' || entry.name.endsWith('.map')) continue;
    const extension = path.extname(entry.name).toLowerCase();
    if (!CACHEABLE_EXTENSIONS.has(extension)) continue;
    const relative = path.relative(distDir, fullPath).split(path.sep).join('/');
    files.push(`/${relative}`);
  }
}

if (!fs.existsSync(swPath)) {
  console.error('generate-service-worker: dist/sw.js was not found. Run the web export first.');
  process.exit(1);
}

const files = [];
walk(distDir, files);
files.sort();

let sw = fs.readFileSync(swPath, 'utf8');
const marker = 'const PRECACHE_MANIFEST = self.__OTWO_PRECACHE__ || [];';
if (!sw.includes(marker)) {
  console.error('generate-service-worker: precache marker not found in sw.js.');
  process.exit(1);
}

const buildVersion = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
sw = sw
  .replace('__BUILD_VERSION__', buildVersion)
  .replace(marker, `const PRECACHE_MANIFEST = ${JSON.stringify(files, null, 2)};`);

fs.writeFileSync(swPath, sw, 'utf8');
console.log(`generate-service-worker: precached ${files.length} assets (build ${buildVersion}).`);

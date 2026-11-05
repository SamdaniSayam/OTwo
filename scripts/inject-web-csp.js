#!/usr/bin/env node
/**
 * Post-export web hardening.
 *
 * 1. Injects a strict Content-Security-Policy <meta> tag into dist/index.html.
 * 2. Writes dist/_headers with the same policy plus headers that cannot be set
 *    from a meta tag (frame-ancestors, HSTS, permissions policy).
 *
 * The policy lives in src/constants/webSecurity.json so the regression tests and
 * this build step cannot drift apart.
 *
 * Run after `expo export -p web`. `npm run build:web` does this automatically.
 */
const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const distDir = path.join(projectRoot, 'dist');
const indexPath = path.join(distDir, 'index.html');
const headersPath = path.join(distDir, '_headers');
const policy = require(path.join(projectRoot, 'src/constants/webSecurity.json'));

if (!fs.existsSync(indexPath)) {
  console.error('inject-web-csp: dist/index.html was not found. Run the web export first.');
  process.exit(1);
}

let html = fs.readFileSync(indexPath, 'utf8');

if (html.includes('http-equiv="Content-Security-Policy"')) {
  console.log('inject-web-csp: CSP meta tag already present; leaving it unchanged.');
} else {
  const meta = `    <meta http-equiv="Content-Security-Policy" content="${policy.metaCsp}" />\n`;
  if (!html.includes('<head>')) {
    console.error('inject-web-csp: could not find <head> in dist/index.html.');
    process.exit(1);
  }
  html = html.replace('<head>', `<head>\n${meta}`);
  fs.writeFileSync(indexPath, html, 'utf8');
  console.log('inject-web-csp: injected Content-Security-Policy meta tag.');
}

const headerLines = [
  '/*',
  `  Content-Security-Policy: ${policy.headerCsp}`,
  ...Object.entries(policy.headers).map(([name, value]) => `  ${name}: ${value}`),
];

for (const entry of policy.cacheHeaders || []) {
  headerLines.push('', entry.path, `  Cache-Control: ${entry['Cache-Control']}`);
}

fs.writeFileSync(headersPath, `${headerLines.join('\n')}\n`, 'utf8');
console.log(`inject-web-csp: wrote ${path.relative(projectRoot, headersPath)}.`);

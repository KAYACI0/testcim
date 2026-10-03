import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import esbuild from 'esbuild';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dist = path.resolve(root, 'dist');

if (!fs.existsSync(dist)) {
  fs.mkdirSync(dist, { recursive: true });
}

async function build() {
  console.warn('Building Testcim Browser Extension...');

  // 1. Bundle TypeScript entry points
  await esbuild.build({
    entryPoints: [path.join(root, 'src/background.ts')],
    bundle: true,
    format: 'esm',
    target: 'es2022',
    outfile: path.join(dist, 'background.js'),
    sourcemap: false,
    minify: false,
  });

  await esbuild.build({
    entryPoints: [path.join(root, 'src/content.ts')],
    bundle: true,
    format: 'iife',
    target: 'es2022',
    outfile: path.join(dist, 'content.js'),
    sourcemap: false,
    minify: false,
  });

  await esbuild.build({
    entryPoints: [path.join(root, 'src/sidepanel.ts')],
    bundle: true,
    format: 'esm',
    target: 'es2022',
    outfile: path.join(dist, 'sidepanel.js'),
    sourcemap: false,
    minify: false,
  });

  // 2. Copy static files
  fs.copyFileSync(path.join(root, 'manifest.json'), path.join(dist, 'manifest.json'));
  fs.copyFileSync(path.join(root, 'src/sidepanel.html'), path.join(dist, 'sidepanel.html'));
  fs.copyFileSync(path.join(root, 'src/content.css'), path.join(dist, 'content.css'));

  // Copy icons
  const iconsDist = path.join(dist, 'icons');
  if (!fs.existsSync(iconsDist)) {
    fs.mkdirSync(iconsDist, { recursive: true });
  }
  const iconsSrc = path.join(root, 'icons');
  for (const file of fs.readdirSync(iconsSrc)) {
    fs.copyFileSync(path.join(iconsSrc, file), path.join(iconsDist, file));
  }

  console.warn('Build completed. Unpacked extension ready at apps/extension/dist/');
}

build().catch((err) => {
  console.error('Build failed:', err);
  process.exit(1);
});

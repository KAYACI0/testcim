// Copies pdfjs-dist's worker bundle into apps/web/public/pdf so it is served
// as a static asset instead of being resolved by the bundler (docs/adr/0003
// §1: Turbopack worker-bundling has known issues on this repo, see
// docs/backlog.md "Dilim 02'den kalanlar"). Run with cwd = apps/web
// (apps/web/package.json predev/prebuild).
import { copyFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);
const pkgPath = require.resolve('pdfjs-dist/package.json', { paths: [process.cwd()] });
const workerSrc = join(dirname(pkgPath), 'build', 'pdf.worker.min.mjs');
const destDir = join(process.cwd(), 'public', 'pdf');
const destFile = join(destDir, 'pdf.worker.min.mjs');

mkdirSync(destDir, { recursive: true });
copyFileSync(workerSrc, destFile);

console.warn(`copy-pdf-worker: ${workerSrc} -> ${destFile}`);

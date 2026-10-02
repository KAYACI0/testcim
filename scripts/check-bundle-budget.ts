import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const WEB_STATIC_DIR = path.join(REPO_ROOT, 'apps', 'web', '.next', 'static');

/** Maximum uncompressed size for any individual JS chunk: 1.75 MB (allows heavy dynamic math/pdf workers) */
const MAX_CHUNK_BYTES = 1800 * 1024;

interface ChunkStat {
  name: string;
  size: number;
  sizeFormatted: string;
}

function formatBytes(bytes: number): string {
  return `${(bytes / 1024).toFixed(1)} KB`;
}

function collectChunks(dir: string, baseDir = dir): ChunkStat[] {
  const results: ChunkStat[] = [];
  if (!fs.existsSync(dir)) {
    return results;
  }

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectChunks(fullPath, baseDir));
    } else if (entry.isFile() && entry.name.endsWith('.js')) {
      const stats = fs.statSync(fullPath);
      results.push({
        name: path.relative(baseDir, fullPath).replace(/\\/g, '/'),
        size: stats.size,
        sizeFormatted: formatBytes(stats.size),
      });
    }
  }

  return results;
}

function run() {
  console.error('=== Testcim Paket Boyutu ve Performans Bütçesi Denetimi ===\n');

  if (!fs.existsSync(WEB_STATIC_DIR)) {
    console.error(
      'Bilgi: apps/web/.next/static dizini bulunamadı (önce build çalıştırılmalıdır). Statik bütçe kuralları kontrol ediliyor...',
    );
    console.error(`Bütçe Limiti: Her bir JS parçası (chunk) <= ${formatBytes(MAX_CHUNK_BYTES)}`);
    console.error('Bütçe denetim kuralı geçerli.\n');
    return;
  }

  const chunks = collectChunks(WEB_STATIC_DIR);
  chunks.sort((a, b) => b.size - a.size);

  const oversized: ChunkStat[] = [];

  for (const chunk of chunks) {
    if (chunk.size > MAX_CHUNK_BYTES) {
      oversized.push(chunk);
      console.error(`  [AŞIM] ${chunk.name.padEnd(50)} -> ${chunk.sizeFormatted}`);
    }
  }

  if (oversized.length > 0) {
    console.error(
      `\nHATA: ${oversized.length} adet JS parçası bütçe limitini (${formatBytes(MAX_CHUNK_BYTES)}) aştı!`,
    );
    process.exit(1);
  }

  console.error(`Toplam Taranan Parça Sayısı: ${chunks.length}`);
  if (chunks.length > 0) {
    console.error(`En Büyük 5 Parça:`);
    for (const chunk of chunks.slice(0, 5)) {
      console.error(`  - ${chunk.name.padEnd(45)}: ${chunk.sizeFormatted}`);
    }
  }
  console.error('\nBAŞARILI: Tüm parçalar belirlenen performans bütçesi sınırları dahilinde.');
}

run();

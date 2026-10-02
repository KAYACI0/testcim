import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, '..');

const MIGRATIONS_DIR = path.join(REPO_ROOT, 'supabase', 'migrations');
const TESTS_DIR = path.join(REPO_ROOT, 'supabase', 'tests');

interface TableInfo {
  name: string;
  isTenant: boolean;
  hasCrossTenantTest: boolean;
  testFiles: string[];
}

function findCreatedTables(): Map<string, TableInfo> {
  const tables = new Map<string, TableInfo>();
  const migrationFiles = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const tableCreateRegex =
    /create\s+table(?:\s+if\s+not\s+exists)?\s+public\.([a-zA-Z0-9_]+)\s*\(([\s\S]*?)\);/gi;

  for (const file of migrationFiles) {
    const content = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
    let match: RegExpExecArray | null;

    while ((match = tableCreateRegex.exec(content)) !== null) {
      const tableName = match[1]!;
      const body = match[2]!;
      const isTenant = body.includes('workspace_id');

      if (!tables.has(tableName)) {
        tables.set(tableName, {
          name: tableName,
          isTenant,
          hasCrossTenantTest: false,
          testFiles: [],
        });
      }
    }
  }

  return tables;
}

function verifyCrossTenantCoverage(tables: Map<string, TableInfo>) {
  const testFiles = fs
    .readdirSync(TESTS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  const allTestContents: { file: string; content: string }[] = testFiles.map((file) => ({
    file,
    content: fs.readFileSync(path.join(TESTS_DIR, file), 'utf-8'),
  }));

  for (const [_tableName, info] of tables) {
    if (!info.isTenant) {
      continue;
    }

    const name = info.name;
    // Patterns indicating a cross-tenant or isolation test for this table:
    // 1. Cross-tenant mention with table name in comment or assertion
    // 2. Querying table while switched to owner_b / foreign tenant expecting 0 / is_empty
    // 3. throws_ok with insert targeting foreign workspace_id
    for (const { file, content } of allTestContents) {
      const mentionsTable =
        content.includes(`public.${name}`) ||
        content.includes(` ${name} `) ||
        content.includes(` ${name}\n`) ||
        content.includes(`from ${name}`) ||
        content.includes(`into ${name}`);

      if (!mentionsTable) {
        continue;
      }

      const hasIsolationKeyword =
        /cross-tenant/i.test(content) ||
        /owner_b/i.test(content) ||
        /user_b/i.test(content) ||
        /is_empty/i.test(content) ||
        /throws_ok/i.test(content) ||
        /cannot see/i.test(content) ||
        /cannot read/i.test(content) ||
        /not_authorized/i.test(content);

      if (hasIsolationKeyword) {
        info.hasCrossTenantTest = true;
        info.testFiles.push(file);
      }
    }
  }
}

function run() {
  console.error('=== Testcim Kiracı İzolasyonu ve pgTAP Test Denetimi ===\n');

  const tables = findCreatedTables();
  verifyCrossTenantCoverage(tables);

  const tenantTables: TableInfo[] = [];
  const globalTables: TableInfo[] = [];

  for (const table of tables.values()) {
    if (table.isTenant) {
      tenantTables.push(table);
    } else {
      globalTables.push(table);
    }
  }

  console.error(`Toplam Tablo Sayısı: ${tables.size}`);
  console.error(`Global / Kiracı Dışı Tablo Sayısı: ${globalTables.length}`);
  console.error(`Kiracı İzolasyonu Gerektiren Tablo Sayısı: ${tenantTables.length}\n`);

  const missingCoverage: TableInfo[] = [];

  for (const table of tenantTables) {
    if (table.hasCrossTenantTest) {
      console.error(`  [OK] public.${table.name.padEnd(28)} -> ${table.testFiles.join(', ')}`);
    } else {
      console.error(`  [FAIL] public.${table.name.padEnd(28)} -> EKSİK ÇAPRAZ KİRACI TESTİ`);
      missingCoverage.push(table);
    }
  }

  console.error('\nGlobal Tablolar (workspace_id içermez):');
  for (const table of globalTables) {
    console.error(`  - public.${table.name}`);
  }

  if (missingCoverage.length > 0) {
    console.error(
      `\nHATA: ${missingCoverage.length} adet kiracı tablosunda çapraz kiracı pgTAP izolasyon testi eksik!`,
    );
    process.exit(1);
  } else {
    console.error(
      `\nBAŞARILI: Kiracı kapsamındaki tüm (${tenantTables.length}/${tenantTables.length}) tabloların çapraz kiracı testleri mevcut.`,
    );
  }
}

run();

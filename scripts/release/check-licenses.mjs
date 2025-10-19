#!/usr/bin/env node

/**
 * Basic license reporting based on package-lock.json.
 * Generates a summary table and optionally emits JSON (`--json`).
 */

import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const args = process.argv.slice(2);
const outputJson = args.includes('--json');

const lockPath = path.join(repoRoot, 'package-lock.json');
const lockFile = JSON.parse(readFileSync(lockPath, 'utf8'));

const packages = lockFile.packages ?? {};

const records = [];
const licenseCounts = new Map();

for (const [pkgPath, metadata] of Object.entries(packages)) {
  if (!metadata || typeof metadata !== 'object') {
    continue;
  }

  const fallbackName = lockFile.name ?? pkgPath ?? 'root';
  const normalizedPathName = pkgPath.startsWith('node_modules/')
    ? pkgPath.replace(/^node_modules\//, '')
    : fallbackName;
  const name = metadata.name ?? normalizedPathName ?? 'root';
  const version = metadata.version ?? lockFile.version ?? '0.0.0';
  let license = 'UNKNOWN';

  if (typeof metadata.license === 'string') {
    license = metadata.license;
  } else if (Array.isArray(metadata.licenses)) {
    license = metadata.licenses.map((entry) => (typeof entry === 'string' ? entry : entry?.type ?? 'UNKNOWN')).join(', ');
  }

  records.push({ name, version, license });

  const currentCount = licenseCounts.get(license) ?? 0;
  licenseCounts.set(license, currentCount + 1);
}

records.sort((a, b) => a.name.localeCompare(b.name));

if (outputJson) {
  console.log(JSON.stringify({ records, summary: Object.fromEntries(licenseCounts) }, null, 2));
  process.exit(0);
}

console.log('License summary:');
for (const [license, count] of Array.from(licenseCounts.entries()).sort(([a], [b]) => a.localeCompare(b))) {
  console.log(`  ${license}: ${count}`);
}

console.log('\nDetailed list:');
for (const record of records) {
  console.log(`- ${record.name}@${record.version}: ${record.license}`);
}

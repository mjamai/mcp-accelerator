#!/usr/bin/env node

/**
 * Generate a changelog section from conventional commits since the last tagged release.
 * Prepends the new section to CHANGELOG.md while preserving existing content.
 */

import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');
const changelogPath = path.join(repoRoot, 'CHANGELOG.md');
const packageJson = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

const args = process.argv.slice(2);

let targetVersion = packageJson.version;
for (const arg of args) {
  if (arg.startsWith('--version=')) {
    targetVersion = arg.split('=')[1];
  }
}

function run(command) {
  try {
    return execSync(command, { cwd: repoRoot, stdio: ['ignore', 'pipe', 'ignore'], encoding: 'utf8' }).trim();
  } catch (error) {
    return '';
  }
}

function getPreviousTag() {
  const tags = run("git tag --list 'v*' --sort=-version:refname");
  if (!tags) {
    return null;
  }

  const [latestTag] = tags.split('\n');
  if (!latestTag) {
    return null;
  }

  // If the latest tag matches the current version, use the next one.
  if (latestTag === `v${targetVersion}`) {
    const [, secondTag] = tags.split('\n');
    return secondTag ?? null;
  }

  return latestTag;
}

const previousTag = getPreviousTag();
const logRange = previousTag ? `${previousTag}..HEAD` : '';
const rawLog = run(`git log ${logRange} --pretty=format:%H%n%s%n%b%n==END==`);

if (!rawLog) {
  console.log('No new commits found for changelog generation.');
  process.exit(0);
}

const commitBlocks = rawLog
  .split('==END==')
  .map((block) => block.trim())
  .filter(Boolean);

const categories = new Map([
  ['Features', []],
  ['Bug Fixes', []],
  ['Performance', []],
  ['Documentation', []],
  ['Refactoring', []],
  ['Testing', []],
  ['Build', []],
  ['CI', []],
  ['Chores', []],
]);

function mapTypeToCategory(type) {
  switch (type) {
    case 'feat':
      return 'Features';
    case 'fix':
      return 'Bug Fixes';
    case 'perf':
      return 'Performance';
    case 'docs':
      return 'Documentation';
    case 'refactor':
      return 'Refactoring';
    case 'test':
      return 'Testing';
    case 'build':
      return 'Build';
    case 'ci':
      return 'CI';
    default:
      return 'Chores';
  }
}

for (const block of commitBlocks) {
  const [hashLine, subjectLine, ...bodyLines] = block.split('\n');
  const hash = hashLine?.trim();
  const subject = subjectLine?.trim() ?? '';
  if (!hash || !subject) {
    continue;
  }

  const match = subject.match(/^(?<type>\w+)(\((?<scope>[^)]+)\))?!?: (?<description>.+)$/);
  const type = match?.groups?.type ?? 'chore';
  const scope = match?.groups?.scope;
  const description = match?.groups?.description ?? subject;
  const category = mapTypeToCategory(type);
  const shortHash = hash.slice(0, 7);
  const details = bodyLines
    .map((line) => line.trim())
    .filter(Boolean)
    .join(' ');

  const entryParts = [];
  entryParts.push(`- ${description} (${shortHash})`);
  if (scope) {
    entryParts.push(`  - Scope: \`${scope}\``);
  }
  if (details) {
    entryParts.push(`  - ${details}`);
  }

  categories.get(category)?.push(entryParts.join('\n'));
}

const date = new Date().toISOString().split('T')[0];
const heading = `## [v${targetVersion}] - ${date}`;
const orderedSections = [];

for (const [category, entries] of categories.entries()) {
  if (entries.length === 0) {
    continue;
  }

  orderedSections.push(`### ${category}\n${entries.join('\n')}`);
}

if (orderedSections.length === 0) {
  console.log('No conventional commit entries detected. Skipping changelog update.');
  process.exit(0);
}

const newSection = `${heading}\n\n${orderedSections.join('\n\n')}\n`;

let existingContent = '';
if (existsSync(changelogPath)) {
  existingContent = readFileSync(changelogPath, 'utf8').trimStart();
}

const updated = `${newSection}\n${existingContent}`.trimEnd() + '\n';
writeFileSync(changelogPath, updated);

console.log(`Changelog updated with version v${targetVersion}.`);

#!/usr/bin/env node

/**
 * Bump the version of the monorepo packages using simple semantic versioning.
 * Updates root package.json, workspace package.json files, and package-lock.json.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..', '..');

const args = process.argv.slice(2);

let releaseType = 'patch';
let preid;

for (const arg of args) {
  if (arg.startsWith('--type=')) {
    releaseType = arg.split('=')[1];
  } else if (arg.startsWith('--preid=')) {
    preid = arg.split('=')[1];
  }
}

const allowedTypes = new Set(['major', 'minor', 'patch']);
if (!allowedTypes.has(releaseType)) {
  console.error(`Unsupported release type "${releaseType}". Expected one of: ${Array.from(allowedTypes).join(', ')}`);
  process.exit(1);
}

function parseVersion(version) {
  const [core, prerelease] = version.split('-');
  const parts = core.split('.').map((value) => Number.parseInt(value, 10));
  if (parts.length !== 3 || parts.some((value) => Number.isNaN(value))) {
    throw new Error(`Invalid semantic version: ${version}`);
  }

  const meta = prerelease ? prerelease.split('.') : [];
  return { parts, meta };
}

function formatVersion(parts, meta) {
  const base = parts.join('.');
  if (meta.length === 0) {
    return base;
  }

  return `${base}-${meta.join('.')}`;
}

function bumpVersion(currentVersion, type, identifier) {
  const { parts } = parseVersion(currentVersion);
  let meta = [];

  switch (type) {
    case 'major':
      parts[0] += 1;
      parts[1] = 0;
      parts[2] = 0;
      break;
    case 'minor':
      parts[1] += 1;
      parts[2] = 0;
      break;
    case 'patch':
      parts[2] += 1;
      break;
    default:
      throw new Error(`Unsupported release type: ${type}`);
  }

  if (identifier) {
    meta = [identifier, '0'];
  }

  return formatVersion(parts, meta);
}

function collectWorkspacePackagePaths(workspaces) {
  const packagePaths = [];
  for (const pattern of workspaces) {
    if (!pattern.endsWith('/*')) {
      continue;
    }

    const workspaceRoot = pattern.slice(0, -2);
    const absoluteWorkspaceRoot = path.resolve(repoRoot, workspaceRoot);
    let entries = [];
    try {
      entries = readdirSync(absoluteWorkspaceRoot);
    } catch {
      continue;
    }

    for (const entry of entries) {
      const fullPath = path.join(absoluteWorkspaceRoot, entry);
      try {
        if (statSync(fullPath).isDirectory()) {
          packagePaths.push(path.join(fullPath, 'package.json'));
        }
      } catch {
        // ignore inaccessible workspaces
      }
    }
  }
  return packagePaths;
}

function updateInternalDependencies(manifest, newVersion) {
  const dependencySections = [
    'dependencies',
    'devDependencies',
    'peerDependencies',
    'optionalDependencies',
  ];

  for (const section of dependencySections) {
    const deps = manifest[section];
    if (!deps) {
      continue;
    }

    for (const [name, range] of Object.entries(deps)) {
      if (!name.startsWith('@mcp-accelerator/')) {
        continue;
      }

      if (typeof range !== 'string') {
        continue;
      }

      if (range.startsWith('workspace:')) {
        const normalized = range.replace(/workspace:.*/, `workspace:^${newVersion}`);
        deps[name] = normalized;
      } else if (range.startsWith('^')) {
        deps[name] = `^${newVersion}`;
      } else if (range.startsWith('~')) {
        deps[name] = `~${newVersion}`;
      } else {
        deps[name] = newVersion;
      }
    }
  }
}

const rootPackagePath = path.join(repoRoot, 'package.json');
const rootManifest = JSON.parse(readFileSync(rootPackagePath, 'utf8'));
const currentVersion = rootManifest.version;

const newVersion = bumpVersion(currentVersion, releaseType, preid);
rootManifest.version = newVersion;
updateInternalDependencies(rootManifest, newVersion);
writeFileSync(rootPackagePath, `${JSON.stringify(rootManifest, null, 2)}\n`);

const workspacePackageJsonPaths = collectWorkspacePackagePaths(rootManifest.workspaces ?? []);
for (const pkgPath of workspacePackageJsonPaths) {
  const manifest = JSON.parse(readFileSync(pkgPath, 'utf8'));
  manifest.version = newVersion;
  updateInternalDependencies(manifest, newVersion);
  writeFileSync(pkgPath, `${JSON.stringify(manifest, null, 2)}\n`);
}

const lockPath = path.join(repoRoot, 'package-lock.json');
try {
  const lockFile = JSON.parse(readFileSync(lockPath, 'utf8'));
  if (typeof lockFile.version === 'string') {
    lockFile.version = newVersion;
  }

  if (lockFile.packages) {
    const packages = lockFile.packages;
    if (packages['']) {
      packages[''].version = newVersion;
    }

    for (const [pkgPath, data] of Object.entries(packages)) {
      if (!data || typeof data !== 'object') {
        continue;
      }

      if (data.name?.startsWith('@mcp-accelerator/')) {
        data.version = newVersion;
      }
    }
  }

  writeFileSync(lockPath, `${JSON.stringify(lockFile, null, 2)}\n`);
} catch (error) {
  console.warn('Skipped package-lock.json update:', error.message);
}

console.log(`Version bumped from ${currentVersion} to ${newVersion}.`);
console.log('Remember to review and commit the changes, then tag the release:');
console.log(`  git commit -am "chore(release): v${newVersion}"`);
console.log(`  git tag v${newVersion}`);

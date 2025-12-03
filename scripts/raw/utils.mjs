import { readFile, mkdir } from 'fs/promises';
import { createHash } from 'crypto';
import path from 'path';
import { fileURLToPath } from 'url';

const moduleDir = path.dirname(fileURLToPath(import.meta.url));
export const repoRoot = path.resolve(moduleDir, '../../');
const manifestPath = path.join(moduleDir, 'wasm-artifacts.json');

export async function loadArtifactManifest() {
  const fileRaw = await readFile(manifestPath, 'utf-8');
  const parsed = JSON.parse(fileRaw);
  if (!Array.isArray(parsed.artifacts)) {
    throw new Error('Malformed wasm artifact manifest: missing artifacts array');
  }
  return parsed.artifacts;
}

export async function computeSha256(filePath) {
  const buffer = await readFile(filePath);
  return createHash('sha256').update(buffer).digest('hex');
}

export async function ensureParentDir(targetPath) {
  const dir = path.dirname(targetPath);
  await mkdir(dir, { recursive: true });
}

export function relativeToRepo(absPath) {
  return path.relative(repoRoot, absPath) || '.';
}

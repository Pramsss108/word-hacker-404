import { copyFile, writeFile } from 'fs/promises';
import path from 'path';
import {
  loadArtifactManifest,
  computeSha256,
  ensureParentDir,
  repoRoot,
  relativeToRepo
} from './utils.mjs';

async function vendorArtifacts() {
  const artifacts = await loadArtifactManifest();
  const results = [];

  for (const artifact of artifacts) {
    const source = path.resolve(repoRoot, artifact.source);
    const target = path.resolve(repoRoot, artifact.target);

    const sourceHash = await computeSha256(source);
    if (sourceHash !== artifact.sha256) {
      throw new Error(
        `Hash mismatch for ${relativeToRepo(source)}. Expected ${artifact.sha256} but found ${sourceHash}.`
      );
    }

    await ensureParentDir(target);
    await copyFile(source, target);

    const targetHash = await computeSha256(target);
    if (targetHash !== artifact.sha256) {
      throw new Error(
        `Post-copy hash mismatch for ${relativeToRepo(target)}. Expected ${artifact.sha256} but found ${targetHash}.`
      );
    }

    results.push({ id: artifact.id, target: relativeToRepo(target) });
  }

  const manifestOutput = {
    generatedAt: new Date().toISOString(),
    artifacts
  };
  const manifestPath = path.resolve(repoRoot, 'public/wasm/manifest.json');
  await writeFile(manifestPath, JSON.stringify(manifestOutput, null, 2) + '\n', 'utf-8');

  console.log(`Vendored ${results.length} wasm artifacts:`);
  for (const entry of results) {
    console.log(` • ${entry.id} -> ${entry.target}`);
  }
}

vendorArtifacts().catch((error) => {
  console.error('[raw:bootstrap] Failed to vendor wasm artifacts');
  console.error(error);
  process.exitCode = 1;
});

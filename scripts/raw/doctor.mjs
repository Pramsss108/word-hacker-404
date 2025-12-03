import { access, readFile } from 'fs/promises';
import { constants } from 'fs';
import path from 'path';
import {
  loadArtifactManifest,
  computeSha256,
  repoRoot,
  relativeToRepo
} from './utils.mjs';

async function verifyArtifacts() {
  const artifacts = await loadArtifactManifest();
  const failures = [];

  for (const artifact of artifacts) {
    const target = path.resolve(repoRoot, artifact.target);
    try {
      await access(target, constants.R_OK);
    } catch (error) {
      failures.push(`Missing artifact: ${relativeToRepo(target)} (${artifact.id})`);
      continue;
    }

    const targetHash = await computeSha256(target);
    if (targetHash !== artifact.sha256) {
      failures.push(
        `Hash mismatch for ${relativeToRepo(target)}. Expected ${artifact.sha256} but found ${targetHash}.`
      );
    }
  }

  const vendoredManifestPath = path.resolve(repoRoot, 'public/wasm/manifest.json');
  try {
    const vendoredManifestRaw = await readFile(vendoredManifestPath, 'utf-8');
    const vendoredManifest = JSON.parse(vendoredManifestRaw);
    const sameLength = Array.isArray(vendoredManifest.artifacts)
      && vendoredManifest.artifacts.length === artifacts.length;
    const samePayload = sameLength
      && JSON.stringify(vendoredManifest.artifacts) === JSON.stringify(artifacts);
    if (!samePayload) {
      failures.push(
        'public/wasm/manifest.json is outdated. Re-run npm run raw:bootstrap to refresh hash data.'
      );
    }
  } catch (error) {
    failures.push(
      `Unable to read public/wasm/manifest.json (${error.message}). Run npm run raw:bootstrap.`
    );
  }

  if (failures.length > 0) {
    console.error('[raw:doctor] Verification failed:');
    for (const issue of failures) {
      console.error(` • ${issue}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log('All vendored wasm artifacts match pinned hashes.');
}

verifyArtifacts().catch((error) => {
  console.error('[raw:doctor] Unexpected failure');
  console.error(error);
  process.exitCode = 1;
});

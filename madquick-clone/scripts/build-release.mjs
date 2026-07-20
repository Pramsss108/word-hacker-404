import { cp, mkdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve, relative, sep } from "node:path";

const root = resolve(import.meta.dirname, "..");
const source = resolve(root, "public");
const release = resolve(root, "release");
if (relative(root, release).startsWith("..") || release === root) throw new Error("Unsafe release path");

await rm(release, { recursive: true, force: true });
await mkdir(release, { recursive: true });

const required = [
  "index.html", "privacy.html", "404.html", "robots.txt", "sitemap.xml",
  "abhijit-pramanik-resume.pdf", ".htaccess", "_headers", "_redirects",
  "v3/styles.min.css", "v3/app.min.js",
  "v3/mobile.min.css", "v3/mobile-app.min.js",
  "v3/webgpu-cta.min.js", "v3/webgpu-atmosphere.min.js",
  "v3/chat.css", "v3/chat.js",
];

const textFiles = ["index.html", "privacy.html", "404.html", "v3/styles.min.css", "v3/app.min.js"];
const texts = await Promise.all(textFiles.map(async (file) => [file, await readFile(resolve(source, file), "utf8")]));
const discovered = new Set(required);

function addPublicPath(raw) {
  if (!raw || raw.startsWith("data:") || raw.startsWith("http:") || raw.startsWith("https:")) return;
  const clean = raw.split("?")[0].split("#")[0].replace(/^\//, "");
  if (!clean || clean.includes("..")) return;
  if (/^(images|videos|v3\/fonts)\//.test(clean)) discovered.add(clean);
}

for (const [file, text] of texts) {
  for (const match of text.matchAll(/\/(?:images|videos|v3\/fonts)\/[^\s"'(),<>]+/g)) addPublicPath(match[0]);
  if (file.endsWith(".css")) {
    for (const match of text.matchAll(/url\((['"]?)([^)'"\s]+)\1\)/g)) {
      const value = match[2];
      if (value.startsWith("/")) addPublicPath(value);
      else if (!value.startsWith("data:")) addPublicPath(`/v3/${value.replace(/^\.\//, "")}`);
    }
  }
}

const copied = [];
for (const file of [...discovered].sort()) {
  const from = resolve(source, file);
  const to = resolve(release, file);
  const info = await stat(from).catch(() => null);
  if (!info?.isFile()) throw new Error(`Required release file is missing: ${file}`);
  await mkdir(dirname(to), { recursive: true });
  await cp(from, to);
  const bytes = await readFile(to);
  copied.push({ file: file.replaceAll(sep, "/"), bytes: bytes.length, sha256: createHash("sha256").update(bytes).digest("hex") });
}

const banned = copied.filter(({ file }) => /(^|\/)(_proof|madquick-ref|_archive|private|backup)(\/|$)/i.test(file));
if (banned.length) throw new Error(`Private or reference assets entered release: ${banned.map((item) => item.file).join(", ")}`);

const manifest = {
  generatedAt: new Date().toISOString(),
  files: copied.length,
  bytes: copied.reduce((sum, item) => sum + item.bytes, 0),
  excludedRoots: ["public/_proof", "public/madquick-ref", "public/_archive_elementor_homepage", "backups", "perf-reports"],
  assets: copied,
};
await writeFile(resolve(release, "release-manifest.json"), JSON.stringify(manifest, null, 2));
console.log(JSON.stringify({ files: manifest.files, bytes: manifest.bytes, release, excludedRoots: manifest.excludedRoots }, null, 2));

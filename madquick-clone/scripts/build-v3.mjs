import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { PurgeCSS } from "purgecss";
import { minify as minifyCss } from "csso";
import { minify as minifyJs } from "terser";

const root = resolve(import.meta.dirname, "..");
const pageDir = resolve(root, "public", "v3");
const cssSource = resolve(pageDir, "styles.css");
const jsSource = resolve(pageDir, "app.js");
const mobileCssSource = resolve(pageDir, "mobile.css");
const mobileJsSource = resolve(pageDir, "mobile-app.js");
const gpuCtaSource = resolve(pageDir, "webgpu-cta.js");
const gpuAtmosphereSource = resolve(pageDir, "webgpu-atmosphere.js");
const htmlSource = resolve(pageDir, "index.html");
const canonicalHtml = resolve(root, "public", "index.html");

const [css, js, mobileCss, mobileJs, gpuCtaJs, gpuAtmosphereJs, html] = await Promise.all([
  readFile(cssSource, "utf8"),
  readFile(jsSource, "utf8"),
  readFile(mobileCssSource, "utf8"),
  readFile(mobileJsSource, "utf8"),
  readFile(gpuCtaSource, "utf8"),
  readFile(gpuAtmosphereSource, "utf8"),
  readFile(htmlSource, "utf8"),
]);

const purgeResult = await new PurgeCSS().purge({
  content: [
    { raw: html, extension: "html" },
    { raw: js, extension: "js" },
  ],
  css: [{ raw: css }],
  safelist: {
    standard: [
      "js",
      "no-js",
      "is-visible",
      "is-active",
      "is-open",
      "is-ready",
      "is-paused",
      "is-dragging",
      "is-motion-visible",
      "intro-active",
      "intro-skip",
      "ap-cursor-hover",
      "ap-cursor-down",
      "ap-cursor-idle",
      "ap-cursor-hidden",
      "nav-open",
      "mega-open",
      "rv-marquee",
      "rv-stagger",
    ],
    greedy: [/^is-/, /^has-/, /^intro-/, /^ap-cursor-/, /^rv-/, /^editor-/],
  },
  fontFace: false,
  keyframes: true,
  variables: false,
});

if (!purgeResult[0]?.css) {
  throw new Error("PurgeCSS did not return a stylesheet");
}

const mobilePurgeResult = await new PurgeCSS().purge({
  content: [
    { raw: html, extension: "html" },
    { raw: mobileJs, extension: "js" },
    { raw: gpuCtaJs, extension: "js" },
  ],
  css: [{ raw: mobileCss }],
  safelist: {
    standard: [
      "js",
      "no-js",
      "is-active",
      "is-open",
      "is-ready",
      "is-paused",
      "is-playing",
      "is-visible",
      "is-mobile-active",
      "mobile-menu-open",
      "mobile-sheet-open",
      "intro-active",
      "intro-skip",
    ],
    greedy: [/^is-/, /^has-/, /^mobile-/, /^m-/, /^intro-/],
  },
  fontFace: false,
  keyframes: true,
  variables: false,
});

if (!mobilePurgeResult[0]?.css) {
  throw new Error("PurgeCSS did not return the mobile stylesheet");
}

const optimizedCss = minifyCss(purgeResult[0].css, {
  comments: false,
  restructure: true,
}).css;

const optimizedMobileCss = minifyCss(mobilePurgeResult[0].css, {
  comments: false,
  restructure: true,
}).css;

const optimizedJs = await minifyJs(js, {
  compress: { passes: 2 },
  mangle: true,
  format: { comments: false },
});

const optimizedMobileJs = await minifyJs(mobileJs, {
  compress: { passes: 2 },
  mangle: true,
  format: { comments: false },
});

const optimizedGpuCtaJs = await minifyJs(gpuCtaJs, {
  module: true,
  compress: { passes: 2 },
  mangle: true,
  format: { comments: false },
});

const optimizedGpuAtmosphereJs = await minifyJs(gpuAtmosphereJs, {
  module: true,
  compress: { passes: 2 },
  mangle: true,
  format: { comments: false },
});

if (!optimizedJs.code) {
  throw new Error("Terser did not return JavaScript");
}

if (!optimizedMobileJs.code) {
  throw new Error("Terser did not return mobile JavaScript");
}

if (!optimizedGpuCtaJs.code) {
  throw new Error("Terser did not return WebGPU CTA JavaScript");
}

if (!optimizedGpuAtmosphereJs.code) {
  throw new Error("Terser did not return WebGPU Atmosphere JavaScript");
}

await Promise.all([
  writeFile(resolve(pageDir, "styles.min.css"), optimizedCss),
  writeFile(resolve(pageDir, "app.min.js"), optimizedJs.code),
  writeFile(resolve(pageDir, "mobile.min.css"), optimizedMobileCss),
  writeFile(resolve(pageDir, "mobile-app.min.js"), optimizedMobileJs.code),
  writeFile(resolve(pageDir, "webgpu-cta.min.js"), optimizedGpuCtaJs.code),
  writeFile(resolve(pageDir, "webgpu-atmosphere.min.js"), optimizedGpuAtmosphereJs.code),
  // The v3 file remains the editable source; production root serves the same
  // canonical document. All v3 assets use root-absolute URLs, so the markup is
  // valid at both / and the local /v3/ preview path.
  writeFile(canonicalHtml, html),
]);

const cssSaving = 1 - Buffer.byteLength(optimizedCss) / Buffer.byteLength(css);
const mobileCssSaving = 1 - Buffer.byteLength(optimizedMobileCss) / Buffer.byteLength(mobileCss);
process.stdout.write(
  JSON.stringify(
    {
      cssSourceBytes: Buffer.byteLength(css),
      cssProductionBytes: Buffer.byteLength(optimizedCss),
      cssSavingPercent: Number((cssSaving * 100).toFixed(1)),
      jsSourceBytes: Buffer.byteLength(js),
      jsProductionBytes: Buffer.byteLength(optimizedJs.code),
      mobileCssSourceBytes: Buffer.byteLength(mobileCss),
      mobileCssProductionBytes: Buffer.byteLength(optimizedMobileCss),
      mobileCssSavingPercent: Number((mobileCssSaving * 100).toFixed(1)),
      mobileJsSourceBytes: Buffer.byteLength(mobileJs),
      mobileJsProductionBytes: Buffer.byteLength(optimizedMobileJs.code),
      webgpuCtaSourceBytes: Buffer.byteLength(gpuCtaJs),
      webgpuCtaProductionBytes: Buffer.byteLength(optimizedGpuCtaJs.code),
      webgpuAtmosphereSourceBytes: Buffer.byteLength(gpuAtmosphereJs),
      webgpuAtmosphereProductionBytes: Buffer.byteLength(optimizedGpuAtmosphereJs.code),
    },
    null,
    2,
  ) + "\n",
);

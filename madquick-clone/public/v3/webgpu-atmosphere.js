/*
 * Desktop WebGPU Atmosphere — Phase 4 optional decorative layer.
 *
 * ARCHITECTURE (4-Layer Stack):
 *   Layer 1 — Semantic HTML + JSON-LD (always available)
 *   Layer 2 — CSS Design System (always the product)
 *   Layer 3 — JavaScript Interactions (app.js)
 *   Layer 4 — THIS MODULE: optional GPU atmosphere canvas (.bg__gpu)
 *
 * Entry gate: ?gpu=1 + desktop + HTTPS + WebGPU + fine pointer + no reduced-motion.
 * The portfolio is NEVER degraded without this module. CSS mood fields remain
 * the guaranteed premium experience on every browser.
 *
 * What it does:
 *   - One charcoal-to-champagne field, static most of the time
 *   - 600-700ms arrival adjustment when the primary section changes
 *   - Subtle local halo behind selected proof/case artifact
 *   - Max DPR 1.25, ~1.5M physical pixels
 *   - 24 FPS during transitions; paint once and sleep otherwise
 *
 * What it NEVER does:
 *   - No mouse-following particles
 *   - No 3D cards, card physics, or shader text
 *   - No GPU charts, buttons, navigation, or video controls
 *   - No permanent 60 FPS loop
 *   - No Three.js/Babylon dependency
 *   - No visual that makes unsupported browsers look incomplete
 */

/* Section palette: [bloomX, bloomY, bloomRadius, warmth, intensity]
   warmth 0 = cool graphite, 1 = warm gold/champagne */
const SECTION_STATES = {
  hero:     { x: 0.62, y: 0.30, r: 0.55, warmth: 0.85, intensity: 0.38 },
  proof:    { x: 0.40, y: 0.45, r: 0.50, warmth: 0.72, intensity: 0.30 },
  evidence: { x: 0.50, y: 0.50, r: 0.45, warmth: 0.25, intensity: 0.22 },
  skills:   { x: 0.55, y: 0.40, r: 0.48, warmth: 0.65, intensity: 0.26 },
  video:    { x: 0.45, y: 0.55, r: 0.52, warmth: 0.50, intensity: 0.24 },
  case:     { x: 0.48, y: 0.52, r: 0.50, warmth: 0.48, intensity: 0.22 },
  process:  { x: 0.50, y: 0.45, r: 0.42, warmth: 0.30, intensity: 0.18 },
  about:    { x: 0.50, y: 0.50, r: 0.40, warmth: 0.45, intensity: 0.16 },
  faq:      { x: 0.50, y: 0.50, r: 0.38, warmth: 0.20, intensity: 0.14 },
  contact:  { x: 0.55, y: 0.42, r: 0.50, warmth: 0.80, intensity: 0.32 },
};

const DEFAULT_STATE = SECTION_STATES.hero;
const MAX_DPR = 1.25;
const MAX_PIXELS = 1_500_000;
const TRANSITION_MS = 680;
const TRANSITION_FPS = 24;
const FRAME_INTERVAL = 1000 / TRANSITION_FPS;

const shaderSource = /* wgsl */ `
struct Uniforms {
  bloomX: f32,
  bloomY: f32,
  bloomR: f32,
  warmth: f32,
  intensity: f32,
  width: f32,
  height: f32,
  _pad: f32,
}

@group(0) @binding(0) var<uniform> u: Uniforms;

struct VertexOutput {
  @builtin(position) position: vec4<f32>,
  @location(0) uv: vec2<f32>,
}

@vertex
fn vertexMain(@builtin(vertex_index) index: u32) -> VertexOutput {
  var points = array<vec2<f32>, 3>(
    vec2<f32>(-1.0, -1.0),
    vec2<f32>(3.0, -1.0),
    vec2<f32>(-1.0, 3.0)
  );
  var out: VertexOutput;
  let p = points[index];
  out.position = vec4<f32>(p, 0.0, 1.0);
  out.uv = p * 0.5 + 0.5;
  return out;
}

@fragment
fn fragmentMain(in: VertexOutput) -> @location(0) vec4<f32> {
  let uv = in.uv;

  // Charcoal base
  let base = vec3<f32>(0.028, 0.032, 0.042);

  // Warm champagne/gold bloom color
  let warmColor = vec3<f32>(0.85, 0.65, 0.24);
  // Cool graphite-blue bloom color
  let coolColor = vec3<f32>(0.22, 0.28, 0.42);
  let bloomColor = mix(coolColor, warmColor, u.warmth);

  // Radial bloom from section-defined center
  let center = vec2<f32>(u.bloomX, 1.0 - u.bloomY);
  let aspect = u.width / max(u.height, 1.0);
  let scaledUv = vec2<f32>(uv.x * aspect, uv.y);
  let scaledCenter = vec2<f32>(center.x * aspect, center.y);
  let dist = distance(scaledUv, scaledCenter);
  let bloom = exp(-pow(dist / max(u.bloomR, 0.01), 2.0) * 2.8);

  // Secondary subtle fill from opposite corner for depth
  let fillCenter = vec2<f32>(1.0 - u.bloomX, u.bloomY);
  let scaledFill = vec2<f32>(fillCenter.x * aspect, fillCenter.y);
  let fillDist = distance(scaledUv, scaledFill);
  let fill = exp(-pow(fillDist / 0.9, 2.0) * 1.6) * 0.12;

  // Vertical gradient darkening at edges
  let vignette = smoothstep(0.0, 0.15, uv.y) * smoothstep(1.0, 0.85, uv.y);
  let hVignette = smoothstep(0.0, 0.08, uv.x) * smoothstep(1.0, 0.92, uv.x);

  let combined = (bloom + fill) * u.intensity * vignette * hVignette;
  let color = base + bloomColor * combined;

  return vec4<f32>(color, 1.0);
}
`;

function now() {
  return typeof performance !== "undefined" && performance.now ? performance.now() : Date.now();
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function easeInOut(t) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export async function mountDesktopWebGpuAtmosphere({ document: doc, window: win }) {
  const root = doc.documentElement;
  const bgContainer = doc.querySelector(".bg");
  if (!bgContainer) return { enabled: false, reason: "no-bg-container" };

  if (!win.isSecureContext || !win.navigator.gpu || doc.hidden) {
    return { enabled: false, reason: "unsupported" };
  }

  const GPUBufferUsage = win.GPUBufferUsage;
  if (!GPUBufferUsage) return { enabled: false, reason: "missing-buffer-api" };

  let adapter, device;
  try {
    adapter = await win.navigator.gpu.requestAdapter({ powerPreference: "low-power" });
    if (!adapter) return { enabled: false, reason: "no-adapter" };
    device = await adapter.requestDevice();
  } catch (e) {
    return { enabled: false, reason: "device-request-failed" };
  }

  const format = win.navigator.gpu.getPreferredCanvasFormat
    ? win.navigator.gpu.getPreferredCanvasFormat()
    : "bgra8unorm";

  let pipeline, uniformBuffer;
  try {
    const shader = device.createShaderModule({ code: shaderSource });
    uniformBuffer = device.createBuffer({
      size: 32, // 8 floats × 4 bytes
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    pipeline = device.createRenderPipeline({
      layout: "auto",
      vertex: { module: shader, entryPoint: "vertexMain" },
      fragment: {
        module: shader,
        entryPoint: "fragmentMain",
        targets: [{ format }],
      },
      primitive: { topology: "triangle-list" },
    });
  } catch (e) {
    try { device.destroy(); } catch (ignored) {}
    return { enabled: false, reason: "pipeline-failed" };
  }

  // Create the canvas element
  const canvas = doc.createElement("canvas");
  canvas.className = "bg__gpu";
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.pointerEvents = "none";
  // Insert before grain/vignette so those layers sit on top
  bgContainer.insertBefore(canvas, bgContainer.firstChild);

  const context = canvas.getContext("webgpu");
  if (!context) {
    canvas.remove();
    try { device.destroy(); } catch (ignored) {}
    return { enabled: false, reason: "no-canvas-context" };
  }

  // State
  let destroyed = false;
  let canvasW = 0, canvasH = 0;
  let current = { ...DEFAULT_STATE };
  let target = { ...DEFAULT_STATE };
  let transitionStart = 0;
  let transitioning = false;
  let rafId = 0;
  let lastFrameTime = 0;
  let needsPaint = true;

  function configureCanvas() {
    const dpr = Math.min(win.devicePixelRatio || 1, MAX_DPR);
    let w = win.innerWidth;
    let h = win.innerHeight;
    // Cap total pixels
    const totalPixels = w * h * dpr * dpr;
    if (totalPixels > MAX_PIXELS) {
      const scale = Math.sqrt(MAX_PIXELS / totalPixels);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }
    const pw = Math.max(1, Math.round(w * dpr));
    const ph = Math.max(1, Math.round(h * dpr));
    if (pw === canvasW && ph === canvasH) return;
    canvasW = pw;
    canvasH = ph;
    canvas.width = pw;
    canvas.height = ph;
    context.configure({ device, format, alphaMode: "opaque" });
    needsPaint = true;
  }

  function paint() {
    if (destroyed || doc.hidden) return;
    try {
      device.queue.writeBuffer(uniformBuffer, 0, new Float32Array([
        current.x, current.y, current.r, current.warmth,
        current.intensity, canvasW, canvasH, 0,
      ]));
      const encoder = device.createCommandEncoder();
      const pass = encoder.beginRenderPass({
        colorAttachments: [{
          view: context.getCurrentTexture().createView(),
          clearValue: { r: 0.028, g: 0.032, b: 0.042, a: 1 },
          loadOp: "clear",
          storeOp: "store",
        }],
      });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, device.createBindGroup({
        layout: pipeline.getBindGroupLayout(0),
        entries: [{ binding: 0, resource: { buffer: uniformBuffer } }],
      }));
      pass.draw(3);
      pass.end();
      device.queue.submit([encoder.finish()]);
    } catch (e) {
      // On any GPU error, self-remove
      destroy();
    }
  }

  function transitionFrame(time) {
    if (destroyed || doc.hidden) return;
    rafId = 0;

    // Throttle to 24 FPS
    if (time - lastFrameTime < FRAME_INTERVAL) {
      rafId = win.requestAnimationFrame(transitionFrame);
      return;
    }
    lastFrameTime = time;

    const elapsed = time - transitionStart;
    const progress = Math.min(1, elapsed / TRANSITION_MS);
    const eased = easeInOut(progress);

    current.x = lerp(current._fromX, target.x, eased);
    current.y = lerp(current._fromY, target.y, eased);
    current.r = lerp(current._fromR, target.r, eased);
    current.warmth = lerp(current._fromWarmth, target.warmth, eased);
    current.intensity = lerp(current._fromIntensity, target.intensity, eased);

    paint();

    if (progress < 1) {
      rafId = win.requestAnimationFrame(transitionFrame);
    } else {
      transitioning = false;
      current = { ...target };
      paint(); // Final static frame
    }
  }

  function transitionTo(state) {
    if (destroyed) return;
    if (state.x === target.x && state.y === target.y &&
        state.warmth === target.warmth && state.intensity === target.intensity) return;

    // Snapshot current as origin
    current._fromX = current.x;
    current._fromY = current.y;
    current._fromR = current.r;
    current._fromWarmth = current.warmth;
    current._fromIntensity = current.intensity;

    target = { ...state };
    transitionStart = now();
    transitioning = true;

    if (!rafId) {
      lastFrameTime = 0;
      rafId = win.requestAnimationFrame(transitionFrame);
    }
  }

  // Section detection via IntersectionObserver
  const sectionMap = [
    { id: "proof-numbers", key: "proof" },
    { id: "evidence", key: "evidence" },
    { id: "about", key: "about" },
    { id: "process", key: "process" },
    { id: "contact", key: "contact" },
  ];

  // Also detect hero, skills, video, case-studies by class/id patterns
  function findSections() {
    const sections = [];
    // Hero
    const hero = doc.querySelector(".hero, #hero, [data-section='hero']");
    if (hero) sections.push({ el: hero, key: "hero" });

    sectionMap.forEach(({ id, key }) => {
      const el = doc.getElementById(id);
      if (el) sections.push({ el, key });
    });

    // Skills
    const skills = doc.querySelector("#skills, .skills, [data-section='skills']");
    if (skills) sections.push({ el: skills, key: "skills" });

    // Video work
    const video = doc.querySelector("#video-work, .showreel, [data-section='video']");
    if (video) sections.push({ el: video, key: "video" });

    // Case studies
    const caseStudies = doc.querySelector("#case-studies, .case-studies, [data-section='case']");
    if (caseStudies) sections.push({ el: caseStudies, key: "case" });

    // FAQ
    const faq = doc.querySelector("#faq, .faq-section, [data-section='faq']");
    if (faq) sections.push({ el: faq, key: "faq" });

    return sections;
  }

  let observer = null;
  const sections = findSections();

  if (sections.length && "IntersectionObserver" in win) {
    let activeKey = "hero";
    observer = new win.IntersectionObserver((entries) => {
      // Find the most visible section
      let best = null;
      let bestRatio = 0;
      entries.forEach((entry) => {
        if (entry.isIntersecting && entry.intersectionRatio > bestRatio) {
          bestRatio = entry.intersectionRatio;
          best = entry.target;
        }
      });
      if (best) {
        const match = sections.find((s) => s.el === best);
        if (match && match.key !== activeKey) {
          activeKey = match.key;
          const state = SECTION_STATES[match.key] || DEFAULT_STATE;
          transitionTo(state);
        }
      }
    }, {
      threshold: [0.15, 0.35, 0.55],
      rootMargin: "-10% 0px -10% 0px",
    });

    sections.forEach(({ el }) => observer.observe(el));
  }

  // Resize handling
  let resizeTimer = 0;
  function onResize() {
    if (destroyed) return;
    win.clearTimeout(resizeTimer);
    resizeTimer = win.setTimeout(() => {
      configureCanvas();
      if (!transitioning) paint();
    }, 150);
  }
  win.addEventListener("resize", onResize, { passive: true });

  // Visibility handling — stop immediately when hidden
  function onVisibility() {
    if (destroyed) return;
    if (doc.hidden) {
      if (rafId) { win.cancelAnimationFrame(rafId); rafId = 0; }
    } else if (transitioning) {
      lastFrameTime = 0;
      rafId = win.requestAnimationFrame(transitionFrame);
    } else {
      paint(); // Repaint static frame
    }
  }
  doc.addEventListener("visibilitychange", onVisibility);

  // Reduced-motion: if user enables it mid-session, tear down
  const mqReduce = win.matchMedia("(prefers-reduced-motion: reduce)");
  function onReducedMotion(e) {
    if (e.matches) destroy();
  }
  if (mqReduce.addEventListener) mqReduce.addEventListener("change", onReducedMotion);
  else if (mqReduce.addListener) mqReduce.addListener(onReducedMotion);

  // Teardown
  function destroy() {
    if (destroyed) return;
    destroyed = true;
    if (rafId) win.cancelAnimationFrame(rafId);
    if (observer) observer.disconnect();
    win.removeEventListener("resize", onResize);
    doc.removeEventListener("visibilitychange", onVisibility);
    if (mqReduce.removeEventListener) mqReduce.removeEventListener("change", onReducedMotion);
    else if (mqReduce.removeListener) mqReduce.removeListener(onReducedMotion);
    canvas.remove();
    try { device.destroy(); } catch (ignored) {}
    root.dataset.webgpuAtmosphere = "fallback";
  }

  // Device loss handler
  device.lost.then(destroy).catch(destroy);

  // Initial paint
  configureCanvas();
  paint();
  canvas.classList.add("is-ready");
  root.dataset.webgpuAtmosphere = "active";

  return { enabled: true, destroy };
}

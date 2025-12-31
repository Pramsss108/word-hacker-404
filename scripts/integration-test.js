// Dev-only integration test using Puppeteer
// Usage:
// 1) npm install puppeteer
// 2) npm run dev (app at http://localhost:3003)
// 3) node scripts/integration-test.js

const puppeteer = require('puppeteer');

(async () => {
  const url = process.env.APP_URL || 'http://localhost:3003/';
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  page.setDefaultTimeout(60000);

  console.log('Opening', url);
  await page.goto(url, { waitUntil: 'networkidle2' });

  // Navigate to Tools -> Cyber Canvas by clicking the 'Open Tool' button for Cyber Canvas
  await page.waitForSelector('.tool-banner');
  const buttons = await page.$$('.tool-banner .btn');
  let clicked = false;
  for (const b of buttons) {
    const txt = await (await b.getProperty('textContent')).jsonValue();
    if (txt && txt.toLowerCase().includes('open tool')) {
      // try clicking the one matching Cyber Canvas by finding parent name
      const parent = await b.evaluateHandle(node => node.closest('.tool-banner'));
      const name = await (await parent.getProperty('textContent')).jsonValue();
      if (name && name.toLowerCase().includes('cyber canvas')) {
        await b.click();
        clicked = true;
        break;
      }
    }
  }
  if (!clicked) {
    console.warn('Could not find Cyber Canvas button; attempting to open directly');
    await page.goto(url + '#/tools/cyber-canvas', { waitUntil: 'networkidle2' }).catch(()=>{});
  }

  // Wait for prompt input
  await page.waitForSelector('input', { visible: true });
  // Fill prompt and click Generate
  await page.type('input', 'a logo for my cloud kitchen');
  const generateBtn = await page.$x("//button[contains(., 'GENERATE') or contains(., 'Generate')]");
  if (generateBtn.length) await generateBtn[0].click();

  // Wait for generated thumbnails to appear (thumbnails have a vectorize button)
  await page.waitForSelector('.tool-banner-list, .generated-thumb, button', { timeout: 60000 }).catch(()=>{});

  // Poll DebugHub store to see generated blob URLs
  console.log('Waiting for DebugHub snapshot with generated images...');
  let blobs = [];
  for (let i=0;i<30;i++) {
    const store = await page.evaluate(() => {
      const hub = window.__DEBUG_HUB__;
      if (!hub) return null;
      return hub.getStore ? hub.getStore() : hub._store;
    });
    if (store && store.cybercanvas && Array.isArray(store.cybercanvas.generatedImages) && store.cybercanvas.generatedImages.length) {
      blobs = store.cybercanvas.generatedImages;
      break;
    }
    await new Promise(r => setTimeout(r, 1000));
  }

  if (!blobs.length) {
    console.error('No generated blob URLs found in DebugHub after timeout.');
    await browser.close();
    process.exit(2);
  }

  console.log('Found blobs:', blobs);

  // Try fetching first blob URL from page context (should succeed)
  const ok = await page.evaluate(async (b) => {
    try {
      const resp = await fetch(b);
      return resp && resp.ok;
    } catch (e) {
      return { error: String(e) };
    }
  }, blobs[0]);

  console.log('Fetch result for first blob:', ok);

  await browser.close();
  if (ok === true) process.exit(0);
  process.exit(1);
})();

import { chromium } from 'playwright';
import { mkdir, writeFile, copyFile, readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { makeContact, CONTACT_FRAMES } from './video-utils.mjs';
import { createServer } from 'vite';
import { recordingPlugin } from './recording-plugin.mjs';
import { sourceManifest } from './source-manifest.mjs';

const output = path.resolve('tmp/marketing');
const base = process.env.RECORD_URL || 'http://127.0.0.1:5188';
const preview = process.argv.includes('--preview');
const resume = process.argv.includes('--resume');
const wanted = process.argv.find(x => x.startsWith('--format='))?.split('=')[1];
const formats = [{ name: 'landscape', w: 1920, h: 1080 }, { name: 'portrait', w: 1080, h: 1620 }].filter(f => !wanted || f.name === wanted);
if (!formats.length) throw new Error(`Unknown format: ${wanted}`);
const sources = await sourceManifest();
const server = process.env.RECORD_URL ? null : await createServer({ plugins: [recordingPlugin()], server: { host: '127.0.0.1', port: 5188, strictPort: true }, logLevel: 'error' });
await mkdir(output, { recursive: true });
await server?.listen();
const browser = await chromium.launch({
  channel: 'chrome', headless: false,
  args: ['--enable-gpu', '--use-angle=d3d11', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', '--force-device-scale-factor=1', '--hide-scrollbars'],
});
try {
  for (const format of formats) {
    if ((await sourceManifest()).fingerprint !== sources.fingerprint) throw new Error('Game sources changed during capture. Restart to keep both formats on the same version.');
    const context = await browser.newContext({ viewport: { width: format.w, height: format.h }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
    const page = await context.newPage(), errors = [];
    await page.routeWebSocket(/.*/, ws => ws.close());
    page.on('pageerror', error => errors.push(error.stack));
    await page.addInitScript(() => {
      let seed = 7219;
      Math.random = () => { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; };
      window.__captureRafCalls = 0;
      const request = window.requestAnimationFrame.bind(window);
      window.requestAnimationFrame = callback => { window.__captureRafCalls++; return request(callback); };
    });

    await page.route('https://**/*', route => route.fulfill({ status: 200, body: '' }));
    await page.goto(`${base}/?debug=2&nointro&record&shot`, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.bt?.record?.ready, null, { polling: 100 });
    const cover = path.resolve(format.name === 'portrait' ? 'tools/marketing/assets/opening-portrait.png' : 'marketing/covers/cover-landscape-1920x1080.png');
    const coverPng = await readFile(cover);
    await page.evaluate(async ({ w, h, image }) => bt.record.prepare(w, h, image), { ...format, image: `data:image/png;base64,${coverPng.toString('base64')}` });
    const initial = await page.evaluate(() => bt.record.metrics());
    if (/swiftshader|llvmpipe|software/i.test(initial.gpu)) throw new Error(`A hardware GPU is required: ${initial.gpu}`);
    console.log(`${format.name}: ${initial.gpu}`);
    const frozenTime = await page.evaluate(() => bt.game().time);
    await page.waitForTimeout(200);
    if (await page.evaluate(() => bt.game().time) !== frozenTime) throw new Error('Simulation advanced without renderFrame.');
    const hash = createHash('sha256');
    hash.update(sources.fingerprint);
    hash.update(coverPng); hash.update(format.name);
    const frames = path.join(os.tmpdir(), 'baguette-tycoon-marketing-v2', hash.digest('hex').slice(0, 16), format.name);
    const previewDir = path.join(output, 'preview-v2', format.name);
    await mkdir(preview ? previewDir : frames, { recursive: true });
    const session = await context.newCDPSession(page);
    const saved = [];
    for (let n = 0; n < 1020; n++) {
      await page.evaluate(() => renderFrame());
      const selected = CONTACT_FRAMES.includes(n);
      if (!preview || selected) {
        const dest = path.join(preview ? previewDir : frames, `${String(n).padStart(5, '0')}.png`);
        let exists = false;
        if (resume && !preview) { try { await access(dest); exists = true; } catch {} }
        if (!exists) {
          if (n <= 48) await copyFile(cover, dest);
          else {
            const screenshot = await session.send('Page.captureScreenshot', { format: 'png', fromSurface: true, captureBeyondViewport: false, optimizeForSpeed: true });
            await writeFile(dest, Buffer.from(screenshot.data, 'base64'));
          }
        }
        if (selected) saved.push(dest);
      }
      if (!preview && n % 60 === 0) console.log(`${format.name}: ${n}/1020 (${(n / 60).toFixed(1)} s)`);
    }
    if (errors.length) throw new Error(errors.join('\n'));
    const metrics = await page.evaluate(() => ({ ...bt.record.metrics(), rafCalls: window.__captureRafCalls }));
    if (metrics.frame !== 1020 || Math.abs(metrics.takeSimulationSeconds - 17) > 1e-8 || metrics.rafCalls !== 0 || metrics.pixelRatio !== 1) throw new Error(`Invalid capture clock: ${JSON.stringify(metrics)}`);
    if (metrics.stats.earned <= initial.stats.earned || metrics.stats.served <= initial.stats.served) throw new Error('No actual earnings or sales were recorded.');
    await writeFile(path.join(output, `${preview ? 'preview-v2-' : ''}capture-${format.name}.json`), JSON.stringify({ ...metrics, sourceFingerprint: sources.fingerprint, viewport: format, opening: 'Generated cover held for 0.8 s, then 0.55 s dissolve into real-time gameplay', sourceFirstFrameSha256: createHash('sha256').update(await readFile(saved[0])).digest('hex'), coverSha256: createHash('sha256').update(coverPng).digest('hex'), framesDirectory: frames, baselineStats: initial.stats }, null, 2));
    await makeContact(saved, format.name, path.join(output, `${preview ? 'preview-v2-' : ''}contact-${format.name}.png`));
    if (!preview) {
      const video = path.resolve('marketing/videos', `video-${format.name}-${format.w}x${format.h}.mp4`);
      const encode = spawnSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', '-framerate', '60', '-i', path.join(frames, '%05d.png'), '-frames:v', '1020', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-preset', 'veryfast', '-an', '-movflags', '+faststart', video], { stdio: 'inherit' });
      if (encode.status !== 0) throw new Error(`ffmpeg failed (${encode.status})`);
      console.log(`Saved ${video}`);
    }
    await context.close();
  }
  if ((await sourceManifest()).fingerprint !== sources.fingerprint) throw new Error('Sources changed during capture; the take must be regenerated.');
  await writeFile(path.join(output, `${preview ? 'preview-' : ''}capture-source-manifest.json`), JSON.stringify(sources, null, 2));
} finally { await browser.close(); await server?.close(); }

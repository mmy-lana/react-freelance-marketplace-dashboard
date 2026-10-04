/**
 * Headless Chrome verification harness.
 *
 * Boots the production build with `vite preview`, drives a real Chromium
 * instance (never the user's browser session), and asserts per-phase DOM
 * contracts at every breakpoint in the specification:
 *   360px, 390px, 430px, 768px, 1280px.
 *
 * Usage: node scripts/verify.mjs <phase>
 * Exit code 0 = all checks passed.
 */

import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import puppeteer from 'puppeteer-core';

const PHASE = process.argv[2] ?? '1';
const PORT = Number(process.env.VERIFY_PORT ?? 4180);
const BASE_URL = `http://127.0.0.1:${PORT}/`;
const CHROME_PATH =
  process.env.CHROME_PATH ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const OUTPUT_DIR = path.resolve('.verify', `phase-${PHASE}`);

const VIEWPORTS = [
  { name: '360', width: 360, height: 740, expectMobileNav: true },
  { name: '390', width: 390, height: 844, expectMobileNav: true },
  { name: '430', width: 430, height: 932, expectMobileNav: true },
  { name: '768', width: 768, height: 1024, expectMobileNav: false },
  { name: '1280', width: 1280, height: 900, expectMobileNav: false },
];

/** DOM contracts per phase. Every entry must hold at every viewport. */
const PHASE_ASSERTIONS = {
  1: [
    { selector: '[data-testid="app-shell"]', description: 'App shell mounted' },
    { selector: '[data-testid="foundation-view"]', description: 'Phase 1 foundation view rendered' },
    { selector: '[data-testid="storage-report"] li', minCount: 5, description: 'Storage integrity report rows' },
    { selector: '[data-testid="category-coverage"] li', minCount: 7, description: 'Category coverage rows' },
    { text: 'Phase 1', description: 'Phase badge visible' },
  ],
};

const failures = [];
const notes = [];

function recordFailure(scope, message) {
  failures.push(`[${scope}] ${message}`);
}

async function waitForServer(url, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return true;
      }
    } catch {
      // server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error(`Preview server did not become ready at ${url}`);
}

async function run() {
  await rm(OUTPUT_DIR, { recursive: true, force: true });
  await mkdir(OUTPUT_DIR, { recursive: true });

  const preview = spawn(
    process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
    ['exec', 'vite', 'preview', '--port', String(PORT), '--strictPort', '--host', '127.0.0.1'],
    { stdio: ['ignore', 'pipe', 'pipe'] }
  );
  preview.stdout.on('data', (chunk) => process.stdout.write(`[preview] ${chunk}`));
  preview.stderr.on('data', (chunk) => process.stderr.write(`[preview:err] ${chunk}`));

  let browser;
  try {
    await waitForServer(BASE_URL);

    browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      defaultViewport: null,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--hide-scrollbars', '--force-device-scale-factor=1'],
    });

    for (const viewport of VIEWPORTS) {
      const scope = `phase${PHASE}@${viewport.name}px`;
      const page = await browser.newPage();
      await page.setViewport({
        width: viewport.width,
        height: viewport.height,
        deviceScaleFactor: 1,
        isMobile: viewport.width < 768,
        hasTouch: viewport.width < 768,
      });

      const consoleErrors = [];
      const failedRequests = [];
      page.on('console', (message) => {
        if (message.type() === 'error') {
          consoleErrors.push(message.text());
        }
      });
      page.on('pageerror', (error) => consoleErrors.push(`pageerror: ${error.message}`));
      page.on('response', (response) => {
        if (response.status() >= 400) {
          failedRequests.push(`${response.status()} ${response.url()}`);
        }
      });
      page.on('requestfailed', (request) => {
        failedRequests.push(`failed ${request.url()} (${request.failure()?.errorText ?? 'unknown'})`);
      });

      await page.goto(BASE_URL, { waitUntil: 'networkidle0', timeout: 30_000 });
      await page.waitForSelector('[data-testid="app-shell"]', { timeout: 15_000 });
      await new Promise((resolve) => setTimeout(resolve, 350));

      // 1. No runtime console/page errors or failed network requests.
      if (consoleErrors.length > 0) {
        recordFailure(scope, `console errors: ${consoleErrors.join(' | ')}`);
      }
      if (failedRequests.length > 0) {
        recordFailure(scope, `failed requests: ${failedRequests.join(' | ')}`);
      }

      // 2. No horizontal overflow at any breakpoint.
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        const offenders = [];
        if (doc.scrollWidth > window.innerWidth + 1) {
          for (const element of Array.from(document.body.querySelectorAll('*'))) {
            const rect = element.getBoundingClientRect();
            if (rect.right > window.innerWidth + 1 && rect.width > 8) {
              offenders.push(
                `${element.tagName.toLowerCase()}.${String(element.className).slice(0, 60)} right=${Math.round(rect.right)}`
              );
            }
            if (offenders.length >= 5) {
              break;
            }
          }
          return { scrollWidth: doc.scrollWidth, innerWidth: window.innerWidth, offenders };
        }
        return { scrollWidth: doc.scrollWidth, innerWidth: window.innerWidth, offenders };
      });
      if (overflow.scrollWidth > overflow.innerWidth + 1) {
        recordFailure(
          scope,
          `horizontal overflow ${overflow.scrollWidth}px > ${overflow.innerWidth}px :: ${overflow.offenders.join(' ; ') || 'unknown offender'}`
        );
      }

      // 3. No broken images.
      const brokenImages = await page.evaluate(() =>
        Array.from(document.images)
          .filter((image) => !image.complete || image.naturalWidth === 0)
          .map((image) => image.currentSrc || image.src)
      );
      if (brokenImages.length > 0) {
        recordFailure(scope, `broken images: ${brokenImages.join(', ')}`);
      }

      // 4. Phase specific DOM contracts.
      for (const assertion of PHASE_ASSERTIONS[PHASE] ?? []) {
        if (assertion.selector) {
          const count = await page.$$eval(assertion.selector, (nodes) => nodes.length);
          const minimum = assertion.minCount ?? 1;
          if (count < minimum) {
            recordFailure(
              scope,
              `expected >=${minimum} of "${assertion.selector}" (${assertion.description}), found ${count}`
            );
          }
        }
        if (assertion.text) {
          const found = await page.evaluate((needle) => document.body.innerText.includes(needle), assertion.text);
          if (!found) {
            recordFailure(scope, `expected text "${assertion.text}" (${assertion.description ?? 'text check'})`);
          }
        }
      }

      // 5. Touch target sizing on mobile viewports.
      if (viewport.expectMobileNav) {
        const smallTargets = await page.evaluate(() => {
          const results = [];
          const elements = Array.from(document.querySelectorAll('button, a[href], input, select, [role="button"]'));
          for (const element of elements) {
            const rect = element.getBoundingClientRect();
            if (rect.width === 0 || rect.height === 0) {
              continue;
            }
            if (rect.height < 44) {
              const label = (element.textContent ?? element.getAttribute('aria-label') ?? element.tagName)
                .trim()
                .slice(0, 40);
              results.push(`${label} (${Math.round(rect.width)}x${Math.round(rect.height)})`);
            }
          }
          return results.slice(0, 10);
        });
        if (smallTargets.length > 0) {
          recordFailure(scope, `touch targets below 44px: ${smallTargets.join(', ')}`);
        }
      }

      await page.screenshot({ path: path.join(OUTPUT_DIR, `phase-${PHASE}-${viewport.name}.png`), fullPage: false });
      notes.push(`${scope}: checked`);
      await page.close();
    }
  } finally {
    if (browser) {
      await browser.close();
    }
    preview.kill('SIGTERM');
  }

  console.log('\n=== headless verification summary ===');
  notes.forEach((note) => console.log(`  ok   ${note}`));
  if (failures.length > 0) {
    console.log('\nFAILURES:');
    failures.forEach((failure) => console.log(`  FAIL ${failure}`));
    process.exitCode = 1;
    return;
  }
  console.log('\nAll checks passed.');
}

run().catch((error) => {
  console.error('Verification harness failed:', error);
  process.exitCode = 1;
});
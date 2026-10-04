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

/**
 * DOM contracts per phase.
 *
 * `checks` run on the freshly loaded page, `actions` run afterwards as an
 * ordered interaction script (click / type / press / wait / assert-visible /
 * assert-count / assert-text) so interactive contracts are exercised for real.
 */
const PHASE_ASSERTIONS = {
  1: {
    checks: [
      { selector: '[data-testid="app-shell"]', description: 'App shell mounted' },
      { selector: '[data-testid="foundation-view"]', description: 'Phase 1 foundation view rendered' },
      { selector: '[data-testid="storage-report"] li', minCount: 5, description: 'Storage integrity report rows' },
      { selector: '[data-testid="category-coverage"] li', minCount: 7, description: 'Category coverage rows' },
      { text: 'Phase 1', description: 'Phase badge visible' },
    ],
    actions: [],
  },
  2: {
    checks: [
      { selector: '[data-testid="app-shell"]', description: 'App shell mounted' },
      { selector: '[data-testid="design-system-view"]', description: 'Phase 2 design system view rendered' },
      { selector: '[data-testid="btn-primary"]', description: 'Primary button' },
      { selector: '[data-testid="btn-secondary"]', description: 'Secondary button' },
      { selector: '[data-testid="btn-outline"]', description: 'Outline button' },
      { selector: '[data-testid="btn-danger"]', description: 'Danger button' },
      { selector: '[data-testid="btn-anchor"]', description: 'Anchor-mode button' },
      { selector: '[data-testid="badge-levels"] [data-testid^="seller-level-"]', minCount: 4, description: 'Seller level badges' },
      {
        selector: '[data-testid="badge-order-statuses"] [data-testid^="order-status-"]',
        minCount: 6,
        description: 'Order status badges',
      },
      { selector: '[data-testid="badge-gig-statuses"] [data-testid^="gig-status-"]', minCount: 3, description: 'Gig status badges' },
      { selector: '[data-testid="avatar-fallback"] [data-testid="avatar-monogram"]', description: 'Avatar monogram fallback on image error' },
      { selector: '[data-testid="input-search"]', description: 'Search input' },
      { selector: '[data-testid="select-category"]', description: 'Category select' },
      { selector: '[role="tablist"][data-testid="tabs-density"]', description: 'Tab list' },
      { selector: '[role="tab"]', minCount: 3, description: 'Tabs rendered' },
      { selector: '[data-testid="skeleton-grid"]', description: 'Skeleton grid' },
      { selector: '[data-testid="skeleton-list"]', description: 'Skeleton list' },
      { text: 'Phase 2', description: 'Phase badge visible' },
    ],
    actions: [
      { type: 'type', selector: '[data-testid="input-search"]', value: 'logo design', description: 'typing into search input' },
      { type: 'assertValue', selector: '[data-testid="input-search"]', value: 'logo design', description: 'search input is controlled' },
      { type: 'click', selector: '[role="tab"][id="tab-queue"]', description: 'switch tab' },
      { type: 'assertText', selector: '[data-testid="active-tab-label"]', value: 'queue', description: 'tab selection propagated' },
      { type: 'press', key: 'Tab', description: 'keyboard navigation stays inside the tab list' },
      { type: 'click', selector: '[data-testid="open-modal"]', description: 'open modal' },
      { type: 'assertVisible', selector: '[role="dialog"]', description: 'modal dialog opened' },
      { type: 'assertText', selector: '[role="dialog"]', value: 'Deliver order GH-0001B', description: 'modal title rendered' },
      { type: 'press', key: 'Escape', description: 'escape closes modal' },
      { type: 'waitForHidden', selector: '[role="dialog"]', description: 'modal closed on Escape' },
      { type: 'assertNoSelector', selector: '[role="dialog"]', description: 'no orphan dialog in the DOM' },
    ],
  },
  3: {
    checks: [
      { selector: '[data-testid="app-shell"]', description: 'App shell mounted' },
      { selector: '[data-testid="compound-view"]', description: 'Phase 3 compound view rendered' },
      { selector: '[data-testid="gig-card-grid"] [data-gig-id]', minCount: 3, description: 'Gig cards rendered' },
      { selector: '[data-testid="gig-card-grid"] img', minCount: 3, description: 'Gig media loaded' },
      { selector: '[data-testid="package-matrix"] [data-testid^="tier-"]', minCount: 3, description: 'Package tiers rendered' },
      { selector: '[data-testid="metric-grid"] [data-trend]', minCount: 4, description: 'Metric widgets rendered' },
      { selector: '[data-testid="metric-grid"] svg path', minCount: 4, description: 'Sparklines drawn' },
      { selector: '[data-testid="timeline-active"] ol[aria-label="Order lifecycle"] li', minCount: 4, description: 'Timeline stages rendered' },
      { selector: '[data-testid="countdown-overdue"] [role="timer"]', description: 'Overdue countdown rendered' },
      { selector: '[data-testid="section-filter"]', description: 'Filter section rendered' },
      { text: 'Phase 3', description: 'Phase badge visible' },
    ],
    actions: [
      { type: 'assertCount', selector: '[data-testid="countdown-overdue"][data-overdue="true"]', minCount: 1, description: 'overdue flag set' },
      { type: 'click', selector: '[data-testid="tier-rail"] [data-testid="tier-premium"] button', description: 'choose premium tier', maxWidth: 767 },
      { type: 'assertText', selector: '[data-testid="selected-tier"]', value: 'premium', description: 'tier selection propagated', maxWidth: 767 },
      { type: 'click', selector: '[data-testid="tier-grid"] [data-testid="tier-basic"] button', description: 'choose basic tier', minWidth: 768 },
      { type: 'assertText', selector: '[data-testid="selected-tier"]', value: 'basic', description: 'tier selection propagated (desktop)', minWidth: 768 },
      { type: 'click', selector: '[data-testid="gig-card-grid"] [data-gig-id] button[aria-label^="Add"]', description: 'select a gig' },
      { type: 'assertText', selector: '[data-testid="selected-count"]', value: '1', description: 'selection count updated' },
      { type: 'click', selector: '[data-testid="open-filter-drawer"]', description: 'open filter drawer', maxWidth: 767 },
      { type: 'assertVisible', selector: '[data-testid="filter-drawer-panel"]', description: 'filter drawer opened', maxWidth: 767 },
      { type: 'click', selector: '[data-testid="filter-drawer-panel"] [data-testid="filter-level-top_rated"]', description: 'toggle seller tier filter', maxWidth: 767 },
      { type: 'click', selector: '[data-testid="filter-apply"]', description: 'apply filters', maxWidth: 767 },
      { type: 'waitForHidden', selector: '[data-testid="filter-drawer-panel"]', description: 'filter drawer closed', maxWidth: 767 },
      { type: 'assertCount', selector: '[data-testid="order-table-body"] tr', minCount: 5, description: 'desktop ledger rows', minWidth: 768 },
      { type: 'assertCount', selector: '[data-testid="order-card-list"] article', minCount: 3, description: 'mobile order cards', maxWidth: 767 },
    ],
  },
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

      // 3. No broken images (lazy images that have not entered the viewport are ignored).
      const brokenImages = await page.evaluate(() =>
        Array.from(document.images)
          .filter((image) => image.complete && image.naturalWidth === 0)
          .map((image) => (image.currentSrc || image.src).slice(0, 120))
      );
      if (brokenImages.length > 0) {
        recordFailure(scope, `broken images: ${brokenImages.join(', ')}`);
      }

      // 4. Phase specific DOM contracts.
      const assertions = PHASE_ASSERTIONS[PHASE] ?? { checks: [], actions: [] };
      for (const assertion of assertions.checks ?? []) {
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

      // 5. Interaction script for the current phase.
      for (const action of assertions.actions ?? []) {
        if (typeof action.minWidth === 'number' && viewport.width < action.minWidth) {
          continue;
        }
        if (typeof action.maxWidth === 'number' && viewport.width > action.maxWidth) {
          continue;
        }
        try {
          switch (action.type) {
            case 'click': {
              await page.waitForSelector(action.selector, { visible: true, timeout: 10_000 });
              await page.click(action.selector);
              await new Promise((resolve) => setTimeout(resolve, 220));
              break;
            }
            case 'type': {
              await page.waitForSelector(action.selector, { visible: true, timeout: 10_000 });
              await page.click(action.selector, { clickCount: 3 });
              await page.type(action.selector, action.value, { delay: 12 });
              await new Promise((resolve) => setTimeout(resolve, 220));
              break;
            }
            case 'press': {
              await page.keyboard.press(action.key);
              await new Promise((resolve) => setTimeout(resolve, 220));
              break;
            }
            case 'assertValue': {
              const value = await page.$eval(action.selector, (node) => node.value ?? '');
              if (value !== action.value) {
                recordFailure(scope, `expected value "${action.value}" (${action.description}), found "${value}"`);
              }
              break;
            }
            case 'assertText': {
              const text = await page.$eval(action.selector, (node) => node.textContent ?? '');
              if (!text.includes(action.value)) {
                recordFailure(scope, `expected text containing "${action.value}" (${action.description}), found "${text}"`);
              }
              break;
            }
            case 'assertVisible': {
              await page.waitForSelector(action.selector, { visible: true, timeout: 10_000 });
              break;
            }
            case 'assertCount': {
              const count = await page.$$eval(action.selector, (nodes) => nodes.length);
              const minimum = action.minCount ?? 1;
              if (count < minimum) {
                recordFailure(scope, `expected >=${minimum} of "${action.selector}" (${action.description}), found ${count}`);
              }
              break;
            }
            case 'assertNoSelector': {
              const count = await page.$$eval(action.selector, (nodes) => nodes.length);
              if (count > 0) {
                recordFailure(scope, `unexpected ${count} match(es) for "${action.selector}" (${action.description})`);
              }
              break;
            }
            case 'waitForHidden': {
              await page.waitForSelector(action.selector, { hidden: true, timeout: 10_000 });
              break;
            }
            default:
              recordFailure(scope, `unknown action type "${action.type}"`);
          }
        } catch (error) {
          recordFailure(scope, `action "${action.type} ${action.selector ?? action.key ?? ''}" failed: ${error.message}`);
          break;
        }
      }

      // 6. No console errors introduced by the interaction script.
      if (consoleErrors.length > 0) {
        recordFailure(scope, `console errors after interactions: ${consoleErrors.join(' | ')}`);
      }
      if (failedRequests.length > 0) {
        recordFailure(scope, `failed requests after interactions: ${failedRequests.join(' | ')}`);
      }

      // 7. No horizontal overflow after the interaction script.
      const postOverflow = await page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      }));
      if (postOverflow.scrollWidth > postOverflow.innerWidth + 1) {
        recordFailure(
          scope,
          `horizontal overflow after interactions ${postOverflow.scrollWidth}px > ${postOverflow.innerWidth}px`
        );
      }

      // 8. Touch target sizing on mobile viewports.
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
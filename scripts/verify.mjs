/**
 * Headless Chrome verification harness.
 *
 * Boots the production build with `vite preview`, drives a real Chromium
 * instance (never the user's browser session), and asserts per-phase DOM
 * contracts at every breakpoint in the specification:
 *   360px, 390px, 430px, 768px, 1280px.
 *
 * Each viewport runs in its own incognito browser context, so persisted
 * localStorage state never leaks between runs.
 *
 * Phases 1-4 keep the contracts that were green when that phase landed;
 * phase 5 is the contract for the assembled application shell and is what
 * `pnpm run verify` executes by default.
 *
 * Usage: node scripts/verify.mjs <phase>
 * Exit code 0 = all checks passed.
 */

import { spawn } from 'node:child_process';
import { mkdir, readdir, rm } from 'node:fs/promises';
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
  4: {
    checks: [
      { selector: '[data-testid="app-shell"]', description: 'App shell mounted' },
      { selector: '[data-testid="gig-explorer"]', description: 'Gig explorer rendered' },
      { selector: '[data-testid="explorer-grid"] [data-gig-id]', minCount: 12, description: 'Seed gigs rendered' },
      { selector: '[data-testid^="category-pill-"]', minCount: 8, description: 'Category ribbon rendered' },
      { selector: '[data-testid="explorer-search"]', description: 'Search field rendered' },
      { text: 'Phase 4', description: 'Phase badge visible' },
    ],
    actions: [
      { type: 'assertText', selector: '[data-testid="explorer-result-count"]', value: '12', description: 'all 12 seed gigs visible' },
      { type: 'type', selector: '[data-testid="explorer-search"]', value: 'design', description: 'type a search query' },
      { type: 'wait', ms: 450, description: 'wait for the 300ms debounce' },
      { type: 'assertCount', selector: '[data-testid="explorer-grid"] [data-gig-id]', maxCount: 11, minCount: 1, description: 'debounced search narrowed the grid' },
      { type: 'click', selector: '[aria-label="Clear search query"]', description: 'clear the search' },
      { type: 'wait', ms: 450, description: 'wait for the debounce to settle' },
      { type: 'assertCount', selector: '[data-testid="explorer-grid"] [data-gig-id]', minCount: 12, description: 'grid restored after clearing' },
      { type: 'click', selector: '[data-testid="category-pill-Music & Audio"]', description: 'filter by a single category' },
      { type: 'assertCount', selector: '[data-testid="explorer-grid"] [data-gig-id]', minCount: 1, maxCount: 1, description: 'category facet applied' },
      { type: 'click', selector: '[data-testid="category-pill-All"]', description: 'reset category facet' },
      { type: 'type', selector: '[data-testid="explorer-search"]', value: 'zzzznotfound', description: 'search with no matches' },
      { type: 'wait', ms: 450, description: 'wait for the debounce' },
      { type: 'assertVisible', selector: '[data-testid="explorer-empty-state"]', description: 'empty state rendered' },
      { type: 'click', selector: '[data-testid="explorer-reset-filters"]', description: 'reset filters from the empty state' },
      { type: 'wait', ms: 450, description: 'wait for the debounce after reset' },
      { type: 'assertCount', selector: '[data-testid="explorer-grid"] [data-gig-id]', minCount: 12, description: 'filters reset restored every gig' },
      { type: 'click', selector: '[data-testid="explorer-open-filters"]', description: 'open the mobile filter drawer', maxWidth: 767 },
      { type: 'assertVisible', selector: '[data-testid="explorer-filter-drawer"] [data-testid="filter-drawer-panel"]', description: 'filter drawer visible', maxWidth: 767 },
      { type: 'select', selector: '[data-testid="explorer-filter-drawer"] [data-testid="filter-delivery"]', value: '7', description: 'delivery facet', maxWidth: 767 },
      { type: 'click', selector: '[data-testid="filter-apply"]', description: 'apply drawer filters', maxWidth: 767 },
      { type: 'waitForHidden', selector: '[data-testid="explorer-filter-drawer"] [data-testid="filter-drawer-panel"]', description: 'drawer closed', maxWidth: 767 },
      { type: 'click', selector: '[role="tab"][id="tab-dashboard"]', description: 'open the seller dashboard' },
      { type: 'assertVisible', selector: '[data-testid="seller-dashboard"]', description: 'seller dashboard rendered' },
      { type: 'assertCount', selector: '[data-testid="seller-metric-grid"] [data-trend]', minCount: 4, description: 'four KPI tiles' },
      { type: 'assertCount', selector: '[data-testid="progression-requirements"] [data-testid="progression-requirement"]', minCount: 6, description: 'six tier requirements' },
      { type: 'assertDisabled', selector: '[data-testid="promote-seller"]', description: 'promotion blocked while requirements are unmet' },
      { type: 'assertCount', selector: '[data-testid="order-queue"] tbody tr', minCount: 3, description: 'seller order rows', minWidth: 768 },
      { type: 'assertCount', selector: '[data-testid="order-queue"] .md\\:hidden article', minCount: 3, description: 'seller order cards', maxWidth: 767 },
      { type: 'click', selector: '[data-testid="order-open-order-001"]', description: 'open the order workspace' },
      { type: 'assertVisible', selector: '[data-testid="order-detail-panel"]', description: 'order detail panel opened' },
      { type: 'click', selector: '[data-testid="order-detail-close"]', description: 'close the order workspace' },
      { type: 'click', selector: '[data-testid="order-action-order-001"]', description: 'open the delivery dialog' },
      { type: 'assertVisible', selector: '[data-testid="delivery-modal"]', description: 'delivery dialog opened' },
      { type: 'click', selector: '[data-testid="delivery-submit"]', description: 'attempt delivery without files' },
      { type: 'assertVisible', selector: '[data-testid="delivery-error"]', description: 'delivery validation surfaced an error' },
      { type: 'click', selector: '[data-testid="delivery-cancel"]', description: 'close the delivery dialog' },
      { type: 'assertCount', selector: '[data-testid="order-queue"] tr[data-order-status="pending_requirements"]', maxCount: 0, minCount: 0, description: 'no invalid transition was applied', minWidth: 768 },
      { type: 'click', selector: '[role="tab"][id="tab-explorer"]', description: 'return to the explorer' },
      { type: 'click', selector: '[data-testid="explorer-create-gig"]', description: 'open the gig creation drawer' },
      { type: 'assertVisible', selector: '[data-testid="gig-creation-drawer"]', description: 'creation drawer visible' },
      { type: 'type', selector: '[data-testid="gig-title-input"]', value: 'I will build a production ready design system in Figma', description: 'gig title' },
      { type: 'type', selector: '[data-testid="gig-subcategory-input"]', value: 'Design Systems', description: 'subcategory' },
      { type: 'type', selector: '[data-testid="gig-summary-input"]', value: 'A token driven design system with components, documentation and a clickable prototype.', description: 'summary' },
      { type: 'click', selector: '[data-testid="gig-creation-next"]', description: 'go to the package step' },
      { type: 'type', selector: '[data-testid="pkg-basic-price"]', value: '50', description: 'basic price' },
      { type: 'type', selector: '[data-testid="pkg-standard-price"]', value: '150', description: 'standard price' },
      { type: 'type', selector: '[data-testid="pkg-premium-price"]', value: '400', description: 'premium price' },
      { type: 'type', selector: '[data-testid="pkg-basic-features"]', value: 'Component audit\nSource files', description: 'basic features' },
      { type: 'type', selector: '[data-testid="pkg-standard-features"]', value: '60 components\nDocumentation', description: 'standard features' },
      { type: 'type', selector: '[data-testid="pkg-premium-features"]', value: 'Prototype\nUsability test', description: 'premium features' },
      { type: 'click', selector: '[data-testid="gig-creation-next"]', description: 'go to the review step' },
      { type: 'click', selector: '[data-testid="gig-creation-submit"]', description: 'publish the gig' },
      { type: 'wait', ms: 400, description: 'wait for the optimistic insert' },
      { type: 'assertVisible', selector: '[data-testid="toast"]', description: 'success toast raised' },
      { type: 'assertCount', selector: '[data-testid="explorer-grid"] [data-gig-id]', minCount: 13, description: 'new gig added to the grid' },
      { type: 'assertNoSelector', selector: '[data-gig-id^="gig-optimistic-"]', description: 'optimistic id replaced by the persisted id' },
      { type: 'assertNoSelector', selector: '[data-testid="gig-creation-drawer"]', description: 'creation drawer closed after publish' },
    ],
  },
  5: {
    checks: [
      { selector: '[data-testid="app-shell"]', description: 'App shell mounted' },
      { selector: '[data-testid="app-header"]', description: 'Header rendered' },
      { selector: '[data-testid="main-content"][data-active-view="explorer"]', description: 'Explorer is the default view' },
      { selector: '[data-testid="explorer-grid"] [data-gig-id]', minCount: 12, description: 'Explorer grid rendered' },
      { text: 'Gig Explorer', description: 'Explorer heading visible' },
    ],
    actions: [
      { type: 'assertPaddingBottom', selector: '[data-testid="main-content"]', minPadding: 80, description: 'content clears the fixed bottom navigation', maxWidth: 767 },
      { type: 'assertBox', selector: '[data-testid="mobile-nav"]', minHeight: 56, maxHeight: 57, description: 'mobile nav matches --nav-bottom-height', maxWidth: 767 },
      { type: 'assertGridColumns', selector: '[data-testid="explorer-grid"]', minColumns: 1, maxColumns: 1, description: 'single column grid on small phones', maxWidth: 430 },
      { type: 'assertGridColumns', selector: '[data-testid="explorer-grid"]', minColumns: 2, maxColumns: 2, description: 'two column grid on tablet', minWidth: 768, maxWidth: 1023 },
      { type: 'assertGridColumns', selector: '[data-testid="explorer-grid"]', minColumns: 3, maxColumns: 3, description: 'three column grid on desktop', minWidth: 1024 },
      { type: 'click', selector: '[data-testid="gig-toggle-gig-seo-authority"]', description: 'pause own listing' },
      { type: 'assertCount', selector: '[data-gig-id="gig-seo-authority"] [data-testid="gig-status-paused"]', minCount: 1, description: 'listing shows the paused badge' },
      { type: 'click', selector: '[data-testid="gig-toggle-gig-seo-authority"]', description: 'resume own listing' },
      { type: 'assertCount', selector: '[data-gig-id="gig-seo-authority"] [data-testid="gig-status-active"]', minCount: 1, description: 'listing is active again' },
      { type: 'click', selector: '[data-testid="notifications-button"]', description: 'open notifications' },
      { type: 'assertVisible', selector: '[data-testid="notifications-popover"]', description: 'notifications popover opened' },
      { type: 'assertCount', selector: '[data-testid="notification-item"]', minCount: 5, description: 'seeded notifications listed' },
      { type: 'click', selector: '[data-testid="notifications-mark-read"]', description: 'mark all as read' },
      { type: 'assertNoSelector', selector: '[data-testid="notifications-count"]', description: 'unread badge cleared' },
      { type: 'press', key: 'Escape', description: 'dismiss the popover with Escape' },
      { type: 'waitForHidden', selector: '[data-testid="notifications-popover"]', description: 'popover closed' },
      { type: 'click', selector: '[data-testid="mode-buyer"]', description: 'switch to buyer mode', minWidth: 640 },
      { type: 'assertVisible', selector: '[data-testid="main-content"][data-seller-mode="buyer"]', description: 'buyer mode applied', minWidth: 640 },
      { type: 'click', selector: '[data-testid="mode-seller"]', description: 'switch back to seller mode', minWidth: 640 },
      { type: 'assertVisible', selector: '[data-testid="main-content"][data-seller-mode="seller"]', description: 'seller mode restored', minWidth: 640 },
      { type: 'type', selector: '[data-testid="header-search"]', value: 'video', description: 'header search query', minWidth: 1024 },
      { type: 'wait', ms: 450, description: 'wait for the debounce' },
      { type: 'assertCount', selector: '[data-testid="explorer-grid"] [data-gig-id]', minCount: 1, maxCount: 4, description: 'header search narrowed the grid', minWidth: 1024 },
      { type: 'click', selector: '[aria-label="Clear search query"]', description: 'clear the header search', minWidth: 1024 },
      { type: 'wait', ms: 450, description: 'wait for the debounce', minWidth: 1024 },
      { type: 'click', selector: '[data-testid="mobile-nav-orders"]', description: 'navigate to orders (mobile nav)', maxWidth: 767 },
      { type: 'assertVisible', selector: '[data-testid="main-content"][data-active-view="orders"]', description: 'orders view active (mobile)', maxWidth: 767 },
      { type: 'assertVisible', selector: '[data-testid="order-queue"]', description: 'order queue rendered (mobile)', maxWidth: 767 },
      { type: 'click', selector: '[data-testid="nav-orders"]', description: 'navigate to orders (desktop nav)', minWidth: 768 },
      { type: 'assertVisible', selector: '[data-testid="main-content"][data-active-view="orders"]', description: 'orders view active (desktop)', minWidth: 768 },
      { type: 'assertCount', selector: '[data-testid="order-queue"] tbody tr', minCount: 5, description: 'full order ledger rows on desktop', minWidth: 1024 },
      { type: 'click', selector: '[data-testid="mobile-nav-earnings"]', description: 'navigate to earnings (mobile nav)', maxWidth: 767 },
      { type: 'assertVisible', selector: '[data-testid="earnings-view"]', description: 'earnings view active (mobile)', maxWidth: 767 },
      { type: 'click', selector: '[data-testid="nav-earnings"]', description: 'navigate to earnings (desktop nav)', minWidth: 768 },
      { type: 'assertVisible', selector: '[data-testid="earnings-view"]', description: 'earnings view active (desktop)', minWidth: 768 },
      { type: 'assertCount', selector: '[data-testid="earnings-balances"] article', minCount: 3, description: 'three balance tiles' },
      { type: 'assertCount', selector: '[data-testid="ledger-table-body"] tr', minCount: 6, description: 'ledger rows on desktop', minWidth: 768 },
      { type: 'assertCount', selector: '[data-testid="ledger-card-list"] li', minCount: 6, description: 'ledger cards on mobile', maxWidth: 767 },
      { type: 'expectDownload', selector: '[data-testid="earnings-export-csv"]', description: 'CSV ledger export' },
      { type: 'click', selector: '[data-testid="mobile-nav-profile"]', description: 'navigate to profile (mobile nav)', maxWidth: 767 },
      { type: 'assertVisible', selector: '[data-testid="profile-view"]', description: 'profile view active (mobile)', maxWidth: 767 },
      { type: 'click', selector: '[data-testid="nav-profile"]', description: 'navigate to profile (desktop nav)', minWidth: 768 },
      { type: 'assertVisible', selector: '[data-testid="profile-view"]', description: 'profile view active (desktop)', minWidth: 768 },
      { type: 'assertCount', selector: '[data-testid="storage-report-item"]', minCount: 5, description: 'storage integrity report rendered' },
      { type: 'assertVisible', selector: '[data-testid="profile-identity"]', description: 'seller identity card rendered' },
      { type: 'click', selector: '[data-testid="profile-reset-data"]', description: 'reset the demo dataset' },
      { type: 'assertVisible', selector: '[data-testid="toast"]', description: 'reset confirmation toast' },
      { type: 'click', selector: '[data-testid="nav-dashboard"]', description: 'navigate to the seller dashboard', minWidth: 768 },
      { type: 'assertVisible', selector: '[data-testid="seller-dashboard"]', description: 'seller dashboard active (desktop)', minWidth: 768 },
      { type: 'assertCount', selector: '[data-testid="seller-metric-grid"] [data-trend]', minCount: 4, description: 'four dashboard KPI tiles', minWidth: 768 },
      { type: 'click', selector: '[data-testid="mobile-nav-explorer"]', description: 'back to explorer (mobile nav)', maxWidth: 767 },
      { type: 'assertVisible', selector: '[data-testid="main-content"][data-active-view="explorer"]', description: 'explorer restored (mobile)', maxWidth: 767 },
      { type: 'click', selector: '[data-testid="nav-explorer"]', description: 'back to explorer (desktop nav)', minWidth: 768 },
      { type: 'assertVisible', selector: '[data-testid="main-content"][data-active-view="explorer"]', description: 'explorer restored (desktop)', minWidth: 768 },
    ],
  },
};

const failures = [];
const notes = [];

function recordFailure(scope, message) {
  failures.push(`[${scope}] ${message}`);
}

/** Resolves the first *visible* DOM node matching a selector. */
async function firstVisibleElement(page, selector) {
  const handle = await page.evaluateHandle((candidateSelector) => {
    const nodes = Array.from(document.querySelectorAll(candidateSelector));
    return (
      nodes.find((node) => {
        const rect = node.getBoundingClientRect();
        const style = window.getComputedStyle(node);
        return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
      }) ?? null
    );
  }, selector);
  const element = handle.asElement();
  if (element === null) {
    await handle.dispose();
    return null;
  }
  return element;
}

/** Waits until at least one visible node matches the selector. */
async function waitForVisible(page, selector, timeout = 10_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    const element = await firstVisibleElement(page, selector);
    if (element !== null) {
      await element.dispose();
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`no visible element matches "${selector}" within ${timeout}ms`);
}

/**
 * Scrolls an element to the middle of the viewport before interacting with it.
 * Without this, sticky headers can swallow the synthetic click.
 */
async function clickElement(element) {
  await element.evaluate((node) => node.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' }));
  await new Promise((resolve) => setTimeout(resolve, 120));
  await element.click();
}

async function waitForServer(url, timeoutMs = 45_000) {  const deadline = Date.now() + timeoutMs;
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
      // Isolated context per viewport so persisted state never leaks between
      // runs and every breakpoint starts from the same seed data.
      const context = await browser.createBrowserContext();
      const page = await context.newPage();
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
              await waitForVisible(page, action.selector);
              const element = await firstVisibleElement(page, action.selector);
              if (element === null) {
                throw new Error(`no visible element matches "${action.selector}"`);
              }
              await clickElement(element);
              await new Promise((resolve) => setTimeout(resolve, 220));
              break;
            }
            case 'type': {
              await waitForVisible(page, action.selector);
              const element = await firstVisibleElement(page, action.selector);
              if (element === null) {
                throw new Error(`no visible element matches "${action.selector}"`);
              }
              await clickElement(element);
              await element.click({ clickCount: 3 });
              await element.type(action.value, { delay: 12 });              await new Promise((resolve) => setTimeout(resolve, 220));
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
              await waitForVisible(page, action.selector);
              break;
            }
            case 'assertCount': {
              const count = await page.$$eval(action.selector, (nodes) => nodes.length);
              if (typeof action.minCount === 'number' && count < action.minCount) {
                recordFailure(scope, `expected >=${action.minCount} of "${action.selector}" (${action.description}), found ${count}`);
              }
              if (typeof action.maxCount === 'number' && count > action.maxCount) {
                recordFailure(scope, `expected <=${action.maxCount} of "${action.selector}" (${action.description}), found ${count}`);
              }
              break;
            }
            case 'assertDisabled': {
              const disabled = await page.$eval(action.selector, (node) => node.disabled === true || node.getAttribute('aria-disabled') === 'true');
              if (!disabled) {
                recordFailure(scope, `expected "${action.selector}" to be disabled (${action.description})`);
              }
              break;
            }
            case 'select': {
              await page.waitForSelector(action.selector, { visible: true, timeout: 10_000 });
              await page.select(action.selector, action.value);
              await new Promise((resolve) => setTimeout(resolve, 220));
              break;
            }
            case 'wait': {
              await new Promise((resolve) => setTimeout(resolve, action.ms ?? 200));
              break;
            }
            case 'assertBox': {
              const box = await page.$eval(action.selector, (node) => node.getBoundingClientRect().height);
              if (typeof action.minHeight === 'number' && box < action.minHeight - 0.5) {
                recordFailure(scope, `"${action.selector}" height ${box.toFixed(1)} below ${action.minHeight} (${action.description})`);
              }
              if (typeof action.maxHeight === 'number' && box > action.maxHeight + 0.5) {
                recordFailure(scope, `"${action.selector}" height ${box.toFixed(1)} above ${action.maxHeight} (${action.description})`);
              }
              break;
            }
            case 'assertPaddingBottom': {
              const padding = await page.$eval(action.selector, (node) => window.getComputedStyle(node).paddingBottom);
              const value = Number.parseFloat(padding);
              if (Number.isFinite(value) && value < (action.minPadding ?? 0)) {
                recordFailure(
                  scope,
                  `"${action.selector}" padding-bottom ${value}px below ${action.minPadding}px (${action.description})`
                );
              }
              break;
            }
            case 'assertGridColumns': {
              const columns = await page.$eval(action.selector, (node) =>
                window.getComputedStyle(node).gridTemplateColumns.split(' ').filter(Boolean).length
              );
              if (typeof action.minColumns === 'number' && columns < action.minColumns) {
                recordFailure(
                  scope,
                  `"${action.selector}" renders ${columns} columns, expected >= ${action.minColumns} (${action.description})`
                );
              }
              if (typeof action.maxColumns === 'number' && columns > action.maxColumns) {
                recordFailure(
                  scope,
                  `"${action.selector}" renders ${columns} columns, expected <= ${action.maxColumns} (${action.description})`
                );
              }
              break;
            }
            case 'expectDownload': {
              const directory = path.join(OUTPUT_DIR, 'downloads');
              await mkdir(directory, { recursive: true });
              const session = await page.createCDPSession();
              await session.send('Page.setDownloadBehavior', { behavior: 'allow', downloadPath: directory });
              await waitForVisible(page, action.selector);
              const element = await firstVisibleElement(page, action.selector);
              if (element === null) {
                throw new Error(`no visible element matches "${action.selector}"`);
              }
              await clickElement(element);
              const deadline = Date.now() + 8000;
              let files = [];
              while (Date.now() < deadline) {
                files = (await readdir(directory)).filter((name) => name.endsWith(action.extension ?? '.csv'));
                if (files.length > 0) {
                  break;
                }
                await new Promise((resolve) => setTimeout(resolve, 200));
              }
              if (files.length === 0) {
                recordFailure(scope, `expected a ${action.extension ?? '.csv'} download (${action.description})`);
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
      await context.close();
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
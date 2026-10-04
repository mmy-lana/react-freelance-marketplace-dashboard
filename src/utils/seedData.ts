/**
 * Deterministic, offline-safe seed dataset.
 *
 * The dashboard ships with a rich dataset so every view renders meaningful
 * content on first load. Structure is fully deterministic; timestamps are
 * anchored to module evaluation time so countdowns and clearance timers stay
 * realistic without a backend. All imagery is generated as inline SVG data URIs
 * (no network, no external asset dependency).
 */

import type {
  GigCategory,
  GigItem,
  GigPackage,
  LedgerEntry,
  MetricSeriesPoint,
  NotificationItem,
  OrderItem,
  OrderStatus,
  PackageTier,
  SellerMetricBreakdown,
  SellerSnippet,
  UserProfile,
} from '../types/marketplace';
import { calculateNetRevenueCents, calculateServiceFeeCents } from './currency';
import { isoFromOffset } from './date';
import { slugify } from './id';

/** Module evaluation anchor — every relative timestamp derives from this. */
const ANCHOR = Date.now();

/* -------------------------------------------------------------------------- */
/* Generated artwork                                                           */
/* -------------------------------------------------------------------------- */

function svgDataUri(svg: string): string {
  return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\s{2,}/g, ' ').trim())}`;
}

interface Palette {
  from: string;
  via: string;
  to: string;
  ink: string;
  accent: string;
}

const CATEGORY_PALETTE: Record<GigCategory, Palette> = {
  'Graphics & Design': { from: '#0f172a', via: '#312e81', to: '#7c3aed', ink: '#e9d5ff', accent: '#c4b5fd' },
  'Digital Marketing': { from: '#052e16', via: '#065f46', to: '#10b981', ink: '#d1fae5', accent: '#6ee7b7' },
  'Writing & Translation': { from: '#1c1917', via: '#78350f', to: '#d97706', ink: '#fef3c7', accent: '#fcd34d' },
  'Video & Animation': { from: '#170f2e', via: '#5b21b6', to: '#a855f7', ink: '#f3e8ff', accent: '#e9d5ff' },
  'Music & Audio': { from: '#111827', via: '#1e3a8a', to: '#38bdf8', ink: '#e0f2fe', accent: '#7dd3fc' },
  'Programming & Tech': { from: '#0c0a09', via: '#1c1917', to: '#ea580c', ink: '#ffedd5', accent: '#fdba74' },
  'AI Services': { from: '#020617', via: '#4c1d95', to: '#c026d3', ink: '#fae8ff', accent: '#f0abfc' },
};

function buildThumbnail(label: string, glyph: string, palette: Palette, variant: number): string {
  const rotation = 18 + variant * 24;
  const radius = 120 - variant * 18;
  return svgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1" gradientTransform="rotate(${rotation} 0.5 0.5)">
          <stop offset="0%" stop-color="${palette.from}"/>
          <stop offset="55%" stop-color="${palette.via}"/>
          <stop offset="100%" stop-color="${palette.to}"/>
        </linearGradient>
        <radialGradient id="s" cx="0.75" cy="0.2" r="0.8">
          <stop offset="0%" stop-color="${palette.accent}" stop-opacity="0.45"/>
          <stop offset="100%" stop-color="${palette.to}" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="800" height="500" fill="url(#g)"/>
      <rect width="800" height="500" fill="url(#s)"/>
      <circle cx="${180 + variant * 90}" cy="${330 - variant * 40}" r="${radius}" fill="${palette.ink}" fill-opacity="0.12"/>
      <circle cx="${620 - variant * 70}" cy="${120 + variant * 30}" r="${Math.round(radius * 0.55)}" fill="${palette.accent}" fill-opacity="0.22"/>
      <text x="60" y="${250 - variant * 10}" font-family="Inter, Segoe UI, sans-serif" font-size="150" fill="${palette.ink}" fill-opacity="0.85">${glyph}</text>
      <text x="60" y="330" font-family="Inter, Segoe UI, sans-serif" font-size="40" font-weight="700" fill="${palette.ink}">${label.slice(0, 26)}</text>
      <rect x="60" y="360" width="${160 + variant * 40}" height="8" rx="4" fill="${palette.accent}" fill-opacity="0.7"/>
    </svg>
  `);
}

function buildAvatar(initials: string, from: string, to: string): string {
  return svgDataUri(`
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="96" height="96">
      <defs>
        <linearGradient id="a" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="${from}"/>
          <stop offset="100%" stop-color="${to}"/>
        </linearGradient>
      </defs>
      <rect width="96" height="96" rx="48" fill="url(#a)"/>
      <text x="48" y="60" text-anchor="middle" font-family="Inter, Segoe UI, sans-serif" font-size="34" font-weight="700" fill="#0f172a">${initials}</text>
    </svg>
  `);
}

/* -------------------------------------------------------------------------- */
/* Sellers & current user                                                      */
/* -------------------------------------------------------------------------- */

interface SellerSeed {
  snippet: SellerSnippet;
}

const SELLERS = {
  self: {
    snippet: {
      id: 'seller-self-001',
      username: 'alex.morgan',
      displayName: 'Alex Morgan',
      avatarUrl: buildAvatar('AM', '#34d399', '#0f766e'),
      level: 'level_two',
      rating: 4.87,
      ratingCount: 342,
    },
  },
  nova: {
    snippet: {
      id: 'seller-nova-002',
      username: 'nova.studio',
      displayName: 'Nova Studio',
      avatarUrl: buildAvatar('NS', '#a78bfa', '#4338ca'),
      level: 'level_two',
      rating: 4.92,
      ratingCount: 1184,
    },
  },
  pixel: {
    snippet: {
      id: 'seller-pixel-003',
      username: 'pixel.forge',
      displayName: 'Pixel Forge',
      avatarUrl: buildAvatar('PF', '#f472b6', '#9d174d'),
      level: 'level_one',
      rating: 4.78,
      ratingCount: 296,
    },
  },
  kai: {
    snippet: {
      id: 'seller-kai-004',
      username: 'kai.motion',
      displayName: 'Kai Motion',
      avatarUrl: buildAvatar('KM', '#38bdf8', '#1d4ed8'),
      level: 'top_rated',
      rating: 4.99,
      ratingCount: 2417,
    },
  },
  lumen: {
    snippet: {
      id: 'seller-lumen-005',
      username: 'lumen.audio',
      displayName: 'Lumen Audio',
      avatarUrl: buildAvatar('LA', '#fbbf24', '#b45309'),
      level: 'new_seller',
      rating: 4.64,
      ratingCount: 58,
    },
  },
} as const satisfies Record<string, SellerSeed>;

type SellerKey = keyof typeof SELLERS;

export const CURRENT_USER: UserProfile = {
  id: 'seller-self-001',
  username: 'alex.morgan',
  displayName: 'Alex Morgan',
  avatarUrl: SELLERS.self.snippet.avatarUrl,
  title: 'Product Designer & Motion Specialist',
  level: 'level_two',
  rating: 4.87,
  ratingCount: 342,
  completedOrdersCount: 74,
  country: 'Portugal',
  memberSince: isoFromOffset(ANCHOR, -742),
  responseRatePercent: 96,
  responseTimeHours: 1.4,
  onTimeDeliveryPercent: 98,
  orderCompletionPercent: 99,
  totalEarnedCents: 612_450,
  availableBalanceCents: 184_260,
  pendingClearanceCents: 43_980,
};

/* -------------------------------------------------------------------------- */
/* Gigs                                                                        */
/* -------------------------------------------------------------------------- */

interface PackageSeed {
  title: string;
  description: string;
  deliveryDays: number;
  revisions: number;
  priceCents: number;
  features: string[];
}

interface GigSeed {
  key: string;
  title: string;
  glyph: string;
  category: GigCategory;
  subcategory: string;
  seller: SellerKey;
  rating: number;
  reviewCount: number;
  impressionsCount: number;
  clicksCount: number;
  ordersInQueueCount: number;
  ageDays: number;
  updatedDaysAgo: number;
  basic: PackageSeed;
  standard: PackageSeed;
  premium: PackageSeed;
}

const GIG_SEEDS: GigSeed[] = [
  {
    key: 'brand-identity',
    title: 'I will design a timeless brand identity system for your startup',
    glyph: '◆',
    category: 'Graphics & Design',
    subcategory: 'Brand Identity',
    seller: 'nova',
    rating: 4.94,
    reviewCount: 318,
    impressionsCount: 48_920,
    clicksCount: 6_140,
    ordersInQueueCount: 4,
    ageDays: 412,
    updatedDaysAgo: 2,
    basic: {
      title: 'Essential Identity',
      description: 'Logo, color palette and business card lockup ready for print and screen.',
      deliveryDays: 4,
      revisions: 2,
      priceCents: 24_900,
      features: ['3 logo concepts', 'Primary + secondary palette', 'Business card design', 'Transparent PNG exports'],
    },
    standard: {
      title: 'Complete Brand Kit',
      description: 'Full identity system with typography, usage guide and social templates.',
      deliveryDays: 7,
      revisions: 4,
      priceCents: 54_900,
      features: [
        'Everything in Essential',
        'Typography pairing',
        'Brand guidelines (24 pages)',
        '5 social media templates',
        'Favicon + app icon set',
      ],
    },
    premium: {
      title: 'Brand Immersion',
      description: 'Identity, motion signature and a launch-ready merchandising kit.',
      deliveryDays: 12,
      revisions: 6,
      priceCents: 118_000,
      features: ['Everything in Complete Brand Kit', 'Animated logo sting', 'Packaging mockups', 'Brand audit call', 'Priority 24h response'],
    },
  },
  {
    key: 'ui-dashboard',
    title: 'I will design a scalable SaaS dashboard UI in Figma',
    glyph: '▦',
    category: 'Graphics & Design',
    subcategory: 'UI/UX Design',
    seller: 'pixel',
    rating: 4.81,
    reviewCount: 147,
    impressionsCount: 26_310,
    clicksCount: 2_980,
    ordersInQueueCount: 2,
    ageDays: 236,
    updatedDaysAgo: 5,
    basic: {
      title: 'Single Screen Audit',
      description: 'Heuristic review with annotated wireframe and prioritized fix list.',
      deliveryDays: 3,
      revisions: 1,
      priceCents: 15_500,
      features: ['Heuristic evaluation', 'Annotated wireframe', 'Top 10 prioritized issues'],
    },
    standard: {
      title: 'Dashboard Design',
      description: 'Six screen dashboard with component library and responsive variants.',
      deliveryDays: 8,
      revisions: 3,
      priceCents: 62_000,
      features: ['6 high-fidelity screens', 'Component library', 'Dark + light variants', 'Developer handoff notes'],
    },
    premium: {
      title: 'Design System Sprint',
      description: 'Token driven design system with prototype, docs and usability session.',
      deliveryDays: 16,
      revisions: 5,
      priceCents: 145_000,
      features: ['Everything in Dashboard Design', '60+ component library', 'Clickable prototype', 'Usability test with 5 users', 'Figma variables + tokens'],
    },
  },
  {
    key: 'seo-authority',
    title: 'I will grow your organic traffic with a technical SEO sprint',
    glyph: '▲',
    category: 'Digital Marketing',
    subcategory: 'SEO',
    seller: 'self',
    rating: 4.88,
    reviewCount: 96,
    impressionsCount: 19_640,
    clicksCount: 3_412,
    ordersInQueueCount: 3,
    ageDays: 318,
    updatedDaysAgo: 1,
    basic: {
      title: 'Site Audit',
      description: 'Technical crawl analysis with keyword gap and prioritized roadmap.',
      deliveryDays: 3,
      revisions: 1,
      priceCents: 18_000,
      features: ['50-page crawl audit', 'Core Web Vitals review', 'Keyword gap list', 'Priority roadmap'],
    },
    standard: {
      title: 'Growth Sprint',
      description: 'Full technical fix cycle plus on-page optimisation for 20 priority pages.',
      deliveryDays: 9,
      revisions: 2,
      priceCents: 76_000,
      features: ['Everything in Site Audit', '20 page optimisations', 'Schema markup', 'Internal link map', 'Monthly rank tracker'],
    },
    premium: {
      title: 'Market Dominance',
      description: 'Six month SEO program with content briefs and authority building.',
      deliveryDays: 30,
      revisions: 4,
      priceCents: 210_000,
      features: ['Everything in Growth Sprint', '12 content briefs', 'Digital PR outreach', 'Backlink opportunity report', 'Weekly video standups'],
    },
  },
  {
    key: 'paid-social',
    title: 'I will launch profitable paid social campaigns on Meta and TikTok',
    glyph: '◈',
    category: 'Digital Marketing',
    subcategory: 'Paid Advertising',
    seller: 'nova',
    rating: 4.9,
    reviewCount: 212,
    impressionsCount: 41_220,
    clicksCount: 5_860,
    ordersInQueueCount: 5,
    ageDays: 287,
    updatedDaysAgo: 3,
    basic: {
      title: 'Account Teardown',
      description: 'Honest review of your current ad account with a 7-day action plan.',
      deliveryDays: 2,
      revisions: 1,
      priceCents: 12_500,
      features: ['Account audit', 'Creative teardown', '7-day action plan'],
    },
    standard: {
      title: 'Launch Package',
      description: 'Full campaign build, tracking setup and two weeks of optimisation.',
      deliveryDays: 10,
      revisions: 3,
      priceCents: 88_000,
      features: ['Everything in Account Teardown', '2 campaign structures', '12 ad creatives', 'Pixel + CAPI setup', '14-day optimisation'],
    },
    premium: {
      title: 'Scale Partner',
      description: 'Full funnel management with creative testing and weekly reporting.',
      deliveryDays: 28,
      revisions: 5,
      priceCents: 245_000,
      features: ['Everything in Launch Package', 'Creative testing roadmap', 'Retargeting sequences', 'Weekly performance calls', 'Landing page CRO review'],
    },
  },
  {
    key: 'landing-copy',
    title: 'I will write conversion focused landing page copy that sells',
    glyph: '✎',
    category: 'Writing & Translation',
    subcategory: 'Copywriting',
    seller: 'self',
    rating: 4.85,
    reviewCount: 74,
    impressionsCount: 12_480,
    clicksCount: 1_920,
    ordersInQueueCount: 2,
    ageDays: 198,
    updatedDaysAgo: 6,
    basic: {
      title: 'Hero Section',
      description: 'Headline, sub-headline and CTA copy for one landing page hero.',
      deliveryDays: 2,
      revisions: 2,
      priceCents: 9_500,
      features: ['5 headline options', 'Sub-headline variants', 'CTA copy set', 'Eyebrow text'],
    },
    standard: {
      title: 'Full Page Copy',
      description: 'Complete landing page narrative with objection handling and proof sections.',
      deliveryDays: 6,
      revisions: 3,
      priceCents: 41_000,
      features: ['Everything in Hero Section', 'Full page narrative', 'Objection handling block', 'FAQ section', 'Two tone directions'],
    },
    premium: {
      title: 'Conversion Copy System',
      description: 'Page copy, five email sequence and a reusable voice-of-brand guide.',
      deliveryDays: 14,
      revisions: 4,
      priceCents: 96_000,
      features: ['Everything in Full Page Copy', '5-email welcome sequence', 'Voice & tone guide', 'A/B headline bank', 'Copy review call'],
    },
  },
  {
    key: 'legal-localise',
    title: 'I will translate and localise your product into German and French',
    glyph: '⌘',
    category: 'Writing & Translation',
    subcategory: 'Localisation',
    seller: 'pixel',
    rating: 4.76,
    reviewCount: 88,
    impressionsCount: 9_870,
    clicksCount: 1_120,
    ordersInQueueCount: 1,
    ageDays: 164,
    updatedDaysAgo: 9,
    basic: {
      title: 'Glossary Build',
      description: 'Terminology glossary plus tone guide for one language.',
      deliveryDays: 4,
      revisions: 2,
      priceCents: 13_000,
      features: ['250-term glossary', 'Tone guide', 'Style sheet'],
    },
    standard: {
      title: 'Product Localisation',
      description: 'Full UI string translation with in-context QA for one locale.',
      deliveryDays: 9,
      revisions: 3,
      priceCents: 58_000,
      features: ['Everything in Glossary Build', 'Up to 2,000 strings', 'In-context screenshots', 'QA report'],
    },
    premium: {
      title: 'Multi-market Launch',
      description: 'Three locales, transcreation and a launch-ready review cycle.',
      deliveryDays: 18,
      revisions: 4,
      priceCents: 132_000,
      features: ['Everything in Product Localisation', '3 locales', 'Transcreation of key flows', 'Stakesholder review call'],
    },
  },
  {
    key: 'explainer-video',
    title: 'I will create a 60 second animated explainer video',
    glyph: '▶',
    category: 'Video & Animation',
    subcategory: 'Motion Graphics',
    seller: 'kai',
    rating: 4.97,
    reviewCount: 412,
    impressionsCount: 63_500,
    clicksCount: 9_240,
    ordersInQueueCount: 6,
    ageDays: 501,
    updatedDaysAgo: 1,
    basic: {
      title: 'Script + Storyboard',
      description: '60 second script and storyboard before a single frame is rendered.',
      deliveryDays: 3,
      revisions: 2,
      priceCents: 16_500,
      features: ['60s script', 'Storyboard frames', 'Voiceover direction'],
    },
    standard: {
      title: 'Animated Explainer',
      description: 'Full 60 second animation with licensed soundtrack and captions.',
      deliveryDays: 10,
      revisions: 3,
      priceCents: 84_000,
      features: ['Everything in Script + Storyboard', '60s animation', 'Licensed music', 'Burned-in captions', 'Two aspect ratios'],
    },
    premium: {
      title: 'Cinematic Package',
      description: 'Explainer film plus cutdowns for every social placement.',
      deliveryDays: 21,
      revisions: 5,
      priceCents: 198_000,
      features: ['Everything in Animated Explainer', '3 social cutdowns', 'Character animation', 'Motion style guide', 'Source files included'],
    },
  },
  {
    key: 'ugc-edits',
    title: 'I will edit 15 UGC clips into scroll stopping vertical ads',
    glyph: '⬒',
    category: 'Video & Animation',
    subcategory: 'Social Video',
    seller: 'self',
    rating: 4.83,
    reviewCount: 131,
    impressionsCount: 22_770,
    clicksCount: 3_540,
    ordersInQueueCount: 3,
    ageDays: 143,
    updatedDaysAgo: 4,
    basic: {
      title: '5 Clip Batch',
      description: 'Five vertical cuts with captions, music and hook framing.',
      deliveryDays: 3,
      revisions: 2,
      priceCents: 22_000,
      features: ['5 edited clips', 'Auto captions', 'Trending audio pick', '9:16 export'],
    },
    standard: {
      title: '15 Clip Batch',
      description: 'Fifteen edits with three hook variants each for A/B testing.',
      deliveryDays: 6,
      revisions: 3,
      priceCents: 68_000,
      features: ['Everything in 5 Clip Batch', '15 clips', '3 hook variants per clip', 'Text overlays', 'Speed-ramped intros'],
    },
    premium: {
      title: 'Creator Sprint',
      description: 'Forty clips, creator sourcing direction and performance reporting.',
      deliveryDays: 15,
      revisions: 5,
      priceCents: 168_000,
      features: ['Everything in 15 Clip Batch', '40 clips', 'Creator brief pack', 'Hook library document', 'Performance review call'],
    },
  },
  {
    key: 'mastering',
    title: 'I will master your track to release ready loudness',
    glyph: '♫',
    category: 'Music & Audio',
    subcategory: 'Audio Mastering',
    seller: 'lumen',
    rating: 4.69,
    reviewCount: 34,
    impressionsCount: 7_240,
    clicksCount: 940,
    ordersInQueueCount: 1,
    ageDays: 92,
    updatedDaysAgo: 7,
    basic: {
      title: 'Single Master',
      description: 'Streaming and download master with loudness matched to reference.',
      deliveryDays: 2,
      revisions: 1,
      priceCents: 6_500,
      features: ['1 track mastered', 'Reference matched', 'WAV + MP3'],
    },
    standard: {
      title: 'EP Master',
      description: 'Up to five tracks mastered with consistent sequencing loudness.',
      deliveryDays: 5,
      revisions: 2,
      priceCents: 29_000,
      features: ['Up to 5 tracks', 'Sequencing pass', 'ISRC ready files', 'Instrumental versions'],
    },
    premium: {
      title: 'Album Production',
      description: 'Full album mastering, sequencing support and release asset prep.',
      deliveryDays: 14,
      revisions: 4,
      priceCents: 74_000,
      features: ['Everything in EP Master', 'Up to 12 tracks', 'Sequencing consultation', 'Release metadata prep', 'DDP master'],
    },
  },
  {
    key: 'react-dashboard',
    title: 'I will build a typed React and TypeScript analytics dashboard',
    glyph: '⟐',
    category: 'Programming & Tech',
    subcategory: 'Frontend Development',
    seller: 'kai',
    rating: 4.95,
    reviewCount: 289,
    impressionsCount: 38_900,
    clicksCount: 5_010,
    ordersInQueueCount: 4,
    ageDays: 366,
    updatedDaysAgo: 2,
    basic: {
      title: 'Component Audit',
      description: 'Accessibility and typing audit of an existing component library.',
      deliveryDays: 4,
      revisions: 1,
      priceCents: 22_000,
      features: ['WCAG review', 'Type safety report', 'Fix backlog'],
    },
    standard: {
      title: 'Dashboard Build',
      description: 'Production dashboard shell with routing, data layer and responsive layout.',
      deliveryDays: 12,
      revisions: 3,
      priceCents: 128_000,
      features: ['Everything in Component Audit', 'Responsive shell', 'Typed data layer', 'Routing + state', 'Unit tested core logic'],
    },
    premium: {
      title: 'Platform Delivery',
      description: 'Dashboard, auth, tests and CI pipeline with handover documentation.',
      deliveryDays: 24,
      revisions: 5,
      priceCents: 285_000,
      features: ['Everything in Dashboard Build', 'Auth integration', 'E2E test suite', 'CI pipeline', 'Handover documentation'],
    },
  },
  {
    key: 'api-hardening',
    title: 'I will optimise and harden your REST API for production traffic',
    glyph: '⬡',
    category: 'Programming & Tech',
    subcategory: 'Backend Development',
    seller: 'self',
    rating: 4.79,
    reviewCount: 58,
    impressionsCount: 15_320,
    clicksCount: 2_140,
    ordersInQueueCount: 2,
    ageDays: 121,
    updatedDaysAgo: 8,
    basic: {
      title: 'Performance Profile',
      description: 'Profiling pass with latency breakdown and quick win list.',
      deliveryDays: 3,
      revisions: 1,
      priceCents: 19_500,
      features: ['Endpoint profiling', 'Latency breakdown', 'Top 5 quick wins'],
    },
    standard: {
      title: 'Hardening Sprint',
      description: 'Caching, rate limiting, validation and query tuning on your API.',
      deliveryDays: 11,
      revisions: 3,
      priceCents: 94_000,
      features: ['Everything in Performance Profile', 'Redis caching layer', 'Rate limiting', 'Schema validation', 'Load test report'],
    },
    premium: {
      title: 'Scale Engineering',
      description: 'Distributed architecture review with observability and on-call runbooks.',
      deliveryDays: 26,
      revisions: 4,
      priceCents: 320_000,
      features: ['Everything in Hardening Sprint', 'Observability stack', 'Queue architecture', 'On-call runbooks', 'Architecture review call'],
    },
  },
  {
    key: 'rag-pipeline',
    title: 'I will build a retrieval augmented generation pipeline for your docs',
    glyph: '✦',
    category: 'AI Services',
    subcategory: 'AI Engineering',
    seller: 'nova',
    rating: 4.86,
    reviewCount: 109,
    impressionsCount: 31_780,
    clicksCount: 6_430,
    ordersInQueueCount: 5,
    ageDays: 205,
    updatedDaysAgo: 3,
    basic: {
      title: 'Feasibility Study',
      description: 'Architecture options, cost model and go/no-go recommendation.',
      deliveryDays: 4,
      revisions: 1,
      priceCents: 24_500,
      features: ['Architecture options', 'Cost projection', 'Risk register'],
    },
    standard: {
      title: 'Working Pipeline',
      description: 'Ingestion, chunking, embeddings, retrieval and grounded answers.',
      deliveryDays: 14,
      revisions: 3,
      priceCents: 142_000,
      features: ['Everything in Feasibility Study', 'Document ingestion', 'Vector store setup', 'Grounded answer layer', 'Evaluation harness'],
    },
    premium: {
      title: 'Production AI Suite',
      description: 'Pipeline plus agent tooling, observability and human review workflows.',
      deliveryDays: 30,
      revisions: 5,
      priceCents: 420_000,
      features: ['Everything in Working Pipeline', 'Agent tool calling', 'Answer citations', 'Human review queue', 'Weekly optimisation'],
    },
  },
];

function buildPackage(gigId: string, tier: PackageTier, seed: PackageSeed): GigPackage {
  return {
    id: `${gigId}-pkg-${tier}`,
    tier,
    title: seed.title,
    description: seed.description,
    deliveryDays: seed.deliveryDays,
    revisions: seed.revisions,
    priceCents: seed.priceCents,
    features: seed.features,
  };
}

export const SEED_GIGS: GigItem[] = GIG_SEEDS.map((seed) => {
  const palette = CATEGORY_PALETTE[seed.category];
  const gigId = `gig-${seed.key}`;
  const images = [0, 1, 2].map((variant) => buildThumbnail(seed.title, seed.glyph, palette, variant));

  return {
    id: gigId,
    sellerId: SELLERS[seed.seller].snippet.id,
    seller: SELLERS[seed.seller].snippet,
    title: seed.title,
    slug: slugify(seed.title, seed.key),
    category: seed.category,
    subcategory: seed.subcategory,
    thumbnailUrl: images[0],
    images,
    startingPriceCents: seed.basic.priceCents,
    packages: {
      basic: buildPackage(gigId, 'basic', seed.basic),
      standard: buildPackage(gigId, 'standard', seed.standard),
      premium: buildPackage(gigId, 'premium', seed.premium),
    },
    rating: seed.rating,
    reviewCount: seed.reviewCount,
    status: 'active',
    impressionsCount: seed.impressionsCount,
    clicksCount: seed.clicksCount,
    ordersInQueueCount: seed.ordersInQueueCount,
    createdAt: isoFromOffset(ANCHOR, -seed.ageDays),
    updatedAt: isoFromOffset(ANCHOR, -seed.updatedDaysAgo),
  };
});

/* -------------------------------------------------------------------------- */
/* Orders                                                                      */
/* -------------------------------------------------------------------------- */

const BUYERS = [
  { id: 'buyer-101', username: 'mira.kowalski', avatarFrom: '#fda4af', avatarTo: '#9f1239' },
  { id: 'buyer-102', username: 'devon.hart', avatarFrom: '#93c5fd', avatarTo: '#1e3a8a' },
  { id: 'buyer-103', username: 'sora.tanaka', avatarFrom: '#fcd34d', avatarTo: '#92400e' },
  { id: 'buyer-104', username: 'lena.brandt', avatarFrom: '#86efac', avatarTo: '#166534' },
  { id: 'buyer-105', username: 'omar.haddad', avatarFrom: '#c4b5fd', avatarTo: '#5b21b6' },
  { id: 'buyer-106', username: 'ruth.oyelaran', avatarFrom: '#67e8f9', avatarTo: '#155e75' },
] as const;

interface RequirementSeed {
  question: string;
  answer?: string;
}

interface MilestoneSeed {
  title: string;
  offsetDays: number;
  isCompleted: boolean;
}

interface OrderSeed {
  gigKey: string;
  tier: PackageTier;
  status: OrderStatus;
  buyerIndex: number;
  startOffsetDays: number;
  dueOffsetDays: number;
  deliveredOffsetDays?: number;
  completedOffsetDays?: number;
  revisionTotal: number;
  revisionRemaining: number;
  quantity: number;
  requirements: RequirementSeed[];
  milestones: MilestoneSeed[];
  fileNames?: string[];
}

const ORDER_SEEDS: OrderSeed[] = [
  {
    gigKey: 'seo-authority',
    tier: 'premium',
    status: 'in_progress',
    buyerIndex: 0,
    startOffsetDays: -18,
    dueOffsetDays: 12,
    revisionTotal: 4,
    revisionRemaining: 3,
    quantity: 1,
    requirements: [
      { question: 'What is the primary domain we should optimise?', answer: 'kestrel-labs.com' },
      { question: 'Who is the main search persona?', answer: 'Head of Growth at B2B SaaS, 50-500 employees.' },
      { question: 'Are there product areas we must exclude?', answer: 'Yes, the legacy help centre is retiring.' },
      { question: 'Do you have an existing analytics property?', answer: '' },
    ],
    milestones: [
      { title: 'Technical audit delivered', offsetDays: -13, isCompleted: true },
      { title: 'Schema + Core Web Vitals fixes', offsetDays: -6, isCompleted: true },
      { title: 'Landing page optimisation', offsetDays: 3, isCompleted: false },
      { title: 'Monthly rank report', offsetDays: 9, isCompleted: false },
    ],
    fileNames: ['kestrel-audit.pdf'],
  },
  {
    gigKey: 'react-dashboard',
    tier: 'standard',
    status: 'pending_requirements',
    buyerIndex: 1,
    startOffsetDays: -1,
    dueOffsetDays: 11,
    revisionTotal: 3,
    revisionRemaining: 3,
    quantity: 1,
    requirements: [
      { question: 'Which repository should the dashboard live in?', answer: 'github.com/devonhart/ops-console' },
      { question: 'Do you have API documentation?', answer: '' },
      { question: 'Any design system we should match?', answer: '' },
    ],
    milestones: [
      { title: 'Component audit', offsetDays: 1, isCompleted: false },
      { title: 'Dashboard shell build', offsetDays: 7, isCompleted: false },
      { title: 'Handoff notes', offsetDays: 11, isCompleted: false },
    ],
  },
  {
    gigKey: 'ugc-edits',
    tier: 'standard',
    status: 'delivered',
    buyerIndex: 2,
    startOffsetDays: -9,
    dueOffsetDays: -3,
    deliveredOffsetDays: -2,
    revisionTotal: 3,
    revisionRemaining: 2,
    quantity: 2,
    requirements: [
      { question: 'Where can we find the raw footage?', answer: 'Drive link in brief, folder 12-RAW.' },
      { question: 'Any brand voice notes for captions?', answer: 'Playful, never shouty, emoji-free.' },
    ],
    milestones: [
      { title: 'Footage ingest', offsetDays: -8, isCompleted: true },
      { title: 'First cut batch', offsetDays: -4, isCompleted: true },
      { title: 'Final delivery', offsetDays: -2, isCompleted: true },
    ],
    fileNames: ['sora-batch-01.zip', 'sora-batch-02.zip', 'caption-sheet.pdf'],
  },
  {
    gigKey: 'api-hardening',
    tier: 'standard',
    status: 'revision',
    buyerIndex: 3,
    startOffsetDays: -14,
    dueOffsetDays: -1,
    deliveredOffsetDays: -5,
    revisionTotal: 3,
    revisionRemaining: 1,
    quantity: 1,
    requirements: [
      { question: 'What is the current p95 latency?', answer: '~1.4s on GET /orders' },
      { question: 'Which datastore are we using?', answer: 'Postgres 16 with PgBouncer.' },
    ],
    milestones: [
      { title: 'Baseline profile', offsetDays: -12, isCompleted: true },
      { title: 'Cache layer', offsetDays: -7, isCompleted: true },
      { title: 'Revision round 1', offsetDays: -1, isCompleted: false },
    ],
    fileNames: ['hardening-report.pdf', 'benchmark-run.json'],
  },
  {
    gigKey: 'mastering',
    tier: 'premium',
    status: 'in_progress',
    buyerIndex: 4,
    startOffsetDays: -6,
    dueOffsetDays: 8,
    revisionTotal: 4,
    revisionRemaining: 4,
    quantity: 1,
    requirements: [
      { question: 'Which platforms should we master for?', answer: 'Spotify, Apple Music, Bandcamp.' },
      { question: 'Is there a loudness reference?', answer: 'Yes, attached in the brief folder.' },
      { question: 'Do you need instrumentals?', answer: 'Yes, clean versions for two tracks.' },
    ],
    milestones: [
      { title: 'Sequencing review', offsetDays: -3, isCompleted: true },
      { title: 'Mastering pass 1', offsetDays: 2, isCompleted: false },
      { title: 'DDP delivery', offsetDays: 8, isCompleted: false },
    ],
    fileNames: [],
  },
  {
    gigKey: 'brand-identity',
    tier: 'standard',
    status: 'completed',
    buyerIndex: 5,
    startOffsetDays: -64,
    dueOffsetDays: -56,
    deliveredOffsetDays: -58,
    completedOffsetDays: -55,
    revisionTotal: 4,
    revisionRemaining: 1,
    quantity: 1,
    requirements: [
      { question: 'Do you have a mood board?', answer: 'Attached, 12 references.' },
      { question: 'Any competitor brands to avoid?', answer: 'Nothing orange, please.' },
    ],
    milestones: [
      { title: 'Discovery', offsetDays: -61, isCompleted: true },
      { title: 'Identity directions', offsetDays: -59, isCompleted: true },
      { title: 'Final delivery', offsetDays: -57, isCompleted: true },
    ],
    fileNames: ['northwind-brand-kit.zip', 'guidelines.pdf'],
  },
  {
    gigKey: 'explainer-video',
    tier: 'basic',
    status: 'completed',
    buyerIndex: 0,
    startOffsetDays: -41,
    dueOffsetDays: -37,
    deliveredOffsetDays: -38,
    completedOffsetDays: -36,
    revisionTotal: 2,
    revisionRemaining: 0,
    quantity: 1,
    requirements: [{ question: 'What is the core message?', answer: 'Automation saves 12 hours a week.' }],
    milestones: [
      { title: 'Script', offsetDays: -40, isCompleted: true },
      { title: 'Storyboard', offsetDays: -39, isCompleted: true },
    ],
    fileNames: ['kestrel-explainer-v3.mp4'],
  },
  {
    gigKey: 'landing-copy',
    tier: 'premium',
    status: 'cancelled',
    buyerIndex: 2,
    startOffsetDays: -28,
    dueOffsetDays: -14,
    revisionTotal: 4,
    revisionRemaining: 2,
    quantity: 1,
    requirements: [{ question: 'Which product should the page sell?', answer: 'The analytics suite.' }],
    milestones: [{ title: 'Discovery', offsetDays: -27, isCompleted: true }],
    fileNames: [],
  },
];

const MIME_BY_EXTENSION: Record<string, string> = {
  zip: 'application/zip',
  pdf: 'application/pdf',
  json: 'application/json',
  mp4: 'video/mp4',
  png: 'image/png',
};

function deliveryFilesFor(names: string[]): OrderItem['deliveryFiles'] {
  return names.map((name, index) => {
    const extension = name.split('.').pop()?.toLowerCase() ?? 'zip';
    const mimeType = MIME_BY_EXTENSION[extension] ?? 'application/octet-stream';
    const sizeBytes = 420_000 + index * 1_310_000 + name.length * 4_096;
    return {
      name,
      url: `https://files.local/gighub/${encodeURIComponent(name)}`,
      sizeBytes,
      mimeType,
    };
  });
}

function gigByKey(key: string): GigItem {
  const gig = SEED_GIGS.find((candidate) => candidate.id === `gig-${key}`);
  if (!gig) {
    throw new Error(`Seed integrity failure: gig "${key}" referenced but not defined`);
  }
  return gig;
}

export const SEED_ORDERS: OrderItem[] = ORDER_SEEDS.map((seed, index) => {
  const gig = gigByKey(seed.gigKey);
  const buyer = BUYERS[seed.buyerIndex];
  const amountCents = gig.packages[seed.tier].priceCents * seed.quantity;
  const serviceFeeCents = calculateServiceFeeCents(amountCents);
  const createdAt = isoFromOffset(ANCHOR, seed.startOffsetDays);
  const updatedAt = isoFromOffset(
    ANCHOR,
    seed.deliveredOffsetDays ?? seed.completedOffsetDays ?? Math.min(seed.startOffsetDays + 1, -1)
  );

  return {
    id: `order-${String(index + 1).padStart(3, '0')}`,
    orderNumber: `GH-${(index + 1).toString().padStart(4, '0')}${'ABCDEF'[index % 6]}`,
    gigId: gig.id,
    gigTitle: gig.title,
    gigThumbnailUrl: gig.thumbnailUrl,
    buyerId: buyer.id,
    buyerUsername: buyer.username,
    buyerAvatarUrl: buildAvatar(buyer.username.slice(0, 2).toUpperCase(), buyer.avatarFrom, buyer.avatarTo),
    sellerId: gig.sellerId,
    tier: seed.tier,
    status: seed.status,
    amountCents,
    serviceFeeCents,
    netRevenueCents: calculateNetRevenueCents(amountCents),
    startDate: createdAt,
    dueDate: isoFromOffset(ANCHOR, seed.dueOffsetDays),
    deliveredAt: seed.deliveredOffsetDays === undefined ? undefined : isoFromOffset(ANCHOR, seed.deliveredOffsetDays),
    completedAt: seed.completedOffsetDays === undefined ? undefined : isoFromOffset(ANCHOR, seed.completedOffsetDays),
    requirements: seed.requirements.map((requirement, requirementIndex) => ({
      id: `order-${index + 1}-req-${requirementIndex + 1}`,
      question: requirement.question,
      answerText: requirement.answer !== undefined && requirement.answer.trim().length > 0 ? requirement.answer : undefined,
      isAnswered: requirement.answer !== undefined && requirement.answer.trim().length > 0,
    })),
    milestones: seed.milestones.map((milestone, milestoneIndex) => ({
      id: `order-${index + 1}-ms-${milestoneIndex + 1}`,
      title: milestone.title,
      dueDate: isoFromOffset(ANCHOR, milestone.offsetDays),
      isCompleted: milestone.isCompleted,
    })),
    deliveryFiles: deliveryFilesFor(seed.fileNames ?? []),
    revisionCountTotal: seed.revisionTotal,
    revisionCountRemaining: seed.revisionRemaining,
    createdAt,
    updatedAt,
  };
});

/* -------------------------------------------------------------------------- */
/* Metrics, ledger & notifications                                             */
/* -------------------------------------------------------------------------- */

export const SEED_SELLER_METRICS: SellerMetricBreakdown[] = [
  {
    period: 'last_7_days',
    grossVolumeCents: 184_200,
    completedOrdersCount: 6,
    averageSellingPriceCents: 30_700,
    profileVisitsCount: 2_480,
    conversionRatePercent: 4.8,
  },
  {
    period: 'last_30_days',
    grossVolumeCents: 726_900,
    completedOrdersCount: 23,
    averageSellingPriceCents: 31_604,
    profileVisitsCount: 9_120,
    conversionRatePercent: 5.1,
  },
  {
    period: 'last_90_days',
    grossVolumeCents: 1_984_500,
    completedOrdersCount: 61,
    averageSellingPriceCents: 32_532,
    profileVisitsCount: 26_740,
    conversionRatePercent: 5.4,
  },
  {
    period: 'year_to_date',
    grossVolumeCents: 2_418_600,
    completedOrdersCount: 74,
    averageSellingPriceCents: 32_684,
    profileVisitsCount: 32_910,
    conversionRatePercent: 5.3,
  },
];

export interface SellerKpiSeries {
  id: 'gross_earnings' | 'active_orders' | 'completion_rate' | 'average_rating';
  label: string;
  unit: 'currency' | 'count' | 'percent';
  points: MetricSeriesPoint[];
}

export const SEED_KPI_SERIES: SellerKpiSeries[] = [
  {
    id: 'gross_earnings',
    label: 'Gross Earnings',
    unit: 'currency',
    points: [
      { label: 'W1', value: 82_400 },
      { label: 'W2', value: 96_800 },
      { label: 'W3', value: 78_200 },
      { label: 'W4', value: 114_600 },
      { label: 'W5', value: 128_900 },
      { label: 'W6', value: 142_300 },
      { label: 'W7', value: 184_200 },
      { label: 'W8', value: 171_500 },
    ],
  },
  {
    id: 'active_orders',
    label: 'Active Orders',
    unit: 'count',
    points: [
      { label: 'W1', value: 9 },
      { label: 'W2', value: 11 },
      { label: 'W3', value: 8 },
      { label: 'W4', value: 14 },
      { label: 'W5', value: 12 },
      { label: 'W6', value: 17 },
      { label: 'W7', value: 19 },
      { label: 'W8', value: 16 },
    ],
  },
  {
    id: 'completion_rate',
    label: 'Completion Rate',
    unit: 'percent',
    points: [
      { label: 'W1', value: 93 },
      { label: 'W2', value: 95 },
      { label: 'W3', value: 94 },
      { label: 'W4', value: 97 },
      { label: 'W5', value: 96 },
      { label: 'W6', value: 98 },
      { label: 'W7', value: 99 },
      { label: 'W8', value: 99 },
    ],
  },
  {
    id: 'average_rating',
    label: 'Average Rating',
    unit: 'count',
    points: [
      { label: 'W1', value: 4.62 },
      { label: 'W2', value: 4.68 },
      { label: 'W3', value: 4.71 },
      { label: 'W4', value: 4.76 },
      { label: 'W5', value: 4.79 },
      { label: 'W6', value: 4.83 },
      { label: 'W7', value: 4.87 },
      { label: 'W8', value: 4.87 },
    ],
  },
];

export const SEED_LEDGER: LedgerEntry[] = [
  {
    id: 'ledger-001',
    orderNumber: 'GH-0006F',
    gigTitle: 'I will design a timeless brand identity system for your startup',
    grossCents: 54_900,
    feeCents: calculateServiceFeeCents(54_900),
    netCents: calculateNetRevenueCents(54_900),
    createdAt: isoFromOffset(ANCHOR, -55),
    availableAt: isoFromOffset(ANCHOR, -48),
    status: 'paid_out',
    method: 'Wise ···· 4821',
  },
  {
    id: 'ledger-002',
    orderNumber: 'GH-0007A',
    gigTitle: 'I will create a 60 second animated explainer video',
    grossCents: 16_500,
    feeCents: calculateServiceFeeCents(16_500),
    netCents: calculateNetRevenueCents(16_500),
    createdAt: isoFromOffset(ANCHOR, -36),
    availableAt: isoFromOffset(ANCHOR, -29),
    status: 'paid_out',
    method: 'Wise ···· 4821',
  },
  {
    id: 'ledger-003',
    orderNumber: 'GH-0001B',
    gigTitle: 'I will grow your organic traffic with a technical SEO sprint',
    grossCents: 21_000,
    feeCents: calculateServiceFeeCents(21_000),
    netCents: calculateNetRevenueCents(21_000),
    createdAt: isoFromOffset(ANCHOR, -3),
    availableAt: isoFromOffset(ANCHOR, 4),
    status: 'pending_clearance',
    method: 'Wise ···· 4821',
  },
  {
    id: 'ledger-004',
    orderNumber: 'GH-0003C',
    gigTitle: 'I will edit 15 UGC clips into scroll stopping vertical ads',
    grossCents: 13_600,
    feeCents: calculateServiceFeeCents(13_600),
    netCents: calculateNetRevenueCents(13_600),
    createdAt: isoFromOffset(ANCHOR, -2),
    availableAt: isoFromOffset(ANCHOR, 5),
    status: 'pending_clearance',
    method: 'Wise ···· 4821',
  },
  {
    id: 'ledger-005',
    orderNumber: 'GH-0004D',
    gigTitle: 'I will optimise and harden your REST API for production traffic',
    grossCents: 9_400,
    feeCents: calculateServiceFeeCents(9_400),
    netCents: calculateNetRevenueCents(9_400),
    createdAt: isoFromOffset(ANCHOR, -5),
    availableAt: isoFromOffset(ANCHOR, 2),
    status: 'pending_clearance',
    method: 'Wise ···· 4821',
  },
  {
    id: 'ledger-006',
    orderNumber: 'GH-0008E',
    gigTitle: 'I will write conversion focused landing page copy that sells',
    grossCents: 9_600,
    feeCents: calculateServiceFeeCents(9_600),
    netCents: calculateNetRevenueCents(9_600),
    createdAt: isoFromOffset(ANCHOR, -22),
    availableAt: isoFromOffset(ANCHOR, -15),
    status: 'refunded',
    method: 'Refunded to buyer',
  },
];

export const SEED_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notification-001',
    kind: 'revision',
    title: 'Revision requested on GH-0004D',
    body: 'Lena Brandt asked for tighter cache headers on the /orders endpoint.',
    createdAt: isoFromOffset(ANCHOR, -1, -2),
    isRead: false,
  },
  {
    id: 'notification-002',
    kind: 'order',
    title: 'New order received',
    body: 'Devon Hart purchased the Standard package of your React dashboard gig.',
    createdAt: isoFromOffset(ANCHOR, -1, -7),
    isRead: false,
  },
  {
    id: 'notification-003',
    kind: 'payout',
    title: 'Balance cleared',
    body: '$272.40 moved from pending clearance to your available balance.',
    createdAt: isoFromOffset(ANCHOR, -2, -5),
    isRead: true,
  },
  {
    id: 'notification-004',
    kind: 'system',
    title: 'Response time insight',
    body: 'Your 1.4h median response is 22% faster than the Level 2 median.',
    createdAt: isoFromOffset(ANCHOR, -4),
    isRead: true,
  },
  {
    id: 'notification-005',
    kind: 'order',
    title: 'Delivery received',
    body: 'You delivered GH-0003C. The buyer has 3 days to accept the work.',
    createdAt: isoFromOffset(ANCHOR, -2, -2),
    isRead: true,
  },
];

/* -------------------------------------------------------------------------- */
/* Dataset envelope                                                            */
/* -------------------------------------------------------------------------- */

export interface SeedDataset {
  gigs: GigItem[];
  orders: OrderItem[];
  profile: UserProfile;
  ledger: LedgerEntry[];
  notifications: NotificationItem[];
  metrics: SellerMetricBreakdown[];
  kpiSeries: SellerKpiSeries[];
  anchorTimestamp: number;
}

export function createSeedDataset(): SeedDataset {
  return {
    gigs: SEED_GIGS.map((gig) => ({ ...gig, packages: { ...gig.packages } })),
    orders: SEED_ORDERS.map((order) => ({
      ...order,
      requirements: order.requirements.map((requirement) => ({ ...requirement })),
      milestones: order.milestones.map((milestone) => ({ ...milestone })),
      deliveryFiles: order.deliveryFiles.map((file) => ({ ...file })),
    })),
    profile: { ...CURRENT_USER },
    ledger: SEED_LEDGER.map((entry) => ({ ...entry })),
    notifications: SEED_NOTIFICATIONS.map((notification) => ({ ...notification })),
    metrics: SEED_SELLER_METRICS.map((metric) => ({ ...metric })),
    kpiSeries: SEED_KPI_SERIES.map((series) => ({
      ...series,
      points: series.points.map((point) => ({ ...point })),
    })),
    anchorTimestamp: ANCHOR,
  };
}

export const SEED_GIG_CATEGORY_COUNTS: Record<GigCategory, number> = SEED_GIGS.reduce<Record<GigCategory, number>>(
  (accumulator, gig) => {
    accumulator[gig.category] += 1;
    return accumulator;
  },
  {
    'Graphics & Design': 0,
    'Digital Marketing': 0,
    'Writing & Translation': 0,
    'Video & Animation': 0,
    'Music & Audio': 0,
    'Programming & Tech': 0,
    'AI Services': 0,
  }
);

export { SELLERS, BUYERS };
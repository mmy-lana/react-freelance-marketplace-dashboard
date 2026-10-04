/**
 * Environment-safe identifier generation.
 *
 * Prefers the platform CSPRNG (`crypto.randomUUID`) and degrades gracefully on
 * insecure origins / older browsers so the app never crashes outside HTTPS.
 */

const FALLBACK_ALPHABET = 'abcdefghijklmnopqrstuvwxyz0123456789';

export function generateSafeId(prefix = ''): string {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
  return prefix ? `${prefix}-${randomPart}` : randomPart;
}

/**
 * Slugifies arbitrary text into a URL safe identifier.
 * Guarantees a non-empty result by falling back to a generated suffix.
 */
export function slugify(value: string, fallbackPrefix = 'item'): string {
  const slug = value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);

  if (slug.length > 0) {
    return slug;
  }

  let randomSuffix = '';
  for (let index = 0; index < 6; index += 1) {
    randomSuffix += FALLBACK_ALPHABET[Math.floor(Math.random() * FALLBACK_ALPHABET.length)];
  }
  return `${fallbackPrefix}-${randomSuffix}`;
}

/** Human-facing, collision-resistant order reference (e.g. `GH-4F2A91`). */
export function generateOrderNumber(): string {
  const characters = '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let suffix = '';
  for (let index = 0; index < 6; index += 1) {
    suffix += characters[Math.floor(Math.random() * characters.length)];
  }
  return `GH-${suffix}`;
}

/** Creates `count` unique safe ids in a single pass. */
export function generateSafeIdBatch(prefix: string, count: number): string[] {
  return Array.from({ length: count }, () => generateSafeId(prefix));
}
/**
 * Icon policy lint.
 *
 * The product ships Lucide SVG primitives instead of emoji and ad-hoc Unicode
 * glyphs: emoji render differently on every platform, ignore `currentColor` and
 * cannot inherit text size or weight from the design system.
 *
 * This lint fails the build when a pictographic character leaks back into the
 * component or domain layers. The generated SVG artwork in `seedData.ts` is the
 * single exception: those glyphs are illustration content, XML escaped and
 * percent encoded into a data URI, so they never reach the document.
 *
 * Usage: node scripts/lint-icons.mjs
 * Exit code 0 = clean.
 */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const SCAN_ROOTS = ['src'];
const SOURCE_PATTERN = /\.(ts|tsx)$/;

/** Files where pictographic characters are illustration content, not UI. */
const ALLOWED_FILES = new Set(['src/utils/seedData.ts']);

const EMOJI = /\p{Extended_Pictographic}/u;

function collectSourceFiles(directory, accumulator = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      collectSourceFiles(full, accumulator);
    } else if (SOURCE_PATTERN.test(entry.name)) {
      accumulator.push(full);
    }
  }
  return accumulator;
}

const violations = [];

for (const file of collectSourceFiles(path.resolve(SCAN_ROOTS[0]))) {
  if (ALLOWED_FILES.has(path.relative(process.cwd(), file))) {
    continue;
  }
  const relative = path.relative(process.cwd(), file);
  fs.readFileSync(file, 'utf8')
    .split('\n')
    .forEach((line, index) => {
      for (const character of line) {
        if (!EMOJI.test(character)) {
          continue;
        }
        const codePoint = character.codePointAt(0).toString(16).toUpperCase().padStart(4, '0');
        violations.push(`${relative}:${index + 1} ${character} (U+${codePoint})`);
        break;
      }
    });
}

console.log('=== icon policy lint ===');
if (violations.length > 0) {
  console.log('Replace pictographic glyphs with Lucide components:');
  violations.forEach((violation) => console.log(`  FAIL ${violation}`));
  process.exitCode = 1;
} else {
  console.log('  ok   no emoji or pictographic glyphs in the component and domain layers');
}
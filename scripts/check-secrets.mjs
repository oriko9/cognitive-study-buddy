/**
 * Criterion N1: no provider key, in any format, may reach the client bundle.
 *
 * Scans dist/ for both Gemini key formats and for the literal variable name,
 * and exits non-zero on a match. Run after a build via `npm run check:secrets`.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';

const PATTERNS = [
  { name: 'legacy AIza-format key', re: /AIza[0-9A-Za-z_-]{20,}/ },
  { name: 'current AQ.-format key', re: /AQ\.[0-9A-Za-z_-]{20,}/ },
  { name: 'literal GEMINI_API_KEY', re: /GEMINI_API_KEY/ },
];

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...walk(full));
    else out.push(full);
  }
  return out;
}

let distFiles;
try {
  distFiles = walk(DIST);
} catch {
  console.error(`check:secrets — ${DIST}/ not found. Run the build first.`);
  process.exit(1);
}

const findings = [];
for (const file of distFiles) {
  const text = readFileSync(file, 'utf8');
  for (const { name, re } of PATTERNS) {
    if (re.test(text)) findings.push(`${file}: ${name}`);
  }
}

if (findings.length > 0) {
  console.error('check:secrets FAILED — provider key material found in the client bundle:');
  for (const finding of findings) console.error(`  ${finding}`);
  process.exit(1);
}

console.log(`check:secrets passed — scanned ${distFiles.length} file(s) in ${DIST}/, no key material found.`);

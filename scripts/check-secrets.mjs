/**
 * Criterion N1: the provider key exists only as a server-side environment
 * variable, and no key material reaches the client bundle or the repository.
 *
 * Two surfaces, because they fail differently.
 *
 *   dist/          — what ships to the browser. Nothing about the key belongs
 *                    here, not even the variable name: seeing GEMINI_API_KEY in
 *                    a bundle means Vite inlined it.
 *   tracked files  — what the repository is about to contain. The variable name
 *                    appears legitimately throughout the source and the specs,
 *                    so the name alone proves nothing here; an assigned *value*
 *                    does. This is the L11 case: a key typed into .env.example
 *                    instead of .env.local never reaches dist/ and would have
 *                    passed a dist-only scan on its way to GitHub.
 *
 * There is deliberately no allowlist. A gate with a skip-list reports green
 * over the file most likely to be skipped. When a scan trips on legitimate
 * content, the content moves — see the fixture change that preceded this file.
 *
 * Findings report the file, the line and which pattern matched. The matched
 * text is never printed: an error message ends up in logs and pasted into
 * chats, which is how L4 was earned.
 */
import { execFileSync } from 'node:child_process';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';

const KEY_FORMATS = [
  // Both formats, always. Scanning only for AIza is the failure this gate
  // exists to prevent: the key this project holds starts with AQ.
  { name: 'legacy AIza-format provider key', re: /AIza[0-9A-Za-z_-]{15,}/ },
  { name: 'current AQ.-format provider key', re: /AQ\.[0-9A-Za-z_-]{15,}/ },
];

const DIST_PATTERNS = [
  ...KEY_FORMATS,
  { name: 'literal GEMINI_API_KEY in a client bundle', re: /GEMINI_API_KEY/ },
];

const TRACKED_PATTERNS = [
  ...KEY_FORMATS,
  { name: 'GEMINI_API_KEY assigned a value', re: /GEMINI_API_KEY[ \t]*=[ \t]*\S+/ },
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

function trackedFiles() {
  const stdout = execFileSync('git', ['ls-files', '-z'], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  return stdout.split('\0').filter((path) => path !== '');
}

function scan(files, patterns) {
  const findings = [];
  for (const file of files) {
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      continue; // deleted between listing and read; nothing to scan
    }
    const lines = text.split(/\r?\n/);
    for (const [index, line] of lines.entries()) {
      for (const { name, re } of patterns) {
        if (re.test(line)) findings.push(`${file}:${index + 1}: ${name}`);
      }
    }
  }
  return findings;
}

let distFiles;
try {
  distFiles = walk(DIST);
} catch {
  console.error(`check:secrets — ${DIST}/ not found. Run the build first.`);
  process.exit(1);
}

const tracked = trackedFiles();

const findings = [
  ...scan(distFiles, DIST_PATTERNS),
  ...scan(tracked, TRACKED_PATTERNS),
];

if (findings.length > 0) {
  console.error('check:secrets FAILED — key material found:');
  for (const finding of findings) console.error(`  ${finding}`);
  console.error('');
  console.error('Move the value into .env.local (gitignored) or a Vercel environment');
  console.error('variable. Do not add an exception to this gate.');
  process.exit(1);
}

console.log(
  `check:secrets passed — scanned ${distFiles.length} built file(s) in ${DIST}/ ` +
    `and ${tracked.length} tracked file(s), no key material found.`,
);

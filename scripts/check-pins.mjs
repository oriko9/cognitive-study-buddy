/**
 * Criterion N8: the model is pinned to an explicit version. No moving alias.
 *
 * A model id ending in the moving-alias suffix keeps working indefinitely and
 * quietly stops meaning the same thing. A spec whose subject drifts cannot be
 * reproduced, and a bug that cannot be reproduced cannot be fixed — so the
 * alias is banned outright rather than discouraged.
 *
 * Scope: git-tracked *source* files. Prose is excluded because the documents
 * that forbid the alias have to be able to name it — CLAUDE.md §4.2 and
 * framing.md N8 both contain the literal string, and a gate that fails on the
 * rule stating the rule is a gate nobody keeps. This is a scope definition, not
 * an allowlist: no individual file is exempted, and every file that can carry a
 * model id is scanned.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { extname } from 'node:path';

// Built from parts so this scanner does not match itself. Excluding the file
// instead would be the allowlist this gate deliberately does not have.
const FORBIDDEN = '-' + 'latest';

const SOURCE_EXTENSIONS = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.yml',
  '.yaml',
  '.html',
  '.css',
]);

const tracked = execFileSync('git', ['ls-files', '-z'], {
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
})
  .split('\0')
  .filter((path) => path !== '' && SOURCE_EXTENSIONS.has(extname(path)));

const findings = [];
for (const file of tracked) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    continue;
  }
  for (const [index, line] of text.split(/\r?\n/).entries()) {
    if (line.includes(FORBIDDEN)) findings.push(`${file}:${index + 1}`);
  }
}

if (findings.length > 0) {
  console.error(`check:pins FAILED — moving alias "${FORBIDDEN}" found in tracked source:`);
  for (const finding of findings) console.error(`  ${finding}`);
  console.error('');
  console.error('Pin the explicit version instead. A moving alias makes the behaviour');
  console.error('of this repository unreproducible from its own history.');
  process.exit(1);
}

console.log(
  `check:pins passed — scanned ${tracked.length} tracked source file(s), no "${FORBIDDEN}" alias found.`,
);

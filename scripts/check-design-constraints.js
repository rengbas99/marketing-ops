import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

const SRC_DIR = path.join(ROOT, 'src');
const INDEX_CSS = path.join(SRC_DIR, 'index.css');

const TEXT_EXTENSIONS = new Set(['.js', '.jsx', '.ts', '.tsx', '.css']);
const ALLOW_100VH = new Set([path.join(SRC_DIR, 'utils', 'viewport.js')]);
const ALLOW_BACKDROP = new Set([path.join(SRC_DIR, 'components', 'overlay'), INDEX_CSS]);

const LAYOUT_PROPS = /(height|width|top|left|right|bottom|margin|padding)/i;

function isTextFile(filePath) {
  return TEXT_EXTENSIONS.has(path.extname(filePath));
}

function collectFiles(dir, acc = []) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach((entry) => {
    if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
      return;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectFiles(fullPath, acc);
    } else if (isTextFile(fullPath)) {
      acc.push(fullPath);
    }
  });
  return acc;
}

function inAllowedPaths(filePath, allowSet) {
  for (const allowed of allowSet) {
    if (filePath === allowed || filePath.startsWith(`${allowed}${path.sep}`)) {
      return true;
    }
  }
  return false;
}

function checkNo100vh(filePath, content, violations) {
  if (ALLOW_100VH.has(filePath)) return;
  if (content.includes('100vh')) {
    violations.push({
      filePath,
      message: 'Use calc(var(--vh) * 100) instead of 100vh.',
    });
  }
}

function checkBackdropFilter(filePath, content, violations) {
  if (inAllowedPaths(filePath, ALLOW_BACKDROP)) return;
  if (content.includes('backdrop-filter')) {
    violations.push({
      filePath,
      message: 'backdrop-filter is restricted to the portal overlay.',
    });
  }
}

function checkTransitionLayoutProps(filePath, content, violations) {
  // Only check actual CSS transition: declarations, not Tailwind classes
  // Match "transition:" followed by properties and ending with semicolon
  const transitionRegex = /transition\s*:\s*[^;]+;/gi;
  let match;
  while ((match = transitionRegex.exec(content)) !== null) {
    const transitionDecl = match[0];
    // Check if the transition includes layout properties
    if (LAYOUT_PROPS.test(transitionDecl)) {
      violations.push({
        filePath,
        message: `Transitions cannot target layout props (${transitionDecl.trim()}).`,
      });
      break;
    }
  }
}

function main() {
  const files = collectFiles(SRC_DIR);
  const violations = [];

  files.forEach((filePath) => {
    const content = fs.readFileSync(filePath, 'utf8');
    checkNo100vh(filePath, content, violations);
    checkBackdropFilter(filePath, content, violations);
    checkTransitionLayoutProps(filePath, content, violations);
  });

  if (violations.length) {
    console.error('Design constraints failed:\n');
    violations.forEach(({ filePath, message }) => {
      console.error(`- ${path.relative(ROOT, filePath)}: ${message}`);
    });
    console.error('\nUpdate the offending files or extend the allow list.');
    process.exit(1);
  } else {
    console.log('Design constraints passed ✅');
  }
}

main();


// lint-staged: runs tools ONLY on staged files — fast.
// Invoked from the pre-commit hook (husky).
// typecheck is NOT run file-by-file here (tsc can't do partial project checks) —
// full typecheck runs in CI and a separate npm script before push.
export default {
  // TS/JS: ESLint autofix + Prettier formatting.
  "**/*.{ts,tsx,js,mjs,cjs}": ["eslint --fix", "prettier --write"],
  // Everything else Prettier can format (incl. the HTML showcases in docs/changes).
  "**/*.{json,css,md,mdx,yml,yaml,html}": ["prettier --write"],
};

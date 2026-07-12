// Conventional Commits for the CRM Pro project.
// Checked by the commit-msg hook (husky) and in CI.
// Format:   <type>(<scope>)?: <subject>
// Examples: feat(deals): add the "paid" stage transition
//           fix(erp): parse stock levels from OData correctly
//           chore: bump dependencies
/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Allowed types. Kept short and meaningful for a small team.
    "type-enum": [
      2,
      "always",
      [
        "feat", // new functionality
        "fix", // bug fix
        "refactor", // refactor with no behavior change
        "perf", // performance optimization
        "test", // tests
        "docs", // documentation, ADRs, README
        "style", // formatting (no logic change)
        "build", // build system, dependencies
        "ci", // CI/CD configuration
        "chore", // maintenance (versions, configs, misc.)
        "revert", // commit revert
      ],
    ],
    // Subject: not empty, no trailing period, a reasonable length.
    "subject-empty": [2, "never"],
    "subject-full-stop": [2, "never", "."],
    "header-max-length": [2, "always", 100],
    // Body is optional (small team, small commits), but if present, separate it
    // with a blank line. Subject case is not enforced.
    "subject-case": [0],
  },
};

import type { GitHooksConfig } from "bun-git-hooks";

const config: GitHooksConfig = {
  "pre-commit": {
    "staged-lint": {
      "**/*.ts": [
        "bun lint --staged --no-errors-on-unmatched",
        "bun build-swagger",
      ],
    },
  },
};

export default config;

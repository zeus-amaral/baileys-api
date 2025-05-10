import type { GitHooksConfig } from 'bun-git-hooks'

const config: GitHooksConfig = {
  'pre-commit': 'bun build-swagger && bun lint --staged --no-errors-on-unmatched'
}

export default config

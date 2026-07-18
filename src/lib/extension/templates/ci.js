'use strict';

// GitHub Actions expression syntax: ${{ }} — must be escaped in JS template literals as \${{ }}

/**
 * Generates .github/workflows/ci.yml for a Chrome extension project.
 * Runs on every PR: lint, typecheck, test, build, and manifest validation.
 */
function generateExtensionCI(config) {
  const {
    nodeVersion = '24',
    packageManager = 'npm',
    checks = [],
    productionBranch = 'main',
    extraBranches = [],
    buildTool = 'none',
  } = config;

  const pm = packageManager;
  const installCmd = getInstallCmd(pm);
  const runPrefix = pm === 'yarn' ? 'yarn' : pm === 'pnpm' ? 'pnpm' : 'npm run';

  const prBranches = Array.from(new Set([...extraBranches, productionBranch]));

  const steps = [];

  steps.push(`
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0`);

  const pnpmSetup = pm === 'pnpm' ? `
      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: latest` : '';

  steps.push(`
      - name: Cache dependencies
        uses: actions/cache@v4
        with:
          path: ~/.npm
          key: \${{ runner.os }}-node-\${{ hashFiles('**/package-lock.json', '**/yarn.lock', '**/pnpm-lock.yaml') }}
          restore-keys: |
            \${{ runner.os }}-node-${pnpmSetup}

      - name: Setup Node.js ${nodeVersion}
        uses: actions/setup-node@v4
        with:
          node-version: '${nodeVersion}'
          cache: '${pm === 'pnpm' ? 'pnpm' : pm}'

      - name: Install dependencies
        run: ${installCmd}
        env:
          CI: true`);

  if (checks.includes('lint')) {
    steps.push(`
      - name: Run linter
        run: ${runPrefix} lint`);
  }

  if (checks.includes('typecheck')) {
    steps.push(`
      - name: Run type checking
        run: ${runPrefix} typecheck`);
  }

  if (checks.includes('test')) {
    steps.push(`
      - name: Run unit tests
        run: ${runPrefix} test
        env:
          CI: true`);
  }

  if (checks.includes('build') && buildTool !== 'none') {
    steps.push(`
      - name: Build extension
        run: ${runPrefix} build
        env:
          CI: true`);
  }

  if (checks.includes('validate-manifest')) {
    steps.push(`
      - name: Validate manifest.json
        run: |
          node -e "
            const fs = require('fs');
            const path = ${buildTool === 'none' ? "'manifest.json'" : "'dist/manifest.json'"};
            if (!fs.existsSync(path)) {
              console.error('manifest.json not found at ' + path);
              process.exit(1);
            }
            const manifest = JSON.parse(fs.readFileSync(path, 'utf8'));
            const required = ['manifest_version', 'name', 'version'];
            const missing = required.filter((k) => !manifest[k]);
            if (missing.length) {
              console.error('manifest.json missing required fields: ' + missing.join(', '));
              process.exit(1);
            }
            if (manifest.manifest_version !== 3) {
              console.error('manifest_version must be 3 (Manifest V3)');
              process.exit(1);
            }
            console.log('manifest.json is valid — version ' + manifest.version);
          "`);
  }

  return `name: CI

on:
  pull_request:
    branches:
${prBranches.map(b => `      - ${b}`).join('\n')}
  push:
    branches:
${prBranches.map(b => `      - ${b}`).join('\n')}

# Cancel in-progress runs for the same branch on new pushes
concurrency:
  group: ci-\${{ github.ref }}
  cancel-in-progress: true

permissions:
  contents: read
  pull-requests: read

jobs:
  ci:
    name: CI Checks
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:${steps.join('')}
`;
}

function getInstallCmd(pm) {
  switch (pm) {
    case 'yarn': return 'yarn install --frozen-lockfile';
    case 'pnpm': return 'pnpm install --frozen-lockfile';
    default:     return 'npm ci';
  }
}

module.exports = { generateExtensionCI, getInstallCmd };

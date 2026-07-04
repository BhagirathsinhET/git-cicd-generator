'use strict';

// GitHub Actions expression syntax: ${{ }} — must be escaped in JS template literals as \${{ }}

/**
 * Generates .github/workflows/ci.yml
 * Runs on every PR with checkout, language setup, dep install, and selected checks.
 */
function generateCI(config) {
  const {
    projectType,
    packageManager = 'npm',
    checks = [],
    branchFlow,
  } = config;

  const isPhp = projectType === 'laravel' || projectType === 'wordpress';
  const nodeVersion = getNodeVersion(projectType);
  const pm = packageManager;
  const installCmd = getInstallCmd(pm);
  const runPrefix = pm === 'yarn' ? 'yarn' : pm === 'pnpm' ? 'pnpm' : 'npm run';

  // Determine PR target branches based on branch flow
  const prBranches = branchFlow === 'dev-staging-main'
    ? ['dev', 'staging', 'main']
    : ['main'];

  const steps = [];

  // Checkout step
  steps.push(`
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0`);

  if (isPhp) {
    steps.push(`
      - name: Setup PHP 8.2
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.2'
          extensions: mbstring, bcmath, pdo, pdo_mysql
          coverage: none

      - name: Get Composer cache directory
        id: composer-cache
        run: echo "dir=$(composer config cache-files-dir)" >> $GITHUB_OUTPUT

      - name: Cache Composer dependencies
        uses: actions/cache@v4
        with:
          path: \${{ steps.composer-cache.outputs.dir }}
          key: \${{ runner.os }}-composer-\${{ hashFiles('**/composer.lock') }}
          restore-keys: \${{ runner.os }}-composer-

      - name: Install Composer dependencies
        run: composer install --no-interaction --prefer-dist --optimize-autoloader`);

    if (projectType === 'laravel') {
      steps.push(`
      - name: Copy .env file
        run: cp .env.example .env

      - name: Generate application key
        run: php artisan key:generate`);
    }

    steps.push(`
      - name: Setup Node.js for asset compilation
        uses: actions/setup-node@v4
        with:
          node-version: '${nodeVersion}'
          cache: 'npm'

      - name: Install Node dependencies
        run: npm ci`);
  } else {
    // Node project
    if (pm === 'pnpm') {
      steps.push(`
      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: latest`);
    }

    steps.push(`
      - name: Cache dependencies
        uses: actions/cache@v4
        with:
          path: |
            ~/.npm
            \${{ github.workspace }}/.next/cache
          key: \${{ runner.os }}-node-\${{ hashFiles('**/package-lock.json', '**/yarn.lock', '**/pnpm-lock.yaml') }}
          restore-keys: |
            \${{ runner.os }}-node-

      - name: Setup Node.js ${nodeVersion}
        uses: actions/setup-node@v4
        with:
          node-version: '${nodeVersion}'
          cache: '${pm === 'pnpm' ? 'pnpm' : pm}'

      - name: Install dependencies
        run: ${installCmd}
        env:
          CI: true`);
  }

  // Lint step
  if (checks.includes('lint')) {
    if (isPhp) {
      steps.push(`
      - name: Run PHP linter (PHP CS Fixer)
        run: vendor/bin/php-cs-fixer fix --dry-run --diff`);
    } else {
      steps.push(`
      - name: Run linter
        run: ${runPrefix} lint`);
    }
  }

  // Typecheck step
  if (checks.includes('typecheck') && !isPhp) {
    steps.push(`
      - name: Run type checking
        run: ${runPrefix} typecheck`);
  }

  // Test step
  if (checks.includes('test')) {
    if (isPhp) {
      steps.push(`
      - name: Run PHP tests (PHPUnit)
        run: vendor/bin/phpunit --coverage-text
        env:
          DB_CONNECTION: sqlite
          DB_DATABASE: ':memory:'`);
    } else {
      steps.push(`
      - name: Run unit tests
        run: ${runPrefix} test
        env:
          CI: true`);
    }
  }

  // Build step
  if (checks.includes('build') && !isPhp) {
    steps.push(`
      - name: Build project
        run: ${runPrefix} build
        env:
          CI: true`);
  }

  // Lighthouse CI
  if (checks.includes('lighthouse') && !isPhp) {
    steps.push(`
      - name: Run Lighthouse CI
        uses: treosh/lighthouse-ci-action@v11
        with:
          uploadArtifacts: true
          temporaryPublicStorage: true`);
  }

  // Playwright E2E
  if (checks.includes('playwright') && !isPhp) {
    const execCmd = pm === 'pnpm' ? 'pnpm exec' : pm === 'yarn' ? 'yarn' : 'npx';
    steps.push(`
      - name: Install Playwright browsers
        run: ${execCmd} playwright install --with-deps chromium

      - name: Run Playwright E2E tests
        run: ${runPrefix} test:e2e
        env:
          CI: true

      - name: Upload Playwright report
        uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 7`);
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

function getNodeVersion(projectType) {
  switch (projectType) {
    case 'nextjs':        return '20';
    case 'react':         return '20';
    case 'nodejs':        return '20';
    case 'nestjs':        return '20';
    case 'shopify-theme': return '18';
    case 'laravel':       return '20';
    case 'wordpress':     return '18';
    default:              return '20';
  }
}

function getInstallCmd(pm) {
  switch (pm) {
    case 'yarn': return 'yarn install --frozen-lockfile';
    case 'pnpm': return 'pnpm install --frozen-lockfile';
    default:     return 'npm ci';
  }
}

module.exports = { generateCI, getNodeVersion, getInstallCmd };

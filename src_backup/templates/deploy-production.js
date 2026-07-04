'use strict';

// GitHub Actions expression syntax: ${{ }} — must be escaped in JS template literals as \${{ }}

const { getNodeVersion, getInstallCmd } = require('./ci');
const { buildDeploySteps } = require('./deploy-staging');

/**
 * Generates .github/workflows/deploy-production.yml
 * Triggers on push to main branch. Includes CI, deploy, and GitHub Release creation.
 */
function generateDeployProduction(config) {
  const {
    projectType,
    packageManager = 'npm',
    deployTarget,
    checks = [],
    deployEnvironments = [],
  } = config;

  if (!deployEnvironments.includes('production') && !deployEnvironments.includes('both')) {
    return null;
  }

  const isPhp = projectType === 'laravel' || projectType === 'wordpress';
  const nodeVersion = getNodeVersion(projectType);
  const pm = packageManager;
  const installCmd = getInstallCmd(pm);
  const runPrefix = pm === 'yarn' ? 'yarn' : pm === 'pnpm' ? 'pnpm' : 'npm run';

  const allSetupSteps = isPhp ? buildPhpSetupSteps(nodeVersion) : buildNodeSetupSteps({ nodeVersion, pm, installCmd });
  const checkSteps    = buildCheckSteps({ checks, isPhp, runPrefix });
  const deploySteps   = buildDeploySteps({ deployTarget, environment: 'production' });
  const deploySetup   = buildDeploySetupSteps({ isPhp, nodeVersion, pm, installCmd, deployTarget });

  return `name: Deploy to Production

on:
  push:
    branches:
      - main

# Never cancel a production deploy — wait for it to finish
concurrency:
  group: deploy-production
  cancel-in-progress: false

permissions:
  contents: write
  deployments: write
  pull-requests: read

jobs:
  ci:
    name: CI Checks
    runs-on: ubuntu-latest
    timeout-minutes: 30

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
${allSetupSteps}${checkSteps}

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: ci
    timeout-minutes: 30
    environment:
      name: production
      url: \${{ steps.deploy.outputs.url || 'https://example.com' }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0
${deploySetup}
${deploySteps}

  create-release:
    name: Create GitHub Release
    runs-on: ubuntu-latest
    needs: deploy-production
    timeout-minutes: 10

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Generate release tag
        id: tag
        run: |
          VERSION="v$(date +'%Y.%m.%d')-$(echo \${{ github.sha }} | cut -c1-7)"
          echo "version=$VERSION" >> $GITHUB_OUTPUT

      - name: Generate changelog
        id: changelog
        run: |
          PREVIOUS_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
          if [ -z "$PREVIOUS_TAG" ]; then
            COMMITS=$(git log --oneline --no-merges -20)
          else
            COMMITS=$(git log \${PREVIOUS_TAG}..HEAD --oneline --no-merges)
          fi
          {
            echo "changelog<<EOF"
            echo "$COMMITS"
            echo "EOF"
          } >> $GITHUB_OUTPUT

      - name: Create GitHub Release
        uses: actions/github-script@v7
        with:
          script: |
            await github.rest.repos.createRelease({
              owner: context.repo.owner,
              repo: context.repo.repo,
              tag_name: '\${{ steps.tag.outputs.version }}',
              name: 'Release \${{ steps.tag.outputs.version }}',
              body: '## What\'s Changed\\n\\n\${{ steps.changelog.outputs.changelog }}',
              draft: false,
              prerelease: false,
              target_commitish: context.sha,
            });
`;
}

function buildNodeSetupSteps({ nodeVersion, pm, installCmd }) {
  const pnpmSetup = pm === 'pnpm' ? `
      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: latest` : '';

  return `
      - name: Cache dependencies
        uses: actions/cache@v4
        with:
          path: |
            ~/.npm
            \${{ github.workspace }}/.next/cache
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
          CI: true`;
}

function buildPhpSetupSteps(nodeVersion) {
  return `
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
        run: composer install --no-interaction --prefer-dist --optimize-autoloader

      - name: Setup Node.js for assets
        uses: actions/setup-node@v4
        with:
          node-version: '${nodeVersion}'
          cache: 'npm'

      - name: Install Node dependencies
        run: npm ci`;
}

function buildCheckSteps({ checks, isPhp, runPrefix }) {
  const steps = [];

  if (checks.includes('lint')) {
    steps.push(isPhp
      ? `\n      - name: Lint\n        run: vendor/bin/php-cs-fixer fix --dry-run --diff`
      : `\n      - name: Lint\n        run: ${runPrefix} lint`);
  }
  if (checks.includes('typecheck') && !isPhp) {
    steps.push(`\n      - name: Type check\n        run: ${runPrefix} typecheck`);
  }
  if (checks.includes('test')) {
    steps.push(isPhp
      ? `\n      - name: Test\n        run: vendor/bin/phpunit\n        env:\n          DB_CONNECTION: sqlite\n          DB_DATABASE: ':memory:'`
      : `\n      - name: Test\n        run: ${runPrefix} test\n        env:\n          CI: true`);
  }
  if (checks.includes('build') && !isPhp) {
    steps.push(`\n      - name: Build\n        run: ${runPrefix} build\n        env:\n          CI: true`);
  }

  return steps.join('');
}

function buildDeploySetupSteps({ isPhp, nodeVersion, pm, installCmd, deployTarget }) {
  if (['vps', 'render'].includes(deployTarget)) return '';

  if (isPhp) {
    return `
      - name: Setup PHP 8.2
        uses: shivammathur/setup-php@v2
        with:
          php-version: '8.2'
          extensions: mbstring, bcmath, pdo, pdo_mysql
          coverage: none
      - name: Install Composer dependencies
        run: composer install --no-interaction --prefer-dist --optimize-autoloader
      - name: Install Node dependencies
        run: npm ci`;
  }

  const pnpmSetup = pm === 'pnpm' ? `
      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: latest` : '';

  return `${pnpmSetup}
      - name: Setup Node.js ${nodeVersion}
        uses: actions/setup-node@v4
        with:
          node-version: '${nodeVersion}'
          cache: '${pm === 'pnpm' ? 'pnpm' : pm}'
      - name: Install dependencies
        run: ${installCmd}
        env:
          CI: true`;
}

module.exports = { generateDeployProduction };

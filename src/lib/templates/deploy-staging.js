'use strict';

// GitHub Actions expression syntax: ${{ }} — must be escaped in JS template literals as \${{ }}

const { getNodeVersion, getInstallCmd } = require('./ci');

/**
 * Generates .github/workflows/deploy-staging.yml
 * Triggers on push to the staging branch.
 */
function generateDeployStaging(config) {
  const {
    projectType,
    packageManager = 'npm',
    deployTarget,
    branchFlow,
    checks = [],
    deployEnvironments = [],
  } = config;

  if (!deployEnvironments.includes('staging') && !deployEnvironments.includes('both')) {
    return null;
  }

  const isPhp = projectType === 'laravel' || projectType === 'wordpress';
  const nodeVersion = getNodeVersion(projectType);
  const pm = packageManager;
  const installCmd = getInstallCmd(pm);
  const runPrefix = pm === 'yarn' ? 'yarn' : pm === 'pnpm' ? 'pnpm' : 'npm run';
  const triggerBranch = 'staging';

  const ciSetupSteps   = buildNodeSetupSteps({ isPhp, nodeVersion, pm, installCmd });
  const phpSetupSteps  = isPhp ? buildPhpSetupSteps(nodeVersion) : '';
  const allSetupSteps  = isPhp ? phpSetupSteps : ciSetupSteps;
  const checkSteps     = buildCheckSteps({ checks, isPhp, runPrefix });
  const deploySteps    = buildDeploySteps({ deployTarget, environment: 'staging' });

  return `name: Deploy to Staging

on:
  push:
    branches:
      - ${triggerBranch}

# Only one staging deploy at a time — never cancel in progress
concurrency:
  group: deploy-staging
  cancel-in-progress: false

permissions:
  contents: read
  deployments: write
  pull-requests: write

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

  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: ci
    timeout-minutes: 20
    environment:
      name: staging
      url: \${{ steps.deploy.outputs.url || 'https://staging.example.com' }}

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
${buildDeploySetupSteps({ isPhp, nodeVersion, pm, installCmd, deployTarget })}
${deploySteps}
      - name: Comment deploy URL on PR
        if: success()
        uses: actions/github-script@v7
        with:
          script: |
            const { data: prs } = await github.rest.repos.listPullRequestsAssociatedWithCommit({
              owner: context.repo.owner,
              repo: context.repo.repo,
              commit_sha: context.sha,
            });
            for (const pr of prs) {
              await github.rest.issues.createComment({
                owner: context.repo.owner,
                repo: context.repo.repo,
                issue_number: pr.number,
                body: \`✅ Staging deploy successful!\\n\\nCommit: \${context.sha.slice(0, 7)}\\nEnvironment: staging\`,
              });
            }
`;
}

function buildNodeSetupSteps({ isPhp, nodeVersion, pm, installCmd }) {
  if (isPhp) return '';

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
  // VPS and Render handle their own install on the server
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

/**
 * Build the deploy steps for the chosen target.
 * Exported so deploy-production.js can reuse it with environment='production'.
 */
function buildDeploySteps({ deployTarget, environment }) {
  const envUpper = environment.toUpperCase();

  switch (deployTarget) {
    case 'vercel':
      return `
      - name: Deploy to Vercel (${environment})
        id: deploy
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: \${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: \${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: \${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '${environment === 'production' ? '--prod' : ''}'
          scope: \${{ secrets.VERCEL_ORG_ID }}`;

    case 'render':
      return `
      - name: Trigger Render deploy (${environment})
        id: deploy
        run: |
          RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" \\
            -X POST "\${{ secrets.RENDER_DEPLOY_HOOK_URL }}")
          if [ "$RESPONSE" != "200" ] && [ "$RESPONSE" != "201" ]; then
            echo "Deploy hook responded with HTTP $RESPONSE — failing"
            exit 1
          fi
          echo "Deploy triggered successfully (HTTP $RESPONSE)"
          echo "url=https://your-app.onrender.com" >> $GITHUB_OUTPUT`;

    case 'aws':
      return `
      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: \${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: \${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: \${{ secrets.AWS_REGION }}

      - name: Build project
        run: npm run build
        env:
          NODE_ENV: ${environment}

      - name: Sync files to S3 (${environment})
        id: deploy
        run: |
          # Sync hashed assets first with long-lived cache
          aws s3 sync ./out s3://\${{ secrets.S3_BUCKET_${envUpper} }}/_next/static/ \\
            --cache-control "public,max-age=31536000,immutable" \\
            --delete
          # Sync HTML and other files with no-cache
          aws s3 sync ./out s3://\${{ secrets.S3_BUCKET_${envUpper} }}/ \\
            --exclude "_next/static/*" \\
            --cache-control "no-cache,no-store,must-revalidate" \\
            --delete
          echo "url=https://\${{ secrets.CLOUDFRONT_DOMAIN_${envUpper} }}" >> $GITHUB_OUTPUT

      - name: Invalidate CloudFront cache (${environment})
        run: |
          aws cloudfront create-invalidation \\
            --distribution-id \${{ secrets.CLOUDFRONT_DISTRIBUTION_ID_${envUpper} }} \\
            --paths "/*"`;

    case 'digitalocean':
      return `
      - name: Deploy to DigitalOcean App Platform (${environment})
        id: deploy
        uses: digitalocean/app_action@v2
        with:
          token: \${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}
          app_name: \${{ secrets.DO_APP_NAME_${envUpper} }}`;

    case 'vps':
      return `
      - name: Deploy to VPS via SSH (${environment})
        id: deploy
        uses: appleboy/ssh-action@v1
        with:
          host: \${{ secrets.SSH_HOST_${envUpper} }}
          username: \${{ secrets.SSH_USERNAME }}
          key: \${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            set -e
            cd /var/www/${environment}
            git fetch origin
            git reset --hard origin/${environment === 'production' ? 'main' : 'staging'}
            npm ci --omit=dev
            npm run build
            pm2 restart ${environment}-app --update-env || \\
              pm2 start npm --name "${environment}-app" -- start
            echo "Deploy to ${environment} complete at $(date)"`;

    default:
      return `
      - name: Deploy (${environment})
        run: echo "Configure your deployment target"`;
  }
}

module.exports = { generateDeployStaging, buildDeploySteps };

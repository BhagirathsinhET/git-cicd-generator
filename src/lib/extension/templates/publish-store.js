'use strict';

// GitHub Actions expression syntax: ${{ }} — must be escaped in JS template literals as \${{ }}

const { getInstallCmd } = require('./ci');

/**
 * Generates .github/workflows/publish-store.yml
 * Triggers on version tag push (v*.*.*). Builds the extension and publishes
 * it to the Chrome Web Store / Firefox Add-ons / Edge Add-ons, per selection.
 */
function generatePublishStore(config) {
  const {
    packageManager = 'npm',
    buildTool = 'none',
    browserTargets = ['chrome'],
  } = config;

  const nodeVersion = '24';
  const pm = packageManager;
  const installCmd = getInstallCmd(pm);
  const runPrefix = pm === 'yarn' ? 'yarn' : pm === 'pnpm' ? 'pnpm' : 'npm run';
  const distDir = buildTool === 'none' ? '.' : 'dist';

  const pnpmSetup = pm === 'pnpm' ? `
      - name: Setup pnpm
        uses: pnpm/action-setup@v4
        with:
          version: latest` : '';

  const buildStep = buildTool !== 'none' ? `
      - name: Build extension
        run: ${runPrefix} build
        env:
          CI: true` : '';

  const setupSteps = `
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0${pnpmSetup}

      - name: Setup Node.js ${nodeVersion}
        uses: actions/setup-node@v4
        with:
          node-version: '${nodeVersion}'
          cache: '${pm === 'pnpm' ? 'pnpm' : pm}'

      - name: Install dependencies
        run: ${installCmd}
        env:
          CI: true${buildStep}

      - name: Zip extension
        run: |
          cd ${distDir}
          zip -r ../extension.zip . -x "*.map"
          cd -`;

  const jobs = [];

  if (browserTargets.includes('chrome')) {
    jobs.push(`
  publish-chrome:
    name: Publish to Chrome Web Store
    runs-on: ubuntu-latest
    timeout-minutes: 20
    environment:
      name: chrome-web-store

    steps:${setupSteps}

      - name: Upload & publish to Chrome Web Store
        run: |
          npx chrome-webstore-upload-cli upload --source extension.zip \\
            --extension-id "\${{ secrets.CHROME_EXTENSION_ID }}" \\
            --client-id "\${{ secrets.CHROME_CLIENT_ID }}" \\
            --client-secret "\${{ secrets.CHROME_CLIENT_SECRET }}" \\
            --refresh-token "\${{ secrets.CHROME_REFRESH_TOKEN }}"
          npx chrome-webstore-upload-cli publish \\
            --extension-id "\${{ secrets.CHROME_EXTENSION_ID }}" \\
            --client-id "\${{ secrets.CHROME_CLIENT_ID }}" \\
            --client-secret "\${{ secrets.CHROME_CLIENT_SECRET }}" \\
            --refresh-token "\${{ secrets.CHROME_REFRESH_TOKEN }}"`);
  }

  if (browserTargets.includes('firefox')) {
    jobs.push(`
  publish-firefox:
    name: Publish to Firefox Add-ons
    runs-on: ubuntu-latest
    timeout-minutes: 20
    environment:
      name: firefox-addons

    steps:${setupSteps}

      - name: Sign & publish to Firefox Add-ons
        run: |
          npx web-ext sign \\
            --source-dir ${distDir} \\
            --api-key "\${{ secrets.FIREFOX_JWT_ISSUER }}" \\
            --api-secret "\${{ secrets.FIREFOX_JWT_SECRET }}" \\
            --channel listed`);
  }

  if (browserTargets.includes('edge')) {
    jobs.push(`
  publish-edge:
    name: Publish to Edge Add-ons
    runs-on: ubuntu-latest
    timeout-minutes: 20
    environment:
      name: edge-addons

    steps:${setupSteps}

      - name: Get Edge Add-ons access token
        id: edge-token
        run: |
          TOKEN=$(curl -s -X POST "\${{ secrets.EDGE_ACCESS_TOKEN_URL }}" \\
            -d "client_id=\${{ secrets.EDGE_CLIENT_ID }}" \\
            -d "client_secret=\${{ secrets.EDGE_CLIENT_SECRET }}" \\
            -d "grant_type=client_credentials" \\
            -d "scope=https://api.addons.microsoftedge.microsoft.com/.default" \\
            | node -e "process.stdin.resume();let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>console.log(JSON.parse(d).access_token))")
          echo "token=$TOKEN" >> $GITHUB_OUTPUT

      - name: Upload package to Edge Add-ons
        run: |
          curl -s -X POST \\
            "https://api.addons.microsoftedge.microsoft.com/v1/products/\${{ secrets.EDGE_PRODUCT_ID }}/submissions/draft/package" \\
            -H "Authorization: Bearer \${{ steps.edge-token.outputs.token }}" \\
            -H "Content-Type: application/zip" \\
            --data-binary @extension.zip

      - name: Publish submission
        run: |
          curl -s -X POST \\
            "https://api.addons.microsoftedge.microsoft.com/v1/products/\${{ secrets.EDGE_PRODUCT_ID }}/submissions" \\
            -H "Authorization: Bearer \${{ steps.edge-token.outputs.token }}"`);
  }

  return `name: Publish to Stores

on:
  push:
    tags:
      - 'v*.*.*'

concurrency:
  group: publish-store
  cancel-in-progress: false

permissions:
  contents: read

jobs:${jobs.join('\n')}
`;
}

module.exports = { generatePublishStore };

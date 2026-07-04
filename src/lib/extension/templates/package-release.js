'use strict';

// GitHub Actions expression syntax: ${{ }} — must be escaped in JS template literals as \${{ }}

const { getInstallCmd } = require('./ci');

/**
 * Generates .github/workflows/package-release.yml
 * Triggers on push to main. Builds the extension, zips it per browser target,
 * and attaches the zip(s) to a GitHub Release.
 */
function generatePackageRelease(config) {
  const {
    packageManager = 'npm',
    buildTool = 'none',
    browserTargets = ['chrome'],
    productionBranch = 'main',
    checks = [],
  } = config;

  const nodeVersion = '20';
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

  const testStep = checks.includes('test') ? `
      - name: Run unit tests
        run: ${runPrefix} test
        env:
          CI: true` : '';

  const zipSteps = browserTargets.map((target) => `
      - name: Package zip for ${capitalize(target)}
        run: |
          cd ${distDir}
          zip -r ../extension-${target}.zip . -x "*.map"
          cd -`).join('');

  const uploadArtifactSteps = browserTargets.map((target) => `
      - name: Upload ${capitalize(target)} artifact
        uses: actions/upload-artifact@v4
        with:
          name: extension-${target}
          path: extension-${target}.zip
          retention-days: 30`).join('');

  const releaseAssets = browserTargets.map((target) => `extension-${target}.zip`).join(',');

  return `name: Package & Release

on:
  push:
    branches:
      - ${productionBranch}

concurrency:
  group: package-release
  cancel-in-progress: false

permissions:
  contents: write

jobs:
  build:
    name: Build & Package
    runs-on: ubuntu-latest
    timeout-minutes: 20

    steps:
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
          CI: true${testStep}${buildStep}
${zipSteps}
${uploadArtifactSteps}

  create-release:
    name: Create GitHub Release
    runs-on: ubuntu-latest
    needs: build
    timeout-minutes: 10

    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

${browserTargets.map((target) => `      - name: Download ${capitalize(target)} artifact
        uses: actions/download-artifact@v4
        with:
          name: extension-${target}`).join('\n\n')}

      - name: Read extension version
        id: version
        run: |
          VERSION=$(node -e "console.log(require('./package.json').version || '0.0.0')")
          echo "version=v$VERSION" >> $GITHUB_OUTPUT

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
        uses: softprops/action-gh-release@v2
        with:
          tag_name: \${{ steps.version.outputs.version }}
          name: Release \${{ steps.version.outputs.version }}
          body: |
            ## What's Changed

            \${{ steps.changelog.outputs.changelog }}
          files: ${releaseAssets}
`;
}

function capitalize(s) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

module.exports = { generatePackageRelease };

'use strict';

/**
 * Generates .env.example with all required secrets and env vars
 * based on the deployment target selection.
 */
function generateEnvExample(config) {
  const { deployTarget, projectType, deployEnvironments = [] } = config;
  const hasStaging = deployEnvironments.includes('staging') || deployEnvironments.includes('both');
  const hasProd = deployEnvironments.includes('production') || deployEnvironments.includes('both');
  const isPhp = projectType === 'laravel' || projectType === 'wordpress';

  const sections = [];

  // ── Common app vars ──────────────────────────────────────────────────────
  sections.push({
    title: 'Application',
    vars: [
      { key: 'NODE_ENV', value: 'production', comment: 'production | staging | development' },
      { key: 'PORT', value: '3000', comment: 'Application port' },
    ],
  });

  if (isPhp) {
    sections.push({
      title: 'PHP / Laravel',
      vars: [
        { key: 'APP_KEY', value: '', comment: 'Run: php artisan key:generate --show' },
        { key: 'APP_URL', value: 'https://example.com', comment: 'Public app URL' },
        { key: 'DB_CONNECTION', value: 'mysql' },
        { key: 'DB_HOST', value: '127.0.0.1' },
        { key: 'DB_PORT', value: '3306' },
        { key: 'DB_DATABASE', value: 'your_database' },
        { key: 'DB_USERNAME', value: 'your_username' },
        { key: 'DB_PASSWORD', value: '', comment: 'REQUIRED — set as GitHub secret' },
      ],
    });
  }

  // ── GitHub Actions secrets ────────────────────────────────────────────────
  const githubSecrets = [];

  switch (deployTarget) {
    case 'vercel':
      githubSecrets.push(
        { key: 'VERCEL_TOKEN', value: '', comment: 'From vercel.com → Account Settings → Tokens' },
        { key: 'VERCEL_ORG_ID', value: '', comment: 'From .vercel/project.json after `vercel link`' },
        { key: 'VERCEL_PROJECT_ID', value: '', comment: 'From .vercel/project.json after `vercel link`' },
      );
      break;

    case 'render':
      githubSecrets.push(
        { key: 'RENDER_DEPLOY_HOOK_URL', value: '', comment: 'From Render dashboard → Service Settings → Deploy Hooks' },
      );
      if (hasStaging) {
        githubSecrets.push(
          { key: 'RENDER_DEPLOY_HOOK_URL_STAGING', value: '', comment: 'Staging service deploy hook URL' },
        );
      }
      break;

    case 'aws':
      githubSecrets.push(
        { key: 'AWS_ACCESS_KEY_ID', value: '', comment: 'IAM user with S3 + CloudFront permissions' },
        { key: 'AWS_SECRET_ACCESS_KEY', value: '', comment: 'IAM user secret — never commit this' },
        { key: 'AWS_REGION', value: 'us-east-1', comment: 'e.g. us-east-1, eu-west-1' },
      );
      if (hasProd) {
        githubSecrets.push(
          { key: 'S3_BUCKET_PRODUCTION', value: 'your-prod-bucket-name', comment: 'S3 bucket for production' },
          { key: 'CLOUDFRONT_DISTRIBUTION_ID_PRODUCTION', value: '', comment: 'CloudFront distribution ID for production' },
          { key: 'CLOUDFRONT_DOMAIN_PRODUCTION', value: 'https://d1234abcd.cloudfront.net', comment: 'CloudFront domain for production' },
        );
      }
      if (hasStaging) {
        githubSecrets.push(
          { key: 'S3_BUCKET_STAGING', value: 'your-staging-bucket-name', comment: 'S3 bucket for staging' },
          { key: 'CLOUDFRONT_DISTRIBUTION_ID_STAGING', value: '', comment: 'CloudFront distribution ID for staging' },
          { key: 'CLOUDFRONT_DOMAIN_STAGING', value: 'https://staging.d1234abcd.cloudfront.net', comment: 'CloudFront domain for staging' },
        );
      }
      break;

    case 'digitalocean':
      githubSecrets.push(
        { key: 'DIGITALOCEAN_ACCESS_TOKEN', value: '', comment: 'From DigitalOcean → API → Generate New Token' },
        { key: 'DO_APP_NAME_PRODUCTION', value: 'your-app-name', comment: 'DigitalOcean App Platform app name (production)' },
      );
      if (hasStaging) {
        githubSecrets.push(
          { key: 'DO_APP_NAME_STAGING', value: 'your-app-name-staging', comment: 'DigitalOcean App Platform app name (staging)' },
        );
      }
      break;

    case 'vps':
      githubSecrets.push(
        { key: 'SSH_USERNAME', value: 'deploy', comment: 'SSH user on your VPS' },
        { key: 'SSH_PRIVATE_KEY', value: '', comment: 'Private key — paste the entire contents of your .pem / id_rsa file' },
      );
      if (hasProd) {
        githubSecrets.push(
          { key: 'SSH_HOST_PRODUCTION', value: '1.2.3.4', comment: 'Production server IP or hostname' },
        );
      }
      if (hasStaging) {
        githubSecrets.push(
          { key: 'SSH_HOST_STAGING', value: '1.2.3.5', comment: 'Staging server IP or hostname' },
        );
      }
      break;
  }

  if (githubSecrets.length > 0) {
    sections.push({
      title: `GitHub Actions Secrets (Settings → Secrets and variables → Actions)`,
      vars: githubSecrets,
    });
  }

  // ── Optional / common extras ──────────────────────────────────────────────
  sections.push({
    title: 'Optional — Notifications & monitoring',
    vars: [
      { key: 'SLACK_WEBHOOK_URL', value: '', comment: 'Optional: Slack incoming webhook for deploy notifications' },
      { key: 'SENTRY_DSN', value: '', comment: 'Optional: Sentry error tracking DSN' },
      { key: 'SENTRY_AUTH_TOKEN', value: '', comment: 'Optional: For uploading source maps to Sentry' },
    ],
  });

  // ── Format as .env.example ────────────────────────────────────────────────
  const lines = [
    `# .env.example`,
    `# Generated by CI/CD Pipeline Generator`,
    `# Copy this file to .env and fill in the values`,
    `# NEVER commit .env to version control`,
    ``,
  ];

  for (const section of sections) {
    lines.push(`# ── ${section.title} ${'─'.repeat(Math.max(0, 60 - section.title.length))}`);
    for (const v of section.vars) {
      if (v.comment) {
        lines.push(`# ${v.comment}`);
      }
      lines.push(`${v.key}=${v.value}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

module.exports = { generateEnvExample };

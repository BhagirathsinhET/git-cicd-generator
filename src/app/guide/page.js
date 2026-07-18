'use client';

import { useState } from 'react';
import Link from 'next/link';
import Header from '@/components/Header';

const WEBSITE_STEPS = [
  {
    title: 'Pick your project type',
    desc: 'Choose Next.js, React, Node.js, NestJS, Shopify Theme, Laravel, or WordPress. This decides the language runtime (Node vs PHP) and tooling used in the generated workflow — e.g. Laravel/WordPress get a Composer + PHPUnit setup instead of a plain Node one.',
  },
  {
    title: 'Set your Node.js version',
    desc: 'Type the exact Node version your project needs (e.g. 22, 22.x, or 22.14.0) — it defaults to a sensible version per project type, but you can override it. This is passed straight to actions/setup-node in every generated workflow.',
  },
  {
    title: 'Pick a package manager',
    desc: 'npm, yarn, or pnpm. Skipped automatically for PHP projects (Laravel/WordPress), which only need npm for asset compilation.',
  },
  {
    title: 'Pick a deployment target',
    desc: 'Vercel, Render, AWS (S3 + CloudFront), DigitalOcean App Platform, or a plain VPS over SSH. This determines the exact deploy steps generated and which secrets you’ll be told to add.',
  },
  {
    title: 'Choose deploy environments',
    desc: '"Production only", "Staging + Production", or "Staging only" — controls whether deploy-staging.yml / deploy-production.yml get generated at all.',
  },
  {
    title: 'Name your branches',
    desc: 'Type your real branch names: Production branch (e.g. main), Staging branch if staging is enabled (e.g. staging or qa), and any extra branches that should just run CI checks (e.g. dev). These names are wired directly into the workflow triggers — no forced conventions.',
  },
  {
    title: 'Select CI checks',
    desc: 'Lint, Type check, Tests, Build, Lighthouse CI, Playwright E2E — toggle whichever your project actually has scripts for.',
  },
  {
    title: 'Click "Generate Workflows"',
    desc: 'The form posts your config to /api/generate, which assembles the YAML from templates tailored to your exact selections.',
  },
  {
    title: 'Review the generated files',
    desc: 'Tabs show ci.yml, deploy-staging.yml, deploy-production.yml, .env.example, and DEPLOYMENT_NOTES.md. Copy any file individually, or download everything as one ZIP.',
  },
  {
    title: 'Add the required secrets',
    desc: 'The sidebar’s "Secrets needed" panel lists exactly what your chosen deploy target requires. Add them in GitHub under Settings → Secrets and variables → Actions before your first deploy.',
  },
  {
    title: 'Commit and push',
    desc: 'Drop the files into your repo (.github/workflows/ + root) and push. CI runs on your PR/push branches; deploys fire automatically when you push to the staging/production branches you named.',
  },
];

const EXTENSION_STEPS = [
  {
    title: 'Pick your extension framework',
    desc: 'Vanilla JavaScript, TypeScript, React, or Vue — informs the notes and assumptions in the generated docs.',
  },
  {
    title: 'Set your Node.js version',
    desc: 'Type the exact Node version your project needs (e.g. 22, 22.x, or 22.14.0) — defaults to 24. This is passed straight to actions/setup-node in ci.yml, package-release.yml, and publish-store.yml.',
  },
  {
    title: 'Pick a package manager',
    desc: 'npm, yarn, or pnpm — used for installing dependencies in CI.',
  },
  {
    title: 'Pick a build tool',
    desc: '"None" for a plain-files extension (manifest.json at the repo root), or Webpack / Vite / Parcel if you bundle into a dist/ folder. This decides which directory gets zipped and whether a build step runs.',
  },
  {
    title: 'Name your branches',
    desc: 'Set the Production branch (e.g. main) that triggers packaging + release, and optionally add extra branches that should just run CI (e.g. dev). Chrome extensions don’t use a staging deploy, so there’s no staging branch field here.',
  },
  {
    title: 'Choose browser targets',
    desc: 'Chrome is always included. Optionally add Firefox and/or Edge — this changes what gets zipped per-browser and which store credentials show up in the secrets list.',
  },
  {
    title: 'Choose a publish mode',
    desc: '"Build & zip only" just packages a zip and attaches it to a GitHub Release for manual upload. "Auto-publish" adds a workflow that pushes straight to the Chrome Web Store / Firefox Add-ons / Edge Add-ons APIs when you push a version tag.',
  },
  {
    title: 'Select CI checks',
    desc: 'Lint, Type check, Tests, Build, and Validate manifest.json (checks manifest_version, name, version, and that it’s Manifest V3).',
  },
  {
    title: 'Click "Generate Workflows"',
    desc: 'The form posts your config to /api/extension/generate, which assembles the YAML for your exact stack and store selection.',
  },
  {
    title: 'Review the generated files',
    desc: 'Tabs show ci.yml, package-release.yml, publish-store.yml (only if auto-publish is on), .env.example, and PUBLISHING_NOTES.md. Copy individually or download the ZIP.',
  },
  {
    title: 'Add the required secrets',
    desc: 'Only needed for auto-publish: Chrome Web Store OAuth credentials, Firefox AMO API keys, and/or Edge Partner Center credentials, depending on which stores you selected.',
  },
  {
    title: 'Commit, push, and release',
    desc: 'Merging to your production branch builds, zips, and creates a GitHub Release. If auto-publish is on, pushing a version tag (e.g. v1.2.0) triggers the store publish workflow.',
  },
];

function StepList({ steps }) {
  return (
    <ol className="guide-steps">
      {steps.map((step, i) => (
        <li className="guide-step" key={step.title}>
          <span className="guide-step-num">{i + 1}</span>
          <div className="guide-step-body">
            <div className="guide-step-title">{step.title}</div>
            <p className="guide-step-desc">{step.desc}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export default function GuidePage() {
  const [activeFlow, setActiveFlow] = useState('website');

  return (
    <>
      <Header />

      <main className="guide-main">
        <section className="guide-hero">
          <h1 className="form-title">
            How the <span>CI/CD Pipeline Generator</span> works
          </h1>
          <p className="form-subtitle">
            Answer a few questions about your project, generate production-ready GitHub Actions
            workflows, and drop them straight into your repo. Nothing runs on our servers —
            we only assemble the YAML; your own GitHub Actions run the actual pipeline once you
            commit the files.
          </p>
          <div className="guide-pill-row">
            <span className="guide-pill">1. Configure</span>
            <span className="guide-pill-arrow">→</span>
            <span className="guide-pill">2. Generate</span>
            <span className="guide-pill-arrow">→</span>
            <span className="guide-pill">3. Add secrets</span>
            <span className="guide-pill-arrow">→</span>
            <span className="guide-pill">4. Commit & push</span>
          </div>
        </section>

        <section className="guide-cards">
          <Link href="/website" className="guide-card">
            <div className="guide-card-icon">🌐</div>
            <div className="guide-card-title">Website CI/CD</div>
            <p className="guide-card-desc">
              For Next.js, React, Node.js, NestJS, Shopify Themes, Laravel, or WordPress —
              deploying to Vercel, Render, AWS, DigitalOcean, or a VPS.
            </p>
            <span className="guide-card-link">Open generator →</span>
          </Link>
          <Link href="/extension" className="guide-card">
            <div className="guide-card-icon">🧩</div>
            <div className="guide-card-title">Chrome Extension CI/CD</div>
            <p className="guide-card-desc">
              For browser extensions — build, package, and optionally auto-publish to Chrome
              Web Store, Firefox Add-ons, and Edge Add-ons.
            </p>
            <span className="guide-card-link">Open generator →</span>
          </Link>
        </section>

        <section>
          <h2 className="guide-section-title">Step-by-step</h2>

          <div className="guide-flow-tabs">
            <button
              type="button"
              className={`guide-flow-tab ${activeFlow === 'website' ? 'active' : ''}`}
              onClick={() => setActiveFlow('website')}
            >
              🌐 Website CI/CD flow
            </button>
            <button
              type="button"
              className={`guide-flow-tab ${activeFlow === 'extension' ? 'active' : ''}`}
              onClick={() => setActiveFlow('extension')}
            >
              🧩 Chrome Extension CI/CD flow
            </button>
          </div>

          <StepList steps={activeFlow === 'website' ? WEBSITE_STEPS : EXTENSION_STEPS} />
        </section>

        <section className="guide-callout">
          <h3>What actually happens behind the scenes</h3>
          <p>
            Every field you set in the form is sent to a generator API route
            (<code>/api/generate</code> for websites, <code>/api/extension/generate</code> for
            extensions). That route picks the matching templates — CI checks, deploy steps,
            store-publish steps — and stitches them into complete GitHub Actions YAML files
            using your exact project type, branch names, and target. Nothing is deployed or
            published from this app itself; the generated workflows only take effect once you
            commit them to your own GitHub repository and GitHub Actions picks them up.
          </p>
        </section>

        <section className="guide-cta">
          <Link href="/website" className="btn btn-primary">
            🌐 Start with Website CI/CD
          </Link>
          <Link href="/extension" className="btn btn-secondary">
            🧩 Start with Chrome Extension CI/CD
          </Link>
        </section>
      </main>
    </>
  );
}

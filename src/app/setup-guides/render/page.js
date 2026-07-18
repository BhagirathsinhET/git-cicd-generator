'use client';

import Header from '@/components/Header';
import Link from 'next/link';

const RENDER_STEPS = [
  {
    title: '1. Create a Render Web Service',
    desc: 'Log in to your Render dashboard and click "New" -> "Web Service". Connect your GitHub repository.',
    details: `Make sure you choose the exact same Production Branch you specified in the generator (e.g. main).`,
  },
  {
    title: '2. Turn OFF Auto-Deploy',
    desc: 'Because GitHub Actions is handling the deployments, you must tell Render not to deploy automatically on push.',
    details: `In the Render Web Service settings, scroll down to "Auto-Deploy" and switch it to "No".`,
  },
  {
    title: '3. Find your Deploy Hook URL',
    desc: 'Render uses a unique URL to trigger deployments from GitHub Actions.',
    details: `In your Web Service settings, scroll down to the "Deploy Hook" section. Click "Copy" to copy the unique URL.`,
  },
  {
    title: '4. Add the URL to GitHub Secrets',
    desc: 'Add this Deploy Hook URL to your GitHub Repository Secrets.',
    details: `1. Go to your repository on GitHub.com.\\n2. Click on Settings -> Secrets and variables -> Actions.\\n3. Click "New repository secret".\\n4. Add RENDER_DEPLOY_HOOK_URL as the name, and paste the URL you copied from Render as the value.`,
  },
];

export default function RenderGuidePage() {
  return (
    <>
      <Header />

      <main className="guide-main">
        <section className="guide-hero">
          <h1 className="form-title">
            <span>Render + GitHub Actions</span> Setup Guide
          </h1>
          <p className="form-subtitle">
            If you generated a workflow for Render, you need to securely connect GitHub to your Render Web Service via a Deploy Hook.
          </p>
        </section>

        <section>
          <h2 className="guide-section-title">Step-by-step Setup</h2>
          
          <ol className="guide-steps">
            {RENDER_STEPS.map((step, i) => (
              <li key={i} className="guide-step">
                <div className="guide-step-number">{i + 1}</div>
                <div className="guide-step-content">
                  <h3>{step.title}</h3>
                  <p>{step.desc}</p>
                  
                  {step.code && (
                    <pre className="code-preview" style={{ marginTop: '1rem', padding: '1rem', borderRadius: 'var(--radius)' }}>
                      <code>{step.code}</code>
                    </pre>
                  )}
                  
                  {step.details && (
                    <div style={{ marginTop: '1rem', padding: '1rem', background: 'var(--surface2)', borderRadius: 'var(--radius)', color: 'var(--text-muted)' }}>
                      {step.details.split('\\n').map((line, j) => (
                        <div key={j}>{line}</div>
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section className="guide-callout" style={{ marginTop: '3rem' }}>
          <h3>💡 What if I have Staging AND Production?</h3>
          <p>
            If you selected "Staging + Production" in the generator, you need to create <strong>two</strong> separate Web Services in Render (one connected to your <code>main</code> branch, and one connected to your <code>staging</code> branch). 
            You must add the second deploy hook URL as a GitHub Secret named <code>RENDER_DEPLOY_HOOK_URL_STAGING</code>.
          </p>
        </section>

        <section className="guide-cta">
          <Link href="/setup-guides" className="btn btn-primary">
            📚 Back to Guides
          </Link>
        </section>
      </main>
    </>
  );
}

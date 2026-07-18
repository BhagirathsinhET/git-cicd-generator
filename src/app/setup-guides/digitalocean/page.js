'use client';

import Header from '@/components/Header';
import Link from 'next/link';

const DO_STEPS = [
  {
    title: '1. Create a DigitalOcean App',
    desc: 'Log in to DigitalOcean and create an App in the App Platform.',
    details: `Make sure your app is connected to the exact GitHub branch you specified in the generator (e.g. main).`,
  },
  {
    title: '2. Generate an API Token',
    desc: 'GitHub Actions needs an API token to trigger the deployment.',
    details: `1. In the DigitalOcean dashboard, go to "API" on the left sidebar.\\n2. Click "Generate New Token".\\n3. Give it a name (e.g. "GitHub Actions") and ensure it has Write permissions.\\n4. Copy the generated token immediately.`,
  },
  {
    title: '3. Find your App Name',
    desc: 'The workflow needs the exact name of your App Platform application.',
    details: `1. Go to your Apps dashboard.\\n2. Copy the exact name of the app as it appears in the UI.`,
  },
  {
    title: '4. Add to GitHub Secrets',
    desc: 'Add the Token and App Name to your GitHub Repository Secrets.',
    details: `1. Go to your repository on GitHub.com.\\n2. Settings -> Secrets and variables -> Actions -> "New repository secret".\\n3. Add DIGITALOCEAN_ACCESS_TOKEN.\\n4. Add DO_APP_NAME_PRODUCTION.`,
  },
];

export default function DigitalOceanGuidePage() {
  return (
    <>
      <Header />

      <main className="guide-main">
        <section className="guide-hero">
          <h1 className="form-title">
            <span>DigitalOcean</span> Setup Guide
          </h1>
          <p className="form-subtitle">
            If you generated a workflow for DigitalOcean App Platform, you need to securely provide GitHub Actions with an API Token.
          </p>
        </section>

        <section>
          <h2 className="guide-section-title">Step-by-step Setup</h2>
          
          <ol className="guide-steps">
            {DO_STEPS.map((step, i) => (
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
            If you selected "Staging + Production" in the generator, you need to create <strong>two</strong> separate Apps in the DO App Platform. 
            You must add the staging app name to GitHub as well: <code>DO_APP_NAME_STAGING</code>.
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

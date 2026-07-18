'use client';

import Header from '@/components/Header';
import Link from 'next/link';

const VERCEL_STEPS = [
  {
    title: '1. Link your project via Vercel CLI',
    desc: 'The foolproof way to get your Project ID and Org ID is directly from your terminal. Open a new terminal in your VS Code (make sure you are in your project folder) and run:',
    code: 'npx vercel link',
    details: `It will ask you to log in to Vercel (if you aren't already). Answer the prompts:\\n• Set up and develop? -> Type y and press Enter.\\n• Which scope? -> Select your account.\\n• Link to existing project? -> Type y and press Enter.\\n• What's the name of your existing project? -> Type the name of your project on Vercel.`,
  },
  {
    title: '2. Get your Vercel Project ID and Org ID',
    desc: 'Once linked, Vercel creates a hidden folder named .vercel in your project. Open the file .vercel/project.json. Inside, you will see exactly what you need:',
    code: '{\n  "projectId": "prj_xxxxxxx",\n  "orgId": "team_xxxxxxx"\n}',
    details: `The projectId is your VERCEL_PROJECT_ID, and the orgId is your VERCEL_ORG_ID. (Don't worry about this folder being uploaded to GitHub; most Next.js/React templates already have it in their .gitignore!)`,
  },
  {
    title: '3. Disable Vercel Auto-Deployments',
    desc: 'You want GitHub Actions to handle deployments securely, so you need to tell Vercel to stop deploying automatically.',
    details: `1. Go to your project on Vercel.com.\\n2. Go to Settings -> Git.\\n3. Scroll down to "Ignored Build Step".\\n4. Select "Don't build anything" from the dropdown list and click Save.`,
  },
  {
    title: '4. Add your values to GitHub Secrets',
    desc: 'IMPORTANT: Never put these IDs or your Vercel Token in your .env or .env.example files! They should go directly into GitHub.',
    details: `1. Go to your repository on GitHub.com.\\n2. Click on Settings -> Secrets and variables -> Actions.\\n3. Click "New repository secret".\\n4. Add VERCEL_TOKEN (your personal token from Vercel account settings).\\n5. Add VERCEL_ORG_ID (from step 2).\\n6. Add VERCEL_PROJECT_ID (from step 2).`,
  },
];

export default function VercelGuidePage() {
  return (
    <>
      <Header />

      <main className="guide-main">
        <section className="guide-hero">
          <h1 className="form-title">
            <span>Vercel + GitHub Actions</span> Setup Guide
          </h1>
          <p className="form-subtitle">
            If you generated a workflow for Vercel, you need to securely connect GitHub to your Vercel project.
            Follow these exact steps to avoid common deployment errors and ensure your CI/CD pipeline runs flawlessly.
          </p>
        </section>

        <section className="guide-callout" style={{ borderColor: 'var(--red)', background: 'rgba(220, 38, 38, 0.05)' }}>
          <h3 style={{ color: 'var(--red)' }}>⚠️ Security Warning: Protect Your Token</h3>
          <p>
            Do <strong>NOT</strong> add your Vercel Token, Project ID, or Org ID to your <code>.env.example</code> file. 
            The <code>.env.example</code> file is public on GitHub, meaning anyone on the internet could gain full access to your Vercel account. 
            Always put these values directly into GitHub Secrets!
          </p>
        </section>

        <section>
          <h2 className="guide-section-title">Step-by-step Setup</h2>
          
          <ol className="guide-steps">
            {VERCEL_STEPS.map((step, i) => (
              <li className="guide-step" key={step.title}>
                <div className="guide-step-body" style={{ width: '100%' }}>
                  <div className="guide-step-title">{step.title}</div>
                  <p className="guide-step-desc">{step.desc}</p>
                  
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
          <h3>💡 Why native npx vercel?</h3>
          <p>
            In the past, many guides recommended using <code>amondnet/vercel-action</code>. However, this plugin is outdated and attempts to use version 25 of the Vercel CLI, which fails because Vercel now forces you to use version 47.2.2 or higher. 
            Our generated workflows bypass this issue entirely by natively calling the official Vercel CLI (<code>npx vercel</code>) directly, guaranteeing you always use the latest, most secure version!
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

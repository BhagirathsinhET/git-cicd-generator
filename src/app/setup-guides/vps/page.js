'use client';

import Header from '@/components/Header';
import Link from 'next/link';

const VPS_STEPS = [
  {
    title: '1. Ensure your server is ready',
    desc: 'The GitHub Action logs into your VPS via SSH to run build commands. Your server needs Node.js/npm and PM2 installed.',
    details: `SSH into your server and run:\\ncurl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -\\nsudo apt-get install -y nodejs\\nsudo npm install -g pm2`,
  },
  {
    title: '2. Prepare the directory',
    desc: 'The workflow expects your project to be cloned in /var/www/production (or /var/www/staging).',
    details: `1. mkdir -p /var/www/production\\n2. cd /var/www/production\\n3. git clone https://github.com/your-username/your-repo.git .`,
  },
  {
    title: '3. Generate an SSH Key',
    desc: 'You need an SSH key pair to allow GitHub Actions to securely connect to your VPS.',
    details: `On your local machine (or the server), run:\\nssh-keygen -t rsa -b 4096 -C "github-actions" -f ./deploy_key\\n(Do not add a passphrase)`,
  },
  {
    title: '4. Authorize the Key on your Server',
    desc: 'Add the public key to your authorized_keys file on the VPS.',
    details: `1. Copy the contents of the deploy_key.pub file.\\n2. SSH into your server.\\n3. nano ~/.ssh/authorized_keys\\n4. Paste the public key on a new line and save.`,
  },
  {
    title: '5. Add Secrets to GitHub',
    desc: 'Add the private key and server details to your GitHub Repository Secrets.',
    details: `1. Go to your repository on GitHub.com.\\n2. Settings -> Secrets and variables -> Actions -> "New repository secret".\\n3. Add SSH_PRIVATE_KEY (Paste the entire contents of the deploy_key private file).\\n4. Add SSH_USERNAME (e.g. root or ubuntu).\\n5. Add SSH_HOST_PRODUCTION (Your server's public IP address).`,
  },
];

export default function VpsGuidePage() {
  return (
    <>
      <Header />

      <main className="guide-main">
        <section className="guide-hero">
          <h1 className="form-title">
            <span>VPS (SSH Deploy)</span> Setup Guide
          </h1>
          <p className="form-subtitle">
            If you generated a workflow for a custom VPS, GitHub Actions will use SSH to securely log in to your server, pull the latest code, and restart your app using PM2.
          </p>
        </section>

        <section>
          <h2 className="guide-section-title">Step-by-step Setup</h2>
          
          <ol className="guide-steps">
            {VPS_STEPS.map((step, i) => (
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
            If you selected "Staging + Production" in the generator, the workflow expects your staging files to be in <code>/var/www/staging</code>. 
            You must add the staging server IP to GitHub as well: <code>SSH_HOST_STAGING</code> (this can be the same IP as production if you are hosting both on the same server).
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

'use client';

import Header from '@/components/Header';
import Link from 'next/link';

const GUIDES = [
  {
    id: 'vercel',
    name: 'Vercel',
    desc: 'Connect GitHub securely to Vercel and disable auto-deployments.',
    icon: '🔺',
    color: 'var(--text-main)',
  },
  {
    id: 'render',
    name: 'Render',
    desc: 'Configure Render Web Services and Deploy Hooks for CI/CD.',
    icon: '☁️',
    color: '#46E3B7',
  },
  {
    id: 'aws',
    name: 'AWS S3 + CloudFront',
    desc: 'Create an IAM User and configure S3/CloudFront for deployment.',
    icon: '📦',
    color: '#FF9900',
  },
  {
    id: 'digitalocean',
    name: 'DigitalOcean App Platform',
    desc: 'Generate an API token and locate your App Platform name.',
    icon: '💧',
    color: '#0069ff',
  },
  {
    id: 'vps',
    name: 'VPS via SSH',
    desc: 'Set up SSH keys and prepare your VPS for automated deployments.',
    icon: '🖥️',
    color: 'var(--text-main)',
  },
];

export default function SetupGuidesHub() {
  return (
    <>
      <Header />

      <main className="guide-main">
        <section className="guide-hero">
          <h1 className="form-title">
            <span>📚 Deployment Setup</span> Guides
          </h1>
          <p className="form-subtitle">
            Select your deployment target below to see step-by-step instructions on how to configure your provider and find the exact secrets needed for your generated GitHub Actions workflow.
          </p>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '2rem' }}>
          {GUIDES.map((guide) => (
            <Link 
              key={guide.id} 
              href={`/setup-guides/${guide.id}`}
              style={{
                display: 'block',
                padding: '1.5rem',
                background: 'var(--surface2)',
                borderRadius: 'var(--radius)',
                border: '1px solid var(--border)',
                textDecoration: 'none',
                color: 'var(--text-main)',
                transition: 'border-color 0.2s ease, transform 0.2s ease',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = guide.color;
                e.currentTarget.style.transform = 'translateY(-2px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--border)';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              <div style={{ fontSize: '2rem', marginBottom: '1rem' }}>{guide.icon}</div>
              <h3 style={{ margin: '0 0 0.5rem 0', color: guide.color }}>{guide.name}</h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: 1.5 }}>
                {guide.desc}
              </p>
            </Link>
          ))}
        </section>

        <section className="guide-cta" style={{ marginTop: '4rem' }}>
          <Link href="/website" className="btn btn-primary">
            🌐 Back to Generator
          </Link>
        </section>
      </main>
    </>
  );
}

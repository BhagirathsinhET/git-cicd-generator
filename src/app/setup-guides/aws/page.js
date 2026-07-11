'use client';

import Header from '@/components/Header';
import Link from 'next/link';

const AWS_STEPS = [
  {
    title: '1. Create an IAM User',
    desc: 'You need an AWS IAM User specifically for GitHub Actions with programmatic access.',
    details: `1. Go to AWS Console -> IAM -> Users.\\n2. Click "Add users" and name it "github-actions-deployer".\\n3. Do not give it AWS Management Console access.\\n4. Attach policies: AmazonS3FullAccess and CloudFrontFullAccess (or create a custom restricted policy).`,
  },
  {
    title: '2. Generate Access Keys',
    desc: 'GitHub Actions needs the Access Key ID and Secret Access Key to authenticate.',
    details: `1. Click on your new IAM User.\\n2. Go to the "Security credentials" tab.\\n3. Under "Access keys", click "Create access key".\\n4. Select "Command Line Interface (CLI)".\\n5. Copy the Access Key ID and Secret Access Key (you will only see the secret once!).`,
  },
  {
    title: '3. Find your S3 Bucket & CloudFront ID',
    desc: 'The workflow needs to know where to upload your files and which cache to invalidate.',
    details: `1. Go to S3 and find the exact name of your bucket.\\n2. Go to CloudFront and find the exact Distribution ID (e.g. E1A2B3C4D5E6F7).`,
  },
  {
    title: '4. Add everything to GitHub Secrets',
    desc: 'Add all these values to your GitHub Repository Secrets.',
    details: `1. Go to your repository on GitHub.com.\\n2. Settings -> Secrets and variables -> Actions -> "New repository secret".\\n3. Add AWS_ACCESS_KEY_ID.\\n4. Add AWS_SECRET_ACCESS_KEY.\\n5. Add AWS_REGION (e.g. us-east-1).\\n6. Add S3_BUCKET_PRODUCTION and CLOUDFRONT_DISTRIBUTION_ID_PRODUCTION.`,
  },
];

export default function AwsGuidePage() {
  return (
    <>
      <Header />

      <main className="guide-main">
        <section className="guide-hero">
          <h1 className="form-title">
            <span>AWS S3 + CloudFront</span> Setup Guide
          </h1>
          <p className="form-subtitle">
            If you generated a workflow for AWS, you need to securely provide GitHub Actions with IAM credentials to upload to S3 and invalidate CloudFront.
          </p>
        </section>

        <section>
          <h2 className="guide-section-title">Step-by-step Setup</h2>
          
          <ol className="guide-steps">
            {AWS_STEPS.map((step, i) => (
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
            If you selected "Staging + Production" in the generator, you need to create <strong>two</strong> separate S3 Buckets and CloudFront Distributions. 
            You must add the staging secrets to GitHub as well: <code>S3_BUCKET_STAGING</code> and <code>CLOUDFRONT_DISTRIBUTION_ID_STAGING</code>.
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

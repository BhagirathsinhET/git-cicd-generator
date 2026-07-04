'use client';

import { useState, useEffect } from 'react';
import hljs from 'highlight.js';
import JSZip from 'jszip';

/* ── Secrets map per deploy target ─────────────────────────────────────── */
const SECRETS_MAP = {
  vercel: ['VERCEL_TOKEN', 'VERCEL_ORG_ID', 'VERCEL_PROJECT_ID'],
  render: ['RENDER_DEPLOY_HOOK_URL'],
  aws: ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION', 'S3_BUCKET', 'CLOUDFRONT_DISTRIBUTION_ID'],
  digitalocean: ['DIGITALOCEAN_ACCESS_TOKEN', 'DO_APP_NAME'],
  vps: ['SSH_HOST', 'SSH_USERNAME', 'SSH_PRIVATE_KEY'],
};

/* ── File metadata ──────────────────────────────────────────────────────── */
const FILE_META = {
  '.github/workflows/ci.yml':              { ext: 'yaml', label: 'ci.yml',                lang: 'yaml', icon: '⚙️' },
  '.github/workflows/deploy-staging.yml':  { ext: 'yaml', label: 'deploy-staging.yml',    lang: 'yaml', icon: '🟡' },
  '.github/workflows/deploy-production.yml':{ ext: 'yaml', label: 'deploy-production.yml', lang: 'yaml', icon: '🟢' },
  '.env.example':                          { ext: 'env',  label: '.env.example',           lang: 'bash', icon: '🔑' },
  'DEPLOYMENT_NOTES.md':                   { ext: 'md',   label: 'DEPLOYMENT_NOTES.md',    lang: 'markdown', icon: '📋' },
};

function isPhpProject(type) {
  return type === 'laravel' || type === 'wordpress';
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default function Home() {
  // Form State
  const [projectType, setProjectType] = useState('nextjs');
  const [packageManager, setPackageManager] = useState('npm');
  const [deployTarget, setDeployTarget] = useState('vercel');
  const [branchFlow, setBranchFlow] = useState('feature-main');
  const [deployEnvironments, setDeployEnvironments] = useState('production');
  const [checks, setChecks] = useState(['lint', 'typecheck', 'test', 'build']);

  // UI / Generator State
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState({});
  const [activeTab, setActiveTab] = useState('');
  const [toast, setToast] = useState(null);
  const [copiedFile, setCopiedFile] = useState('');
  const [zipping, setZipping] = useState(false);

  // Toast auto-dismissal
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleProjectTypeChange = (val) => {
    setProjectType(val);
  };

  const handleCheckboxChange = (e) => {
    const { value, checked } = e.target;
    if (checked) {
      setChecks((prev) => [...prev, value]);
    } else {
      setChecks((prev) => prev.filter((c) => c !== value));
    }
  };

  // Compute deploy environments as array expected by generator
  const getDeployEnvironmentsArray = () => {
    if (deployEnvironments === 'both') {
      return ['staging', 'production', 'both'];
    }
    return [deployEnvironments];
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setIsGenerating(true);

    const config = {
      projectType,
      packageManager: isPhpProject(projectType) ? 'npm' : packageManager,
      deployTarget,
      branchFlow,
      checks,
      deployEnvironments: getDeployEnvironmentsArray(),
    };

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Generation failed');
      }

      setGeneratedFiles(data.files);
      setIsGenerated(true);

      // Default active tab to CI yml or first generated file
      const filePaths = Object.keys(data.files);
      if (filePaths.includes('.github/workflows/ci.yml')) {
        setActiveTab('.github/workflows/ci.yml');
      } else if (filePaths.length > 0) {
        setActiveTab(filePaths[0]);
      }

      showToast('✅ Workflows generated successfully!', 'success');
    } catch (err) {
      showToast(`❌ ${err.message}`, 'error');
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setProjectType('nextjs');
    setPackageManager('npm');
    setDeployTarget('vercel');
    setBranchFlow('feature-main');
    setDeployEnvironments('production');
    setChecks(['lint', 'typecheck', 'test', 'build']);
    setIsGenerated(false);
    setGeneratedFiles({});
    setActiveTab('');
  };

  const handleBackToConfig = () => {
    setIsGenerated(false);
  };

  const handleCopy = async (filePath) => {
    const content = generatedFiles[filePath];
    if (!content) return;

    try {
      await navigator.clipboard.writeText(content);
      setCopiedFile(filePath);
      setTimeout(() => setCopiedFile(''), 2000);
    } catch (_) {
      showToast('Could not access clipboard', 'error');
    }
  };

  const handleDownloadAll = async () => {
    const fileEntries = Object.entries(generatedFiles);
    if (fileEntries.length === 0) {
      showToast('Generate files first', 'error');
      return;
    }

    setZipping(true);
    try {
      const zip = new JSZip();
      for (const [filePath, content] of fileEntries) {
        zip.file(filePath, content);
      }

      const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'github-workflows.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      showToast('✅ ZIP downloaded!', 'success');
    } catch (err) {
      showToast(`❌ Download failed: ${err.message}`, 'error');
    } finally {
      setZipping(false);
    }
  };

  // Get status class for the sidebar file items
  const getFileClass = (fileKey) => {
    const hasStaging = deployEnvironments === 'both' || deployEnvironments === 'staging';
    const hasProduction = deployEnvironments === 'both' || deployEnvironments === 'production';

    let planned = false;
    if (fileKey === 'ci' || fileKey === 'env' || fileKey === 'notes') {
      planned = true;
    } else if (fileKey === 'staging') {
      planned = hasStaging;
    } else if (fileKey === 'production') {
      planned = hasProduction;
    }

    if (isGenerated) {
      if (fileKey === 'ci') return 'file-item generated';
      if (fileKey === 'env') return 'file-item generated';
      if (fileKey === 'notes') return 'file-item generated';
      if (fileKey === 'staging') return hasStaging ? 'file-item generated' : 'file-item skipped';
      if (fileKey === 'production') return hasProduction ? 'file-item generated' : 'file-item skipped';
    }

    return planned ? 'file-item will-generate' : 'file-item skipped';
  };

  // Render Highlighted Code
  const getHighlightedCode = (filePath) => {
    const content = generatedFiles[filePath] || '';
    const meta = FILE_META[filePath] || { lang: 'plaintext' };

    try {
      if (hljs.getLanguage(meta.lang)) {
        return hljs.highlight(content, { language: meta.lang }).value;
      }
    } catch (_) {}
    return escapeHtml(content);
  };

  const currentSecrets = SECRETS_MAP[deployTarget] || [];
  const isPhp = isPhpProject(projectType);

  return (
    <>
      <header>
        <a className="logo" href="#">
          <div className="logo-icon">⚡</div>
          CI/CD Pipeline Generator
        </a>
        <span className="logo-badge">GitHub Actions</span>
      </header>

      <div className="app-body">
        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside className="sidebar">
          <div className="sidebar-header">Files to generate</div>
          <ul className="file-list" id="fileList">
            <li className={getFileClass('ci')} data-file="ci">
              <span className="file-icon">📄</span> .github/workflows/ci.yml
            </li>
            <li className={getFileClass('staging')} data-file="staging">
              <span className="file-icon">📄</span> deploy-staging.yml
            </li>
            <li className={getFileClass('production')} data-file="production">
              <span className="file-icon">📄</span> deploy-production.yml
            </li>
            <li className={getFileClass('env')} data-file="env">
              <span className="file-icon">📄</span> .env.example
            </li>
            <li className={getFileClass('notes')} data-file="notes">
              <span className="file-icon">📄</span> DEPLOYMENT_NOTES.md
            </li>
          </ul>

          <div className="sidebar-secrets" id="secretsPanel">
            <h3>Secrets needed</h3>
            <div id="secretChips">
              {currentSecrets.length === 0 ? (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
                  No secrets needed
                </span>
              ) : (
                currentSecrets.map((s) => (
                  <span key={s} className="secret-chip">
                    {s}
                  </span>
                ))
              )}
            </div>
          </div>
        </aside>

        {/* ── Main ────────────────────────────────────────────────────────── */}
        <main className="main">
          {/* Form Panel */}
          {!isGenerated && (
            <div className="form-panel" id="formPanel">
              <div>
                <h1 className="form-title">
                  Generate your <span>GitHub Actions</span> pipelines
                </h1>
                <p className="form-subtitle">
                  Configure your project below and get production-quality CI/CD workflows in seconds.
                </p>
              </div>

              <form id="configForm" onSubmit={handleGenerate}>
                <div className="form-grid">
                  {/* Project type */}
                  <div className="field">
                    <label htmlFor="projectType">🗂 Project type</label>
                    <select
                      id="projectType"
                      name="projectType"
                      value={projectType}
                      onChange={(e) => handleProjectTypeChange(e.target.value)}
                    >
                      <option value="nextjs">Next.js</option>
                      <option value="react">React</option>
                      <option value="nodejs">Node.js</option>
                      <option value="nestjs">NestJS</option>
                      <option value="shopify-theme">Shopify Theme</option>
                      <option value="laravel">Laravel (PHP)</option>
                      <option value="wordpress">WordPress (PHP)</option>
                    </select>
                  </div>

                  {/* Package manager */}
                  {!isPhp && (
                    <div className="field" id="pmField">
                      <label htmlFor="packageManager">📦 Package manager</label>
                      <select
                        id="packageManager"
                        name="packageManager"
                        value={packageManager}
                        onChange={(e) => setPackageManager(e.target.value)}
                      >
                        <option value="npm">npm</option>
                        <option value="yarn">yarn</option>
                        <option value="pnpm">pnpm</option>
                      </select>
                    </div>
                  )}

                  {/* Deploy target */}
                  <div className="field">
                    <label htmlFor="deployTarget">🚀 Deployment target</label>
                    <select
                      id="deployTarget"
                      name="deployTarget"
                      value={deployTarget}
                      onChange={(e) => setDeployTarget(e.target.value)}
                    >
                      <option value="vercel">Vercel</option>
                      <option value="render">Render</option>
                      <option value="aws">AWS (S3 + CloudFront)</option>
                      <option value="digitalocean">DigitalOcean App Platform</option>
                      <option value="vps">VPS (SSH deploy)</option>
                    </select>
                  </div>

                  {/* Branch flow */}
                  <div className="field">
                    <label htmlFor="branchFlow">🌿 Branch flow</label>
                    <select
                      id="branchFlow"
                      name="branchFlow"
                      value={branchFlow}
                      onChange={(e) => setBranchFlow(e.target.value)}
                    >
                      <option value="feature-main">feature → main</option>
                      <option value="dev-staging-main">dev → staging → main</option>
                    </select>
                  </div>

                  {/* Deploy environments */}
                  <div className="field">
                    <label htmlFor="deployEnvironments">🌍 Deploy environments</label>
                    <select
                      id="deployEnvironments"
                      name="deployEnvironments"
                      value={deployEnvironments}
                      onChange={(e) => setDeployEnvironments(e.target.value)}
                    >
                      <option value="production">Production only</option>
                      <option value="both">Staging + Production</option>
                      <option value="staging">Staging only</option>
                    </select>
                  </div>

                  {/* Checks */}
                  <div className="field full-width">
                    <label>
                      ✅ Checks to include{' '}
                      <span className="label-hint">(select all that apply)</span>
                    </label>
                    <div className="checkbox-grid" id="checksGrid">
                      {[
                        { id: 'check-lint', value: 'lint', label: '🔍 Lint' },
                        { id: 'check-typecheck', value: 'typecheck', label: '🔷 Type check' },
                        { id: 'check-test', value: 'test', label: '🧪 Tests' },
                        { id: 'check-build', value: 'build', label: '🏗 Build' },
                        { id: 'check-lighthouse', value: 'lighthouse', label: '🔦 Lighthouse CI' },
                        { id: 'check-playwright', value: 'playwright', label: '🎭 Playwright E2E' },
                      ].map((c) => (
                        <div className="checkbox-item" key={c.id}>
                          <input
                            type="checkbox"
                            id={c.id}
                            name="checks"
                            value={c.value}
                            checked={checks.includes(c.value)}
                            onChange={handleCheckboxChange}
                          />
                          <label htmlFor={c.id}>{c.label}</label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="btn-row" style={{ marginTop: '0.5rem' }}>
                  <button
                    type="submit"
                    className={`btn btn-primary ${isGenerating ? 'loading' : ''}`}
                    id="generateBtn"
                    disabled={isGenerating}
                  >
                    <span className="spinner"></span>
                    <span className="btn-label">⚡ Generate Workflows</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    id="resetBtn"
                    onClick={handleReset}
                  >
                    ↺ Reset
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Output Panel */}
          {isGenerated && (
            <div className="output-panel visible" id="outputPanel">
              <div className="output-header">
                <span className="output-title">Generated files</span>
                <span className="status-badge ready" id="statusBadge">
                  <span>●</span> Ready
                </span>
                <div className="output-actions">
                  <button
                    className="btn btn-secondary"
                    id="backBtn"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
                    onClick={handleBackToConfig}
                  >
                    ← Edit config
                  </button>
                  <button
                    className="btn btn-green"
                    id="downloadAllBtn"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
                    onClick={handleDownloadAll}
                    disabled={zipping}
                  >
                    {zipping ? '⏳ Zipping…' : '⬇ Download all as ZIP'}
                  </button>
                </div>
              </div>

              {/* Tabs */}
              <div className="tabs" id="tabs">
                {Object.keys(generatedFiles).map((filePath) => {
                  const meta = FILE_META[filePath] || {
                    ext: 'txt',
                    label: filePath.split('/').pop(),
                    icon: '📄',
                  };
                  return (
                    <button
                      key={filePath}
                      className={`tab ${activeTab === filePath ? 'active' : ''}`}
                      onClick={() => setActiveTab(filePath)}
                    >
                      <span>{meta.icon}</span>
                      <span>{meta.label}</span>
                      <span className={`tab-ext ${meta.ext}`}>{meta.ext}</span>
                    </button>
                  );
                })}
              </div>

              {/* Code Panes */}
              <div
                id="codePanes"
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                  overflow: 'hidden',
                }}
              >
                {Object.keys(generatedFiles).map((filePath) => {
                  const meta = FILE_META[filePath] || { lang: 'plaintext' };
                  return (
                    <div
                      key={filePath}
                      className={`code-pane ${activeTab === filePath ? 'active' : ''}`}
                      id={filePath.replace(/[^a-z0-9]/gi, '_')}
                    >
                      <div className="code-toolbar">
                        <span className="code-filename">{filePath}</span>
                        <button
                          className={`btn-copy ${copiedFile === filePath ? 'copied' : ''}`}
                          onClick={() => handleCopy(filePath)}
                        >
                          {copiedFile === filePath ? '✅ Copied!' : '📋 Copy'}
                        </button>
                      </div>
                      <div className="code-scroll">
                        <pre>
                          <code
                            className={`language-${meta.lang}`}
                            dangerouslySetInnerHTML={{ __html: getHighlightedCode(filePath) }}
                          />
                        </pre>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type} show`} id="toast">
          {toast.message}
        </div>
      )}
    </>
  );
}

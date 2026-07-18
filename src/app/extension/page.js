'use client';

import { useState, useEffect } from 'react';
import hljs from 'highlight.js';
import JSZip from 'jszip';
import Header from '@/components/Header';
import BranchFlowFields from '@/components/BranchFlowFields';

/* ── Secrets per browser target (only relevant when auto-publishing) ────── */
const BROWSER_SECRETS = {
  chrome: ['CHROME_EXTENSION_ID', 'CHROME_CLIENT_ID', 'CHROME_CLIENT_SECRET', 'CHROME_REFRESH_TOKEN'],
  firefox: ['FIREFOX_JWT_ISSUER', 'FIREFOX_JWT_SECRET'],
  edge: ['EDGE_PRODUCT_ID', 'EDGE_CLIENT_ID', 'EDGE_CLIENT_SECRET', 'EDGE_ACCESS_TOKEN_URL'],
};

/* ── File metadata ──────────────────────────────────────────────────────── */
const FILE_META = {
  '.github/workflows/ci.yml':                { ext: 'yaml', label: 'ci.yml',                lang: 'yaml', icon: '⚙️' },
  '.github/workflows/package-release.yml':   { ext: 'yaml', label: 'package-release.yml',   lang: 'yaml', icon: '📦' },
  '.github/workflows/publish-store.yml':     { ext: 'yaml', label: 'publish-store.yml',     lang: 'yaml', icon: '🚀' },
  '.env.example':                            { ext: 'env',  label: '.env.example',          lang: 'bash', icon: '🔑' },
  'PUBLISHING_NOTES.md':                     { ext: 'md',   label: 'PUBLISHING_NOTES.md',    lang: 'markdown', icon: '📋' },
};

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

export default function ExtensionPage() {
  // Form State
  const [extensionFramework, setExtensionFramework] = useState('vanilla');
  const [nodeVersion, setNodeVersion] = useState('24');
  const [packageManager, setPackageManager] = useState('npm');
  const [buildTool, setBuildTool] = useState('none');
  const [browserTargets, setBrowserTargets] = useState(['chrome']);
  const [productionBranch, setProductionBranch] = useState('main');
  const [extraBranches, setExtraBranches] = useState([]);
  const [publishMode, setPublishMode] = useState('zip-only');
  const [checks, setChecks] = useState(['lint', 'test', 'build', 'validate-manifest']);

  // UI / Generator State
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGenerated, setIsGenerated] = useState(false);
  const [generatedFiles, setGeneratedFiles] = useState({});
  const [activeTab, setActiveTab] = useState('');
  const [toast, setToast] = useState(null);
  const [copiedFile, setCopiedFile] = useState('');
  const [zipping, setZipping] = useState(false);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3500);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleCheckboxChange = (e) => {
    const { value, checked } = e.target;
    if (checked) {
      setChecks((prev) => [...prev, value]);
    } else {
      setChecks((prev) => prev.filter((c) => c !== value));
    }
  };

  const handleBrowserTargetChange = (e) => {
    const { value, checked } = e.target;
    if (value === 'chrome') return; // Chrome is always required
    if (checked) {
      setBrowserTargets((prev) => [...prev, value]);
    } else {
      setBrowserTargets((prev) => prev.filter((b) => b !== value));
    }
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setIsGenerating(true);

    const config = {
      extensionFramework,
      nodeVersion: nodeVersion.trim(),
      packageManager,
      buildTool,
      browserTargets,
      productionBranch: productionBranch.trim() || 'main',
      extraBranches: extraBranches.map((b) => b.trim()).filter(Boolean),
      checks,
      publishMode,
    };

    try {
      const res = await fetch('/api/extension/generate', {
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
    setExtensionFramework('vanilla');
    setNodeVersion('24');
    setPackageManager('npm');
    setBuildTool('none');
    setBrowserTargets(['chrome']);
    setProductionBranch('main');
    setExtraBranches([]);
    setPublishMode('zip-only');
    setChecks(['lint', 'test', 'build', 'validate-manifest']);
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
      a.download = 'chrome-extension-workflows.zip';
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

  const getFileClass = (fileKey) => {
    let planned = true;
    if (fileKey === 'publish-store') {
      planned = publishMode === 'auto-publish';
    }

    if (isGenerated) {
      if (fileKey === 'publish-store') {
        return planned ? 'file-item generated' : 'file-item skipped';
      }
      return 'file-item generated';
    }

    return planned ? 'file-item will-generate' : 'file-item skipped';
  };

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

  const currentSecrets = publishMode === 'auto-publish'
    ? browserTargets.flatMap((b) => BROWSER_SECRETS[b] || [])
    : [];

  return (
    <>
      <Header />

      <div className="app-body">
        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <aside className="sidebar">
          <div className="sidebar-header">Files to generate</div>
          <ul className="file-list" id="fileList">
            <li className={getFileClass('ci')} data-file="ci">
              <span className="file-icon">📄</span> .github/workflows/ci.yml
            </li>
            <li className={getFileClass('package-release')} data-file="package-release">
              <span className="file-icon">📄</span> package-release.yml
            </li>
            <li className={getFileClass('publish-store')} data-file="publish-store">
              <span className="file-icon">📄</span> publish-store.yml
            </li>
            <li className={getFileClass('env')} data-file="env">
              <span className="file-icon">📄</span> .env.example
            </li>
            <li className={getFileClass('notes')} data-file="notes">
              <span className="file-icon">📄</span> PUBLISHING_NOTES.md
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
                  Generate your <span>Chrome Extension</span> CI/CD pipelines
                </h1>
                <p className="form-subtitle">
                  Configure your extension below and get build, packaging, and store-publishing workflows in seconds.
                </p>
              </div>

              <form id="extensionConfigForm" onSubmit={handleGenerate}>
                <div className="form-grid">
                  {/* Extension framework */}
                  <div className="field">
                    <label htmlFor="extensionFramework">🧩 Extension framework</label>
                    <select
                      id="extensionFramework"
                      name="extensionFramework"
                      value={extensionFramework}
                      onChange={(e) => setExtensionFramework(e.target.value)}
                    >
                      <option value="vanilla">Vanilla JavaScript</option>
                      <option value="typescript">TypeScript</option>
                      <option value="react">React</option>
                      <option value="vue">Vue</option>
                    </select>
                  </div>

                  {/* Node.js version */}
                  <div className="field">
                    <label htmlFor="nodeVersion">⬢ Node.js version</label>
                    <input
                      id="nodeVersion"
                      name="nodeVersion"
                      type="text"
                      value={nodeVersion}
                      onChange={(e) => setNodeVersion(e.target.value)}
                      placeholder="e.g. 22 or 22.14.0"
                      pattern="v?[0-9]+(\\.(?:[0-9]+|x)){0,2}"
                      required
                    />
                  </div>

                  {/* Package manager */}
                  <div className="field">
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

                  {/* Build tool */}
                  <div className="field">
                    <label htmlFor="buildTool">🛠 Build tool</label>
                    <select
                      id="buildTool"
                      name="buildTool"
                      value={buildTool}
                      onChange={(e) => setBuildTool(e.target.value)}
                    >
                      <option value="none">None (plain files)</option>
                      <option value="webpack">Webpack</option>
                      <option value="vite">Vite</option>
                      <option value="parcel">Parcel</option>
                    </select>
                  </div>

                  {/* Publish mode */}
                  <div className="field full-width">
                    <label htmlFor="publishMode">🚀 Publish mode</label>
                    <select
                      id="publishMode"
                      name="publishMode"
                      value={publishMode}
                      onChange={(e) => setPublishMode(e.target.value)}
                    >
                      <option value="zip-only">Build & zip only (manual store upload)</option>
                      <option value="auto-publish">Auto-publish to store(s) on version tag</option>
                    </select>
                  </div>

                  {/* Branch flow */}
                  <div className="field full-width">
                    <label>
                      🌿 Branch flow{' '}
                      <span className="label-hint">(name your branches — they drive the workflow triggers)</span>
                    </label>
                    <BranchFlowFields
                      productionBranch={productionBranch}
                      onProductionBranchChange={setProductionBranch}
                      showStaging={false}
                      extraBranches={extraBranches}
                      onExtraBranchesChange={setExtraBranches}
                    />
                  </div>

                  {/* Browser targets */}
                  <div className="field full-width">
                    <label>
                      🌍 Browser targets{' '}
                      <span className="label-hint">(Chrome is always included)</span>
                    </label>
                    <div className="checkbox-grid" id="browserTargetsGrid">
                      {[
                        { id: 'target-chrome', value: 'chrome', label: '🟢 Chrome Web Store', disabled: true },
                        { id: 'target-firefox', value: 'firefox', label: '🦊 Firefox Add-ons' },
                        { id: 'target-edge', value: 'edge', label: '🔷 Edge Add-ons' },
                      ].map((t) => (
                        <div className="checkbox-item" key={t.id}>
                          <input
                            type="checkbox"
                            id={t.id}
                            name="browserTargets"
                            value={t.value}
                            checked={browserTargets.includes(t.value)}
                            onChange={handleBrowserTargetChange}
                            disabled={t.disabled}
                          />
                          <label htmlFor={t.id}>{t.label}</label>
                        </div>
                      ))}
                    </div>
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
                        { id: 'check-validate-manifest', value: 'validate-manifest', label: '📜 Validate manifest.json' },
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

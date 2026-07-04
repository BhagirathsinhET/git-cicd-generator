'use strict';

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

/* ── PHP project detection ──────────────────────────────────────────────── */
function isPhpProject(type) {
  return type === 'laravel' || type === 'wordpress';
}

/* ── DOM refs ───────────────────────────────────────────────────────────── */
const form            = document.getElementById('configForm');
const generateBtn     = document.getElementById('generateBtn');
const resetBtn        = document.getElementById('resetBtn');
const backBtn         = document.getElementById('backBtn');
const downloadAllBtn  = document.getElementById('downloadAllBtn');
const formPanel       = document.getElementById('formPanel');
const outputPanel     = document.getElementById('outputPanel');
const tabsContainer   = document.getElementById('tabs');
const codePanesEl     = document.getElementById('codePanes');
const secretChips     = document.getElementById('secretChips');
const fileList        = document.getElementById('fileList');
const toast           = document.getElementById('toast');
const pmField         = document.getElementById('pmField');
const projectTypeEl   = document.getElementById('projectType');
const deployTargetEl  = document.getElementById('deployTarget');
const deployEnvsEl    = document.getElementById('deployEnvironments');

/* ── State ──────────────────────────────────────────────────────────────── */
let generatedFiles = {};
let currentConfig  = {};

/* ── Init ───────────────────────────────────────────────────────────────── */
updateSecretsPreview();
updatePmVisibility();
updateSidebarFiles();

/* ── Event listeners ────────────────────────────────────────────────────── */
deployTargetEl.addEventListener('change', () => {
  updateSecretsPreview();
  updateSidebarFiles();
});

deployEnvsEl.addEventListener('change', updateSidebarFiles);
projectTypeEl.addEventListener('change', () => { updatePmVisibility(); updateSidebarFiles(); });

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  await handleGenerate();
});

resetBtn.addEventListener('click', () => {
  form.reset();
  updateSecretsPreview();
  updatePmVisibility();
  updateSidebarFiles();
});

backBtn.addEventListener('click', () => {
  outputPanel.classList.remove('visible');
  formPanel.style.display = '';
});

downloadAllBtn.addEventListener('click', handleDownloadAll);

/* ── Helpers: form config ───────────────────────────────────────────────── */
function getConfig() {
  const checks = [...document.querySelectorAll('#checksGrid input:checked')].map(el => el.value);
  const deployEnvValue = deployEnvsEl.value;
  const deployEnvironments = deployEnvValue === 'both'
    ? ['staging', 'production', 'both']
    : [deployEnvValue];

  return {
    projectType:        projectTypeEl.value,
    packageManager:     document.getElementById('packageManager').value,
    deployTarget:       deployTargetEl.value,
    branchFlow:         document.getElementById('branchFlow').value,
    checks,
    deployEnvironments,
  };
}

/* ── PM visibility ──────────────────────────────────────────────────────── */
function updatePmVisibility() {
  const hide = isPhpProject(projectTypeEl.value);
  pmField.style.display = hide ? 'none' : '';
}

/* ── Sidebar secrets preview ────────────────────────────────────────────── */
function updateSecretsPreview() {
  const target  = deployTargetEl.value;
  const secrets = SECRETS_MAP[target] || [];

  if (secrets.length === 0) {
    secretChips.innerHTML = '<span style="font-size:0.75rem;color:var(--text-dim)">No secrets needed</span>';
    return;
  }

  secretChips.innerHTML = secrets
    .map(s => `<span class="secret-chip">${s}</span>`)
    .join('');
}

/* ── Sidebar file list update ───────────────────────────────────────────── */
function updateSidebarFiles() {
  const envValue  = deployEnvsEl.value;
  const hasSt     = envValue === 'both' || envValue === 'staging';
  const hasProd   = envValue === 'both' || envValue === 'production';

  fileList.querySelectorAll('[data-file]').forEach(el => {
    const key = el.dataset.file;
    el.className = 'file-item';

    if (key === 'ci' || key === 'env' || key === 'notes') {
      el.classList.add('will-generate');
    } else if (key === 'staging') {
      el.classList.add(hasSt ? 'will-generate' : 'skipped');
    } else if (key === 'production') {
      el.classList.add(hasProd ? 'will-generate' : 'skipped');
    }
  });
}

/* ── Generate ───────────────────────────────────────────────────────────── */
async function handleGenerate() {
  currentConfig = getConfig();

  // Loading state
  generateBtn.classList.add('loading');
  generateBtn.disabled = true;

  try {
    const res  = await fetch('/api/generate', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(currentConfig),
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
      throw new Error(data.error || 'Generation failed');
    }

    generatedFiles = data.files;
    renderOutput(data.files);
    markSidebarGenerated(data.files);
    showToast('✅ Workflows generated successfully!', 'success');

  } catch (err) {
    showToast(`❌ ${err.message}`, 'error');
    console.error(err);
  } finally {
    generateBtn.classList.remove('loading');
    generateBtn.disabled = false;
  }
}

/* ── Render output tabs + panes ─────────────────────────────────────────── */
function renderOutput(files) {
  tabsContainer.innerHTML = '';
  codePanesEl.innerHTML   = '';

  const entries = Object.entries(files);
  let firstActive = true;

  for (const [filePath, content] of entries) {
    const meta = FILE_META[filePath] || {
      ext: 'txt', label: filePath.split('/').pop(), lang: 'plaintext', icon: '📄',
    };

    const tabId = filePath.replace(/[^a-z0-9]/gi, '_');

    // Tab
    const tab = document.createElement('button');
    tab.className = 'tab' + (firstActive ? ' active' : '');
    tab.dataset.pane = tabId;
    tab.innerHTML = `
      <span>${meta.icon}</span>
      <span>${meta.label}</span>
      <span class="tab-ext ${meta.ext}">${meta.ext}</span>
    `;
    tab.addEventListener('click', () => activateTab(tabId));
    tabsContainer.appendChild(tab);

    // Code pane
    const pane = document.createElement('div');
    pane.className = 'code-pane' + (firstActive ? ' active' : '');
    pane.id = tabId;

    const highlighted = highlightCode(content, meta.lang);

    pane.innerHTML = `
      <div class="code-toolbar">
        <span class="code-filename">${filePath}</span>
        <button class="btn-copy" data-path="${filePath}">📋 Copy</button>
      </div>
      <div class="code-scroll">
        <pre><code class="language-${meta.lang}">${highlighted}</code></pre>
      </div>
    `;

    pane.querySelector('.btn-copy').addEventListener('click', (e) => {
      copyFile(filePath, e.currentTarget);
    });

    codePanesEl.appendChild(pane);
    firstActive = false;
  }

  // Show output
  formPanel.style.display = 'none';
  outputPanel.classList.add('visible');
}

function highlightCode(code, lang) {
  try {
    if (hljs.getLanguage(lang)) {
      return hljs.highlight(code, { language: lang }).value;
    }
  } catch (_) {}
  return escapeHtml(code);
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/* ── Tab switching ──────────────────────────────────────────────────────── */
function activateTab(tabId) {
  tabsContainer.querySelectorAll('.tab').forEach(t => {
    t.classList.toggle('active', t.dataset.pane === tabId);
  });
  codePanesEl.querySelectorAll('.code-pane').forEach(p => {
    p.classList.toggle('active', p.id === tabId);
  });
}

/* ── Copy file ──────────────────────────────────────────────────────────── */
async function copyFile(filePath, btn) {
  const content = generatedFiles[filePath];
  if (!content) return;

  try {
    await navigator.clipboard.writeText(content);
    btn.classList.add('copied');
    btn.textContent = '✅ Copied!';
    setTimeout(() => {
      btn.classList.remove('copied');
      btn.innerHTML = '📋 Copy';
    }, 2000);
  } catch (_) {
    showToast('Could not access clipboard', 'error');
  }
}

/* ── Download all as ZIP ────────────────────────────────────────────────── */
async function handleDownloadAll() {
  if (Object.keys(generatedFiles).length === 0) {
    showToast('Generate files first', 'error');
    return;
  }

  downloadAllBtn.disabled = true;
  downloadAllBtn.textContent = '⏳ Zipping…';

  try {
    // Use JSZip client-side for instant feedback
    const zip = new JSZip();

    for (const [filePath, content] of Object.entries(generatedFiles)) {
      zip.file(filePath, content);
    }

    const blob  = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE' });
    const url   = URL.createObjectURL(blob);
    const a     = document.createElement('a');
    a.href      = url;
    a.download  = 'github-workflows.zip';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    showToast('✅ ZIP downloaded!', 'success');
  } catch (err) {
    showToast(`❌ Download failed: ${err.message}`, 'error');
  } finally {
    downloadAllBtn.disabled = false;
    downloadAllBtn.textContent = '⬇ Download all as ZIP';
  }
}

/* ── Sidebar: mark files as generated ──────────────────────────────────── */
function markSidebarGenerated(files) {
  const hasStaging    = '.github/workflows/deploy-staging.yml' in files;
  const hasProduction = '.github/workflows/deploy-production.yml' in files;

  fileList.querySelectorAll('[data-file]').forEach(el => {
    const key = el.dataset.file;
    el.className = 'file-item';

    if (key === 'ci' || key === 'env' || key === 'notes') {
      el.classList.add('generated');
    } else if (key === 'staging') {
      el.classList.add(hasStaging ? 'generated' : 'skipped');
    } else if (key === 'production') {
      el.classList.add(hasProduction ? 'generated' : 'skipped');
    }
  });
}

/* ── Toast notification ─────────────────────────────────────────────────── */
let toastTimer = null;
function showToast(msg, type = 'success') {
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  // Force reflow
  void toast.offsetWidth;
  toast.classList.add('show');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

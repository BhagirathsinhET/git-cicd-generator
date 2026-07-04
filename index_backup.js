const express = require('express');
const path = require('path');
const archiver = require('archiver');
const { generateWorkflows } = require('./src/generator');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// POST /api/generate — accepts config JSON, returns all generated file contents
app.post('/api/generate', (req, res) => {
  try {
    const config = req.body;

    if (!config || !config.projectType || !config.deployTarget) {
      return res.status(400).json({ error: 'Missing required config fields: projectType, deployTarget' });
    }

    const files = generateWorkflows(config);
    res.json({ success: true, files });
  } catch (err) {
    console.error('Generation error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

// POST /api/download — streams a ZIP of all generated files
app.post('/api/download', (req, res) => {
  try {
    const config = req.body;

    if (!config || !config.projectType || !config.deployTarget) {
      return res.status(400).json({ error: 'Missing required config fields' });
    }

    const files = generateWorkflows(config);

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="github-workflows.zip"');

    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', (err) => { throw err; });
    archive.pipe(res);

    // Add each file to the archive
    for (const [filePath, content] of Object.entries(files)) {
      archive.append(content, { name: filePath });
    }

    archive.finalize();
  } catch (err) {
    console.error('Download error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal server error' });
    }
  }
});

app.listen(PORT, () => {
  console.log(`CI/CD Pipeline Generator running at http://localhost:${PORT}`);
});

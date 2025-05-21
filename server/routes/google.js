const express = require('express');
const router = express.Router();
const querystring = require('querystring');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });
const LOG_PATH = path.resolve(__dirname, "../../../dashboard/logs.json");



// ---- AUTH ----
router.get('/google', (req, res) => {
  const params = {
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: 'code',
    scope: 'https://www.googleapis.com/auth/drive',
    access_type: 'offline',
    prompt: 'consent'
  };
  const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + querystring.stringify(params);
  res.redirect(url);
});

router.get('/google/callback', (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("No code received from Google");

  execFile('python', ['google_api/get_tokens.py', code], (err, stdout, stderr) => {
    if (err) {
      console.error('Google token exchange error:', err, stderr);
      return res.status(500).send("Failed to get Google tokens");
    }
    console.log(stdout);
    res.redirect('/');
  });
});
console.log(LOG_PATH);

function logActivity(action, file, service) {
  const entry = {
    timestamp: new Date().toISOString(),
    action,
    file,
    service
  };

  let logs = [];
  if (fs.existsSync(LOG_PATH)) {
    try {
      logs = JSON.parse(fs.readFileSync(LOG_PATH));
    } catch (err) {
      console.error("Error parsing logs:", err);
    }
  }

  logs.push(entry);
  fs.writeFileSync(LOG_PATH, JSON.stringify(logs, null, 2));
}

// ---- LIST ----
router.get('/list', (req, res) => {
  execFile('python', [path.join(__dirname, '../../google_api/list_files.py')], (err, stdout, stderr) => {
    if (err) {
      console.error('List error:', stderr);
      return res.status(500).send("Failed to list Google Drive files");
    }
    res.type('application/json').send(stdout);
  });
});

// ---- UPLOAD ----
router.post('/upload', upload.single('myfile'), (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded');

  const filePath = req.file.path;
  const originalName = req.file.originalname;

  execFile('python', ['google_api/upload_file.py', filePath, originalName], (err, stdout, stderr) => {
    fs.unlink(filePath, () => {});
    if (err) {
      console.error('Upload error:', stderr);
      return res.status(500).send('Upload failed');
    }
    console.log(stdout);
    logActivity("upload", originalName, "Google Drive");
  res.send("✅ File uploaded to Google Drive!");
  });
});

// ---- DOWNLOAD ----
router.get('/download', (req, res) => {
  const { id, name } = req.query;
  execFile('python', [path.join(__dirname, '../../google_api/download_file.py'), id, name], (err, stdout, stderr) => {
    if (err) {
      console.error('Download error:', err);
      return res.status(500).send('Download failed');
    }
    const filePath = `downloads/${name}`;
    res.download(filePath, name, err => {
    logActivity("download", name, "Google Drive");
      if (err) console.error('Error sending file:', err);
    });
  });
});

// ---- RENAME ----
router.post('/rename', express.json(), (req, res) => {
  const { id, name } = req.body;
  if (!id || !name) return res.status(400).send("Missing file ID or new name");
  execFile('python', [path.join(__dirname, '../../google_api/rename_file.py'), id, name], (err, stdout, stderr) => {
    if (err) {
      console.error('Rename error:', stderr);
      return res.status(500).send("Rename failed");
    }
    logActivity("rename", name, "Google Drive");
  res.send("✅ File renamed");
  });
});

// ---- DELETE ----
router.delete('/delete', (req, res) => {
  const fileId = req.query.id;
  execFile('python', [path.join(__dirname, '../../google_api/delete_file.py'), fileId], (err, stdout, stderr) => {
    if (err) {
      console.error('Delete error:', stderr);
      return res.status(500).send("Delete failed");
    }
    logActivity("delete", fileId, "Google Drive");
  res.send("🗑️ File deleted");
  });
});

// ---- PREVIEW ----
router.get('/preview', (req, res) => {
  const { id, name } = req.query;
  execFile('python', [path.join(__dirname, '../../google_api/download_file.py'), id, name], (err, stdout, stderr) => {
    if (err) {
      console.error('Google preview error:', stderr);
      return res.status(500).send('Preview failed');
    }

    logActivity("preview", name, "Google Drive");
    const filePath = `downloads/${name}`;
    const ext = name.split('.').pop().toLowerCase();

    const mimeMap = {
      pdf: 'application/pdf',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      png: 'image/png',
      gif: 'image/gif',
      bmp: 'image/bmp'
    };
    const mimeType = mimeMap[ext] || 'application/octet-stream';

    res.sendFile(path.resolve(filePath), {
      headers: {
        'Content-Type': mimeType,
        'Content-Disposition': 'inline',
      }
    });
  });
});

// ---- STATUS ----
router.get("/status/google", async (req, res) => {
  const tokenPath = path.join(__dirname, "../../google_api/credentials.json");
  if (!fs.existsSync(tokenPath)) return res.json({ connected: false });

  const tokens = JSON.parse(fs.readFileSync(tokenPath));
  const access_token = tokens.access_token;

  try {
    const fetch = (await import('node-fetch')).default;
    const userRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${access_token}` }
    });

    if (!userRes.ok) throw new Error("Bad token");

    const user = await userRes.json();
    res.json({ connected: true, name: user.name });
  } catch {
    res.json({ connected: false });
  }
});

// ---- LOGOUT ----
router.get('/logout', (req, res) => {
    const fs = require('fs');
    const path = require('path');
    const tokenPath = path.join(__dirname, '../../google_api/credentials.json');
  
    if (fs.existsSync(tokenPath)) {
      fs.unlinkSync(tokenPath);
    }
  
    res.send('Google Drive logged out');
  });
  


module.exports = router;

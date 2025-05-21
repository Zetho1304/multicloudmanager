const express = require("express");
const fs = require("fs");

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
      console.error("Error parsing logs.json:", err);
    }
  }

  logs.push(entry);
  fs.writeFileSync(LOG_PATH, JSON.stringify(logs, null, 2));
}

const path = require("path");
const { execFile } = require("child_process");
const router = express.Router();
const querystring = require("querystring");
const multer = require("multer");
const upload = multer({ dest: "uploads/" });
require("dotenv").config();
const LOG_PATH = path.resolve(__dirname, "../../../dashboard/logs.json");
const CLIENT_ID = process.env.ONEDRIVE_CLIENT_ID;
const CLIENT_SECRET = process.env.ONEDRIVE_CLIENT_SECRET;
const REDIRECT_URI = "http://localhost:3000/auth/onedrive/callback";



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

// ---------- LOGIN ----------
router.get("/auth/onedrive", (req, res) => {
  const params = querystring.stringify({
    client_id: CLIENT_ID,
    response_type: "code",
    redirect_uri: REDIRECT_URI,
    scope: "files.readwrite offline_access",
    response_mode: "query",
  });

  res.redirect(`https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`);
});

// ---------- CALLBACK ----------
router.get("/auth/onedrive/callback", async (req, res) => {
  const code = req.query.code;

  const params = querystring.stringify({
    client_id: CLIENT_ID,
    client_secret: CLIENT_SECRET,
    code,
    redirect_uri: REDIRECT_URI,
    grant_type: "authorization_code",
  });

  const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params,
  });

  const result = await tokenRes.json();

  if (result.access_token) {
    const tokenData = {
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      expires_in: result.expires_in,
    };

    fs.writeFileSync(
      path.join(__dirname, "../../onedrive_api/credentials.json"),
      JSON.stringify(tokenData)
    );

    res.redirect("http://localhost:3000");
  } else {
    res.status(500).send("❌ OneDrive login failed.");
  }
});

// ---------- LIST FILES ----------
router.get("/files/onedrive/list", (req, res) => {
  execFile("python", [path.join(__dirname, "../../onedrive_api/list_files.py")], (err, stdout, stderr) => {
    if (err) {
      console.error("OneDrive list error:", stderr);
      return res.status(500).send("Failed to list OneDrive files");
    }

    res.type("application/json").send(stdout);
  });
});

// ---------- UPLOAD ----------
router.post("/files/onedrive/upload", upload.single("myfile"), (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded");

  const filePath = req.file.path;
  const originalName = req.file.originalname;

  execFile("python", ["onedrive_api/upload_file.py", filePath, originalName], (err, stdout, stderr) => {
    fs.unlink(filePath, () => {});
    if (err) {
      console.error("OneDrive upload error:", stderr);
      return res.status(500).send("Upload failed");
    }

    logActivity("upload", originalName, "OneDrive");
    res.send("✅ Uploaded to OneDrive");
  });
});

// ---------- DOWNLOAD ----------
router.get("/files/onedrive/download", (req, res) => {
  const { id, name } = req.query;

  execFile("python", ["onedrive_api/download_file.py", id, name], (err, stdout, stderr) => {
    if (err) {
      console.error("OneDrive download error:", stderr);
      return res.status(500).send("Download failed");
    }

    const filePath = path.resolve(`downloads/${name}`);
    res.download(filePath, name, () => {
    logActivity("download", name, "OneDrive");
      fs.unlink(filePath, () => {});
    });
  });
});

// ---------- PREVIEW ----------
router.get("/files/onedrive/preview", (req, res) => {
  const { id, name } = req.query;

  execFile("python", ["onedrive_api/download_file.py", id, name], (err, stdout, stderr) => {
    if (err) {
      console.error("OneDrive preview error:", stderr);
      return res.status(500).send("Preview failed");
    }

    const filePath = path.resolve(`downloads/${name}`);
    const ext = name.split(".").pop().toLowerCase();
    const mimeMap = {
      pdf: "application/pdf",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      bmp: "image/bmp",
    };
    const mimeType = mimeMap[ext] || "application/octet-stream";

    logActivity("preview", name, "OneDrive");
  res.sendFile(filePath, {
      headers: {
        "Content-Type": mimeType,
        "Content-Disposition": "inline",
      },
    });
  });
});

// ---------- RENAME ----------
router.post("/files/onedrive/rename", express.json(), (req, res) => {
  const { id, newName } = req.body;
  if (!id || !newName) return res.status(400).send("Missing file ID or new name");

  execFile("python", ["onedrive_api/rename_file.py", id, newName], (err, stdout, stderr) => {
    if (err) {
      console.error("Rename error:", stderr);
      return res.status(500).send("Rename failed");
    }
    logActivity("rename", newName, "OneDrive");
  res.send("✅ File renamed");
  });
});

// ---------- DELETE ----------
router.delete("/files/onedrive/delete", (req, res) => {
  const fileId = req.query.id;

  execFile("python", ["onedrive_api/delete_file.py", fileId], (err, stdout, stderr) => {
    if (err) {
      console.error("Delete error:", stderr);
      return res.status(500).send("Delete failed");
    }

    logActivity("delete", fileId, "OneDrive");
  res.send("🗑️ File deleted");
  });
});

// ---------- STATUS ----------
router.get("/status/onedrive", async (req, res) => {
  const tokenPath = path.join(__dirname, "../../onedrive_api/credentials.json");

  if (!fs.existsSync(tokenPath)) {
    return res.json({ connected: false });
  }

  try {
    const tokens = JSON.parse(fs.readFileSync(tokenPath));
    const access_token = tokens.access_token;

    const userRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: {
        Authorization: `Bearer ${access_token}`,
      },
    });

    if (!userRes.ok) throw new Error("Invalid token");

    const user = await userRes.json();
    res.json({ connected: true, name: user.displayName || "OneDrive User" });

  } catch (err) {
    console.error("OneDrive status error:", err.message);
    res.json({ connected: false });
  }
});

// ---------- LOGOUT ----------
router.get("/files/onedrive/logout", (req, res) => {
  const tokenPath = path.join(__dirname, "../../onedrive_api/credentials.json");
  if (fs.existsSync(tokenPath)) {
    fs.unlinkSync(tokenPath);
  }
  res.send("OneDrive logged out");
});

module.exports = router;

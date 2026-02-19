const fs = require("fs");
const path = require("path");
const multer = require("multer");

const uploadsDir = process.env.UPLOADS_DIR || "uploads";
const rootDir = path.join(__dirname, "..");
const targetDir = path.join(rootDir, uploadsDir);

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, targetDir),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^\w.-]/g, "_");
    cb(null, `${Date.now()}_${safe}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }
});

module.exports = { upload };


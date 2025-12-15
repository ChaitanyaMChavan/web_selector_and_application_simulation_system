import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure upload directories exist
const baseUploadsDir = path.join(process.cwd(), 'uploads');
const videoDir = path.join(baseUploadsDir, 'videos');
const fileDir = path.join(baseUploadsDir, 'files');

[baseUploadsDir, videoDir, fileDir].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
});

// Simple filename helper to avoid collisions
const uniqueName = (prefix: string, originalName: string) => {
  const ext = path.extname(originalName);
  const safeBase = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, '');
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext || ''}`;
};

export const videoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, videoDir),
    filename: (_req, file, cb) => cb(null, uniqueName('video', file.originalname)),
  }),
  limits: { fileSize: 100 * 1024 * 1024 }, // 100MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype.startsWith('video/')) return cb(null, true);
    cb(new Error('Only video files are allowed'));
  },
});

export const codingFileUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, fileDir),
    filename: (_req, file, cb) => cb(null, uniqueName('code', file.originalname)),
  }),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    // Allow common text/code types; fallback to allow everything but block executables
    const blocked = ['application/x-msdownload', 'application/x-msdos-program'];
    if (blocked.includes(file.mimetype)) return cb(new Error('Executable files are not allowed'));
    cb(null, true);
  },
});

export const uploadsBasePath = '/uploads';
export const uploadsVideoPath = `${uploadsBasePath}/videos`;
export const uploadsFilePath = `${uploadsBasePath}/files`;



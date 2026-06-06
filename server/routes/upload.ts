import type { Express } from 'express';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

function ensureUploadDir() {
  if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

export function registerUploadRoutes(app: Express) {
  ensureUploadDir();

  app.post('/api/uploads', async (req, res) => {
    const { filename, data, mimeType } = req.body ?? {};
    if (!filename || !data || typeof data !== 'string') {
      return res.status(400).json({ error: '缺少 filename 或 data（base64）' });
    }
    const match = data.match(/^data:([^;]+);base64,(.+)$/);
    const base64 = match ? match[2] : data;
    const ext = path.extname(filename) || (mimeType?.includes('png') ? '.png' : '.jpg');
    const safeName = `${randomUUID()}${ext}`;
    const filePath = path.join(UPLOAD_DIR, safeName);
    fs.writeFileSync(filePath, Buffer.from(base64, 'base64'));
    const url = `/uploads/${safeName}`;
    res.json({ url, name: filename, mimeType: match?.[1] ?? mimeType ?? 'application/octet-stream' });
  });
}

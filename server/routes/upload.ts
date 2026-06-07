import type { Express } from 'express';
import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';

const UPLOAD_DIR = path.join(process.cwd(), 'uploads');

/**
 * DEMO_ONLY:
 * 当前文件上传到本地 uploads 目录，仅用于演示。
 *
 * PRODUCTION_TODO:
 * 真实产品中应接入 OSS/S3/云存储，并增加鉴权、大小限制、病毒扫描、访问控制。
 */
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

import { Router, Request, Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';

const router = Router();

const IMAGES_DIR = path.join(__dirname, '../../card_images');

// Serve card images
router.get('/:filename', (req: Request, res: Response) => {
  const { filename } = req.params;

  // Validate filename to prevent directory traversal
  if (!filename || filename.includes('..') || filename.includes('/')) {
    return res.status(400).json({ error: 'Invalid filename' });
  }

  const filepath = path.join(IMAGES_DIR, filename);

  // Check if file exists
  if (!fs.existsSync(filepath)) {
    return res.status(404).json({ error: 'Image not found' });
  }

  // Get file extension to set correct content type
  const ext = path.extname(filename).toLowerCase();
  const contentType = ext === '.png' ? 'image/png' :
                      ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                      ext === '.gif' ? 'image/gif' :
                      ext === '.webp' ? 'image/webp' :
                      'application/octet-stream';

  // Set appropriate headers
  res.setHeader('Content-Type', contentType);
  res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year

  // Stream the file
  const stream = fs.createReadStream(filepath);
  stream.pipe(res);

  stream.on('error', (error) => {
    console.error('Error streaming image:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Error loading image' });
    }
  });
});

export default router;
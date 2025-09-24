import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';

const IMAGES_DIR = path.join(__dirname, '../../card_images');

// Ensure the images directory exists
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

/**
 * Save a base64 image to disk synchronously and return the filename
 * Keeps original image format
 */
export function saveImageToDiskSync(base64Data: string, cardId: string): string | null {
  try {
    if (!base64Data || !base64Data.startsWith('data:image')) {
      return null;
    }

    // Extract the image format and base64 data
    const matches = base64Data.match(/^data:image\/([a-z]+);base64,(.+)$/i);
    if (!matches) {
      return null;
    }

    const [, format, base64] = matches;
    // Keep original format but normalize to common extensions
    let ext = format.toLowerCase();
    if (ext === 'jpeg') ext = 'jpg';
    const filename = `${cardId}.${ext}`;
    const filepath = path.join(IMAGES_DIR, filename);

    // Convert base64 to buffer and save
    const buffer = Buffer.from(base64, 'base64');
    fs.writeFileSync(filepath, buffer);

    console.log(`[ImageUtils] Saved image: ${filename}`);

    // Return just the filename (not the full path)
    return filename;
  } catch (error) {
    console.error(`Error saving image for card ${cardId}:`, error);
    return null;
  }
}

/**
 * Save a base64 image to disk and return the filename
 * Converts all images to PNG format for consistency
 */
export async function saveImageToDisk(base64Data: string, cardId: string): Promise<string | null> {
  try {
    if (!base64Data || !base64Data.startsWith('data:image')) {
      return null;
    }

    // Extract the image format and base64 data
    const matches = base64Data.match(/^data:image\/([a-z]+);base64,(.+)$/i);
    if (!matches) {
      return null;
    }

    const [, , base64] = matches;
    // Always save as PNG for consistency
    const filename = `${cardId}.png`;
    const filepath = path.join(IMAGES_DIR, filename);

    // Convert base64 to buffer
    const buffer = Buffer.from(base64, 'base64');

    // Use sharp to convert to PNG and save
    await sharp(buffer)
      .png()
      .toFile(filepath);

    console.log(`[ImageUtils] Converted and saved image as PNG: ${filename}`);

    // Return just the filename (not the full path)
    return filename;
  } catch (error) {
    console.error(`Error saving image for card ${cardId}:`, error);
    return null;
  }
}

/**
 * Load an image from disk and return as base64 data URL
 */
export function loadImageFromDisk(filename: string): string | null {
  try {
    if (!filename) {
      return null;
    }

    const filepath = path.join(IMAGES_DIR, filename);

    if (!fs.existsSync(filepath)) {
      return null;
    }

    const buffer = fs.readFileSync(filepath);
    const format = path.extname(filename).substring(1); // Remove the dot
    const base64 = buffer.toString('base64');

    return `data:image/${format};base64,${base64}`;
  } catch (error) {
    console.error(`Error loading image ${filename}:`, error);
    return null;
  }
}

/**
 * Delete an image file from disk
 */
export function deleteImageFromDisk(filename: string): boolean {
  try {
    if (!filename) {
      return false;
    }

    const filepath = path.join(IMAGES_DIR, filename);

    if (fs.existsSync(filepath)) {
      fs.unlinkSync(filepath);
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error deleting image ${filename}:`, error);
    return false;
  }
}

/**
 * Get the full path to an image file
 */
export function getImagePath(filename: string): string {
  return path.join(IMAGES_DIR, filename);
}

/**
 * Check if an image file exists
 */
export function imageExists(filename: string): boolean {
  if (!filename) {
    return false;
  }

  const filepath = path.join(IMAGES_DIR, filename);
  return fs.existsSync(filepath);
}
// Utility functions for image conversion

/**
 * Convert image file to base64 data URI
 * Server-side only
 */
export async function imageToBase64(imagePath: string): Promise<string> {
  const fs = require('fs');
  const path = require('path');

  const fullPath = path.join(process.cwd(), imagePath);
  const imageBuffer = fs.readFileSync(fullPath);
  const base64 = imageBuffer.toString('base64');

  // Determine mime type from extension
  const ext = path.extname(imagePath).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' :
                   ext === '.jpg' || ext === '.jpeg' ? 'image/jpeg' :
                   ext === '.svg' ? 'image/svg+xml' :
                   'image/png'; // default

  return `data:${mimeType};base64,${base64}`;
}

/**
 * Convert URL/path image to base64 (browser-side)
 */
export async function urlToBase64(url: string): Promise<string> {
  const response = await fetch(url);
  const blob = await response.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

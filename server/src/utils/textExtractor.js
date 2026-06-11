import mammoth from 'mammoth';
import fs from 'fs/promises';

export async function extractText(filePath, mimetype) {
  if (mimetype === 'text/plain') {
    return await fs.readFile(filePath, 'utf-8');
  }

  if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  throw new Error(`Unsupported file type: ${mimetype}`);
}

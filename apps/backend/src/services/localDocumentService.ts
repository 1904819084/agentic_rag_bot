import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Injectable } from '@gulux/gulux';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import type { ParsedDocumentInput } from '../types';
import { AppError } from '../utils/appError';

export type UploadedLocalFile = {
  originalName: string;
  mimeType?: string;
  buffer: Buffer;
};

const TEXT_EXTENSIONS = new Set(['.txt', '.md', '.markdown']);
const SUPPORTED_EXTENSIONS = new Set([...TEXT_EXTENSIONS, '.docx', '.pdf']);
const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024;
const MIN_TEXT_CHARS = 20;
const UPLOAD_ROOT = path.resolve(process.cwd(), 'storage/uploads');

function getExtension(fileName: string) {
  return path.extname(fileName).toLowerCase();
}

function getTitle(fileName: string) {
  return path.basename(fileName, path.extname(fileName)).trim() || '未命名文档';
}

function createContentHash(buffer: Buffer) {
  return createHash('sha256').update(buffer).digest('hex');
}

function normalizeExtractedText(text: string) {
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

function sanitizeFileName(fileName: string) {
  const parsed = path.parse(fileName);
  const name = parsed.name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'document';
  return `${name}${parsed.ext.toLowerCase()}`;
}

@Injectable()
export default class LocalDocumentService {
  public async parseUploadedFile(uploadedFile: UploadedLocalFile): Promise<ParsedDocumentInput> {
    const fileExtension = getExtension(uploadedFile.originalName);
    if (!SUPPORTED_EXTENSIONS.has(fileExtension)) {
      throw new AppError(
        'unsupported_file_type',
        400,
        'Only txt, md, docx and pdf files are supported',
      );
    }

    if (!uploadedFile.buffer.length) {
      throw new AppError('empty_uploaded_file', 400, 'uploaded file is empty');
    }

    if (uploadedFile.buffer.byteLength > MAX_FILE_SIZE_BYTES) {
      throw new AppError('uploaded_file_too_large', 400, 'uploaded file must be 20MB or smaller');
    }

    const contentHash = createContentHash(uploadedFile.buffer);
    const extractedText = await this.extractText(uploadedFile.buffer, fileExtension);
    if (extractedText.length < MIN_TEXT_CHARS) {
      throw new AppError(
        'uploaded_file_text_too_short',
        400,
        'uploaded file does not contain enough extractable text',
      );
    }

    return {
      source: 'local_file',
      sourceDocId: `local_${contentHash}`,
      title: getTitle(uploadedFile.originalName),
      content: extractedText,
      metadata: {
        fileName: uploadedFile.originalName,
        mimeType: uploadedFile.mimeType,
        fileSize: uploadedFile.buffer.byteLength,
        contentHash,
        storageKey: await this.saveUploadedFile(uploadedFile, contentHash),
      },
    };
  }

  private async extractText(buffer: Buffer, extension: string) {
    if (TEXT_EXTENSIONS.has(extension)) {
      return normalizeExtractedText(buffer.toString('utf8'));
    }

    if (extension === '.docx') {
      const docxTextResult = await mammoth.extractRawText({ buffer });
      return normalizeExtractedText(docxTextResult.value);
    }

    if (extension === '.pdf') {
      const pdfParser = new PDFParse({ data: buffer });
      try {
        const pdfTextResult = await pdfParser.getText();
        return normalizeExtractedText(pdfTextResult.text);
      } finally {
        await pdfParser.destroy();
      }
    }

    throw new AppError('unsupported_file_type', 400, 'Only txt, md, docx and pdf files are supported');
  }

  private async saveUploadedFile(uploadedFile: UploadedLocalFile, contentHash: string) {
    const storageKey = `${contentHash}/${sanitizeFileName(uploadedFile.originalName)}`;
    const targetPath = path.join(UPLOAD_ROOT, storageKey);
    await mkdir(path.dirname(targetPath), { recursive: true });
    await writeFile(targetPath, uploadedFile.buffer);
    return storageKey;
  }
}

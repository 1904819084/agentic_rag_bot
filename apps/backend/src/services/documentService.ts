import { Injectable } from '@gulux/gulux';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import DocumentRepository from '../repositories/documentRepository';
import { AppError } from '../utils/appError';

const UPLOAD_ROOT = path.resolve(process.cwd(), 'storage/uploads');

export type OriginalDocumentFile = {
  buffer: Buffer;
  fileName: string;
  mimeType?: string;
};

function resolveStoragePath(storageKey: string) {
  const storagePath = path.resolve(UPLOAD_ROOT, storageKey);
  if (!storagePath.startsWith(`${UPLOAD_ROOT}${path.sep}`)) {
    throw new AppError('invalid_document_storage_key', 500, 'document storage key is invalid');
  }
  return storagePath;
}

@Injectable()
export default class DocumentService {
  public constructor(private readonly documentRepository: DocumentRepository) {}

  public listDocuments() {
    return this.documentRepository.listDocuments();
  }

  // 获取原始文档文件
  public async getOriginalDocumentFile(documentId: string): Promise<OriginalDocumentFile> {
    const document = await this.documentRepository.getDocumentById(documentId);
    if (!document) {
      throw new AppError('document_not_found', 404, 'document not found');
    }

    if (document.source !== 'local_file' || !document.storageKey) {
      throw new AppError(
        'document_original_not_available',
        404,
        'document original file is not available',
      );
    }

    try {
      return {
        buffer: await readFile(resolveStoragePath(document.storageKey)),
        fileName: document.fileName ?? `${document.title}.txt`,
        mimeType: document.mimeType,
      };
    } catch (error) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('document_original_not_found', 404, 'document original file not found');
    }
  }
}

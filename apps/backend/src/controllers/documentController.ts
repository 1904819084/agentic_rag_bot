import { Inject } from '@gulux/gulux';
import { Body, Controller, Files, Get, Param, Post } from '@gulux/gulux/application-http';
import type { ImportFeishuDocumentRequest } from '@rag/shared';
import { readFile } from 'node:fs/promises';
import DocumentIngestionService from '../services/documentIngestionService';
import DocumentService from '../services/documentService';
import { AppError } from '../utils/appError';

type FormidableFile = {
  filepath?: string;
  path?: string;
  originalFilename?: string | null;
  name?: string | null;
  mimetype?: string | null;
  type?: string | null;
};

type UploadedFiles = Record<string, FormidableFile | FormidableFile[] | undefined> | undefined;

function firstFile(files: UploadedFiles) {
  const file = files?.file;
  return Array.isArray(file) ? file[0] : file;
}

@Controller({ path: '/documents' })
export default class DocumentController {
  @Inject()
  private readonly documentService!: DocumentService;

  @Inject()
  private readonly documentIngestionService!: DocumentIngestionService;

  @Get('')
  public async listDocuments() {
    return {
      items: await this.documentService.listDocuments(),
    };
  }

  @Post('/import/feishu-docx')
  public importFeishuDocxDocument(@Body() importRequest: ImportFeishuDocumentRequest) {
    if (!importRequest?.url || typeof importRequest.url !== 'string') {
      throw new AppError('invalid_feishu_document_url', 400, 'url is required');
    }

    return this.documentIngestionService.importFeishuDocxDocument(importRequest);
  }

  @Post('/import/file')
  public async importLocalFileDocument(@Files() uploadedFiles: UploadedFiles) {
    const uploadedFile = firstFile(uploadedFiles);
    const temporaryFilePath = uploadedFile?.filepath ?? uploadedFile?.path;
    const originalFileName = uploadedFile?.originalFilename ?? uploadedFile?.name;
    if (!uploadedFile || !temporaryFilePath || !originalFileName) {
      throw new AppError('missing_uploaded_file', 400, 'file is required');
    }

    return this.documentIngestionService.importLocalFileDocument({
      originalName: originalFileName,
      mimeType: uploadedFile.mimetype ?? uploadedFile.type ?? undefined,
      buffer: await readFile(temporaryFilePath),
    });
  }

  @Get('/:id')
  public getDocument(@Param('id') id: string) {
    throw new AppError(
      'document_detail_not_implemented',
      501,
      `document detail is not implemented: ${id}`,
    );
  }
}

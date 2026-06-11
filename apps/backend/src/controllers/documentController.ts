import { Inject } from '@gulux/gulux';
import {
  Body,
  Controller,
  Files,
  Get,
  Param,
  Post,
  Req,
  Res,
  type HTTPRequest,
  type HTTPResponse,
} from '@gulux/gulux/application-http';
import type { ImportFeishuDocumentRequest } from '@rag/shared';
import { readFile } from 'node:fs/promises';
import AuthService from '../services/authService';
import DocumentIngestionService from '../services/documentIngestionService';
import DocumentService from '../services/documentService';
import { AppError } from '../utils/appError';
import { getAuthSessionCookieName, readCookie } from '../utils/cookie';

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

  @Inject()
  private readonly authService!: AuthService;

  @Get('')
  public async listDocuments() {
    return {
      items: await this.documentService.listDocuments(),
    };
  }

  @Post('/import/feishu-docx')
  public async importFeishuDocxDocument(
    @Body() importRequest: ImportFeishuDocumentRequest,
    @Req() req: HTTPRequest,
  ) {
    if (!importRequest?.url || typeof importRequest.url !== 'string') {
      throw new AppError('invalid_feishu_document_url', 400, 'url is required');
    }

    const userAccessToken = await this.authService.getFeishuAccessToken(getSessionId(req));
    if (!userAccessToken) {
      throw new AppError('missing_feishu_user_token', 401, 'Please log in with Feishu again');
    }

    return this.documentIngestionService.importFeishuDocxDocument({
      url: importRequest.url,
      userAccessToken,
    });
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

  @Get('/:id/original')
  public async getOriginalDocument(@Param('id') id: string, @Res() response: HTTPResponse) {
    const originalFile = await this.documentService.getOriginalDocumentFile(id);
    response.type = originalFile.mimeType ?? 'application/octet-stream';
    response.set('Content-Disposition', `inline; filename="${encodeURIComponent(originalFile.fileName)}"`);
    response.body = originalFile.buffer;
  }
}

function getSessionId(req: HTTPRequest) {
  const cookieValue = req.cookies.get(getAuthSessionCookieName());
  return typeof cookieValue === 'string'
    ? cookieValue
    : readCookie(req.get('cookie'), getAuthSessionCookieName());
}

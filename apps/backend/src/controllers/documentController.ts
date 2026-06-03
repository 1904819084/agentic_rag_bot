import { Inject } from '@gulux/gulux';
import { Body, Controller, Get, Param, Post } from '@gulux/gulux/application-http';
import type { ImportFeishuDocumentRequest } from '@rag/shared';
import DocumentIngestionService from '../services/documentIngestionService';
import DocumentService from '../services/documentService';
import { AppError } from '../utils/appError';

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
  public importFeishuDocxDocument(@Body() body: ImportFeishuDocumentRequest) {
    if (!body?.url || typeof body.url !== 'string') {
      throw new AppError('invalid_feishu_document_url', 400, 'url is required');
    }

    return this.documentIngestionService.importFeishuDocxDocument(body);
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

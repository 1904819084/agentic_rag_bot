import { Injectable } from '@gulux/gulux';
import type { FeishuDocumentContent, FetchFeishuDocumentContentInput } from '../types';
import { AppError } from '../utils/appError';
import { parseFeishuDocumentUrl } from '../utils/feishuDocumentUrl';
import FeishuClientService from './feishuClientService';

@Injectable()
export default class FeishuDocumentService {
  public constructor(private readonly feishuClientService: FeishuClientService) {}

  // 从飞书文档 URL 提取文档内容
  public async fetchDocumentContent(
    input: string | FetchFeishuDocumentContentInput,
  ): Promise<FeishuDocumentContent> {
    const url = typeof input === 'string' ? input : input.url;
    const userAccessToken =
      typeof input === 'string' ? undefined : input.userAccessToken?.trim() || undefined;
    const parsed = parseFeishuDocumentUrl(url);
    const documentToken =
      parsed.tokenType === 'wiki'
        ? await this.feishuClientService.getDocumentTokenFromWikiNode(
            parsed.token,
            userAccessToken,
          )
        : parsed.token;
    const [metadata, markdown] = await Promise.all([
      this.feishuClientService.getDocumentMetadata(documentToken, userAccessToken),
      this.feishuClientService.getDocumentMarkdownContent(documentToken, userAccessToken),
    ]);
    const title = metadata.title || documentToken;
    const content = markdown.trim();

    if (!content) {
      throw new AppError('empty_feishu_document_content', 422, 'Feishu Document content is empty');
    }

    return {
      sourceDocId: documentToken,
      sourceUrl: parsed.url,
      title,
      content,
    };
  }
}

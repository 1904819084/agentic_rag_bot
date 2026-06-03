import { Injectable } from '@gulux/gulux';
import { env } from '../config/env';
import type { FeishuDocxContent } from '../types';
import { AppError } from '../utils/appError';
import { parseFeishuDocxUrl } from '../utils/feishuDocxUrl';

const FEISHU_DOCX_RAW_CONTENT_PATH = '/open-apis/docx/v1/documents';
const FEISHU_TENANT_ACCESS_TOKEN_URL =
  'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal';

@Injectable()
export default class FeishuDocxService {
  public async fetchDocxContent(url: string): Promise<FeishuDocxContent> {
    const parsed = parseFeishuDocxUrl(url);
    const tenantAccessToken = await this.getTenantAccessToken();
    const [metadata, rawContent] = await Promise.all([
      this.getDocumentMetadata(parsed.docxToken, tenantAccessToken),
      this.getDocumentRawContent(parsed.docxToken, tenantAccessToken),
    ]);
    const title = metadata.title || parsed.docxToken;
    const content = rawContent.trim();

    if (!content) {
      throw new AppError('empty_feishu_docx_content', 422, 'Feishu Docx content is empty');
    }

    return {
      sourceDocId: parsed.docxToken,
      url: parsed.url,
      title,
      content,
    };
  }

  private async getTenantAccessToken() {
    if (!env.feishu.appId || !env.feishu.appSecret) {
      throw new AppError(
        'feishu_app_not_configured',
        500,
        'FEISHU_APP_ID and FEISHU_APP_SECRET are required',
      );
    }

    const response = await fetch(FEISHU_TENANT_ACCESS_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_id: env.feishu.appId,
        app_secret: env.feishu.appSecret,
      }),
    });

    if (!response.ok) {
      throw new AppError(
        'feishu_token_request_failed',
        502,
        `Feishu token request failed: ${response.status}`,
      );
    }

    const body = (await response.json()) as {
      code?: number;
      msg?: string;
      tenant_access_token?: unknown;
    };
    if (body.code !== 0 || typeof body.tenant_access_token !== 'string') {
      throw new AppError(
        'feishu_token_request_failed',
        502,
        body.msg || 'Feishu token response missing tenant_access_token',
      );
    }

    return body.tenant_access_token;
  }

  private async getDocumentMetadata(docxToken: string, tenantAccessToken: string) {
    const response = await fetch(
      `https://open.feishu.cn${FEISHU_DOCX_RAW_CONTENT_PATH}/${docxToken}`,
      {
        headers: { Authorization: `Bearer ${tenantAccessToken}` },
      },
    );

    if (!response.ok) {
      throw new AppError(
        'feishu_docx_metadata_failed',
        502,
        `Feishu Docx metadata request failed: ${response.status}`,
      );
    }

    const body = (await response.json()) as {
      code?: number;
      msg?: string;
      data?: { document?: { title?: unknown } };
    };
    if (body.code !== 0) {
      throw new AppError(
        'feishu_docx_metadata_failed',
        502,
        body.msg || 'Feishu Docx metadata request failed',
      );
    }

    return {
      title: typeof body.data?.document?.title === 'string' ? body.data.document.title : '',
    };
  }

  private async getDocumentRawContent(docxToken: string, tenantAccessToken: string) {
    const response = await fetch(
      `https://open.feishu.cn${FEISHU_DOCX_RAW_CONTENT_PATH}/${docxToken}/raw_content`,
      {
        headers: { Authorization: `Bearer ${tenantAccessToken}` },
      },
    );

    if (!response.ok) {
      throw new AppError(
        'feishu_docx_content_failed',
        502,
        `Feishu Docx content request failed: ${response.status}`,
      );
    }

    const body = (await response.json()) as {
      code?: number;
      msg?: string;
      data?: { content?: unknown; raw_content?: unknown };
    };

    if (body.code !== 0) {
      throw new AppError(
        'feishu_docx_content_failed',
        502,
        body.msg || 'Feishu Docx content request failed',
      );
    }

    const content =
      typeof body.data?.content === 'string' ? body.data.content : body.data?.raw_content;
    if (typeof content !== 'string') {
      throw new AppError(
        'feishu_docx_content_failed',
        502,
        'Feishu Docx content response missing content',
      );
    }

    return content;
  }
}

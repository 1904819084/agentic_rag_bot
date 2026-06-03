import { Injectable } from '@gulux/gulux';
import { env } from '../config/env';
import type { FeishuDocumentContent } from '../types';
import { AppError } from '../utils/appError';
import { parseFeishuDocumentUrl } from '../utils/feishuDocumentUrl';

const FEISHU_DOCX_RAW_CONTENT_PATH = '/open-apis/docx/v1/documents';
const FEISHU_DOCS_MARKDOWN_URL = 'https://open.feishu.cn/open-apis/docs/v1/content';
const FEISHU_WIKI_GET_NODE_URL = 'https://open.feishu.cn/open-apis/wiki/v2/spaces/get_node';
const FEISHU_TENANT_ACCESS_TOKEN_URL =
  'https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal';

@Injectable()
export default class FeishuDocumentService {
  // 从飞书文档 URL 提取文档内容
  public async fetchDocumentContent(url: string): Promise<FeishuDocumentContent> {
    const parsed = parseFeishuDocumentUrl(url);
    const tenantAccessToken = await this.getTenantAccessToken();
    const documentToken =
      parsed.tokenType === 'wiki'
        ? await this.getDocumentTokenFromWikiNode(parsed.token, tenantAccessToken)
        : parsed.token;
    const [metadata, markdown] = await Promise.all([
      this.getDocumentMetadata(documentToken, tenantAccessToken),
      this.getDocumentMarkdownContent(documentToken, tenantAccessToken),
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

  // 获取飞书租户访问令牌
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

  // 从飞书 Wiki节点获取文档 token
  private async getDocumentTokenFromWikiNode(wikiToken: string, tenantAccessToken: string) {
    const url = new URL(FEISHU_WIKI_GET_NODE_URL);
    url.searchParams.set('token', wikiToken);
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${tenantAccessToken}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
    });

    if (!response.ok) {
      const errBody = await response.text().catch(() => '');
      throw new AppError(
        'feishu_wiki_node_failed',
        502,
        `Feishu Wiki node request failed: ${response.status} ${errBody}`,
      );
    }

    const body = (await response.json()) as {
      code?: number;
      msg?: string;
      data?: {
        node?: {
          obj_token?: unknown;
          obj_type?: unknown;
        };
      };
    };
    if (body.code !== 0) {
      throw new AppError(
        'feishu_wiki_node_failed',
        502,
        body.msg || 'Feishu Wiki node request failed',
      );
    }

    const objType =
      typeof body.data?.node?.obj_type === 'string' ? body.data.node.obj_type : '';
    const objToken =
      typeof body.data?.node?.obj_token === 'string' ? body.data.node.obj_token : '';

    if (objType !== 'docx') {
      throw new AppError(
        'unsupported_feishu_wiki_object_type',
        422,
        `Only Wiki nodes backed by docx are supported, got: ${objType || 'unknown'}`,
      );
    }

    if (!objToken) {
      throw new AppError(
        'feishu_wiki_node_missing_docx_token',
        502,
        'Feishu Wiki node response missing docx token',
      );
    }

    return objToken;
  }

  // 获取飞元文档元数据
  private async getDocumentMetadata(documentToken: string, tenantAccessToken: string) {
    const response = await fetch(
      `https://open.feishu.cn${FEISHU_DOCX_RAW_CONTENT_PATH}/${documentToken}`,
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

  // 获取飞书文档 Markdown 内容（docs/v1/content）
  private async getDocumentMarkdownContent(documentToken: string, tenantAccessToken: string) {
    const url = new URL(FEISHU_DOCS_MARKDOWN_URL);
    url.searchParams.set('doc_token', documentToken);
    url.searchParams.set('doc_type', 'docx');
    url.searchParams.set('content_type', 'markdown');
    url.searchParams.set('lang', 'zh');

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${tenantAccessToken}`,
        'Content-Type': 'application/json; charset=utf-8',
      },
    });

    if (!response.ok) {
      throw new AppError(
        'feishu_docx_content_failed',
        502,
        `Feishu Docs markdown request failed: ${response.status}`,
      );
    }

    const body = (await response.json()) as {
      code?: number;
      msg?: string;
      data?: { content?: unknown };
    };

    if (body.code !== 0) {
      throw new AppError(
        'feishu_docx_content_failed',
        502,
        body.msg || 'Feishu Docs markdown request failed',
      );
    }

    const content = body.data?.content;
    if (typeof content !== 'string') {
      throw new AppError(
        'feishu_docx_content_failed',
        502,
        'Feishu Docs markdown response missing content',
      );
    }

    return content;
  }
}

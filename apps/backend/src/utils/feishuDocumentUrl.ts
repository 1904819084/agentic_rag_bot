import type { FeishuDocumentUrlInfo } from '../types';
import { AppError } from '../utils/appError';

const SUPPORTED_HOST_SUFFIXES = ['feishu.cn', 'larksuite.com', 'larkoffice.com'];

function isSupportedFeishuHost(hostname: string) {
  return SUPPORTED_HOST_SUFFIXES.some(
    (suffix) => hostname === suffix || hostname.endsWith(`.${suffix}`),
  );
}

export function parseFeishuDocumentUrl(rawUrl: string): FeishuDocumentUrlInfo {
  const url = rawUrl.trim();

  try {
    const parsed = new URL(url);
    if (!isSupportedFeishuHost(parsed.hostname)) {
      throw new Error('invalid_feishu_host');
    }

    const docxMatch = parsed.pathname.match(/\/docx\/([A-Za-z0-9_-]+)/);
    if (docxMatch?.[1]) {
      return {
        url,
        token: docxMatch[1],
        tokenType: 'docx',
      };
    }

    const wikiMatch = parsed.pathname.match(/\/wiki\/([A-Za-z0-9_-]+)/);
    if (wikiMatch?.[1]) {
      return {
        url,
        token: wikiMatch[1],
        tokenType: 'wiki',
      };
    }

    throw new Error('unsupported_feishu_document_url');
  } catch {
    throw new AppError(
      'invalid_feishu_document_url',
      400,
      'Only Feishu document URLs are supported',
    );
  }
}

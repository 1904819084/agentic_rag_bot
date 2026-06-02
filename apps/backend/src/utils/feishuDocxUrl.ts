import { AppError } from '../utils/appError';
export interface FeishuDocxUrlInfo {
  url: string;
  docxToken: string;
}

// 解析Feishu Docx URL
export function parseFeishuDocxUrl(rawUrl: string): FeishuDocxUrlInfo {
  const url = rawUrl.trim();

  try {
    const parsed = new URL(url);
    const isFeishuHost = parsed.hostname === 'feishu.cn' || parsed.hostname.endsWith('.feishu.cn');
    const match = parsed.pathname.match(/\/docx\/([A-Za-z0-9_-]+)/);

    if (!isFeishuHost || !match?.[1]) {
      throw new Error('invalid_docx_url');
    }

    return {
      url,
      docxToken: match[1],
    };
  } catch {
    throw new AppError('invalid_feishu_docx_url', 400, 'Only Feishu Docx URLs are supported');
  }
}

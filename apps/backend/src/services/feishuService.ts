import { Injectable } from '@gulux/gulux';
import { env } from '../config/env';
import type { FeishuMessageEvent } from '../types';
import FeishuClientService from './feishuClientService';

@Injectable()
export default class FeishuService {
  public constructor(private readonly feishuClientService: FeishuClientService) {}

  public verifyToken(token?: string) {
    return !env.feishu.verificationToken || token === env.feishu.verificationToken;
  }

  public parseMessageEvent(body: unknown): FeishuMessageEvent | null {
    if (!body || typeof body !== 'object') {
      return null;
    }

    const record = body as Record<string, any>;
    const event = record.event ?? record.header?.event ?? record;
    const message = event.message ?? {};
    const sender = event.sender ?? {};
    const content =
      typeof message.content === 'string' ? safeJsonParse(message.content) : message.content;
    const text =
      typeof content?.text === 'string'
        ? content.text
        : typeof message.text === 'string'
          ? message.text
          : undefined;

    if (!text) {
      return null;
    }

    return {
      messageId: message.message_id,
      userId: sender.sender_id?.open_id ?? sender.open_id ?? event.open_id,
      text,
    };
  }

  public async replyMessage({ messageId, text }: { messageId?: string; text: string }) {
    return this.feishuClientService.replyTextMessage({ messageId, text });
  }
}

function safeJsonParse(value: string) {
  try {
    return JSON.parse(value);
  } catch {
    return { text: value };
  }
}

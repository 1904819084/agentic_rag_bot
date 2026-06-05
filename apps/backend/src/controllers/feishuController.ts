import { Inject } from '@gulux/gulux';
import { Body, Controller, Post } from '@gulux/gulux/application-http';
import FeishuService from '../services/feishuService';
import ChatService from '../services/chatService';
import { AppError } from '../utils/appError';

@Controller({ path: '/feishu' })
export default class FeishuController {
  @Inject()
  private readonly feishuService!: FeishuService;

  @Inject()
  private readonly chatService!: ChatService;

  @Post('/events')
  public async handleEvent(@Body() body: unknown) {
    if (body && typeof body === 'object' && 'challenge' in body) {
      return { challenge: String((body as { challenge: unknown }).challenge) };
    }

    const token =
      body && typeof body === 'object'
        ? String((body as Record<string, unknown>).token ?? '')
        : undefined;
    if (!this.feishuService.verifyToken(token)) {
      throw new AppError('invalid_feishu_token', 401, 'invalid feishu verification token');
    }

    const event = this.feishuService.parseMessageEvent(body);
    if (!event?.text) {
      return { ok: true, ignored: true };
    }

    const answer = await this.chatService.ask({
      question: event.text,
      userId: event.userId,
    });

    await this.feishuService.replyMessage({
      messageId: event.messageId,
      text: answer.answer,
    });

    return { ok: true };
  }
}

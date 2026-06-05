import { Inject } from '@gulux/gulux';
import { Body, Controller, Post } from '@gulux/gulux/application-http';
import type { ChatAskRequest } from '@rag/shared';
import ChatService from '../services/chatService';
import { AppError } from '../utils/appError';

@Controller({ path: '/chat' })
export default class ChatController {
  @Inject()
  private readonly chatService!: ChatService;

  @Post('/ask')
  public ask(@Body() body: ChatAskRequest) {
    if (!body?.question || typeof body.question !== 'string') {
      throw new AppError('invalid_question', 400, 'question is required');
    }

    return this.chatService.ask(body);
  }
}

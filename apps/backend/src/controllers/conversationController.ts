import { Inject } from '@gulux/gulux';
import { Body, Controller, Get, Param, Post, Query } from '@gulux/gulux/application-http';
import type { CreateConversationRequest } from '@rag/shared';
import ConversationService from '../services/conversationService';
import { AppError } from '../utils/appError';

@Controller({ path: '/conversations' })
export default class ConversationController {
  @Inject()
  private readonly conversationService!: ConversationService;

  @Get('/')
  public async listConversations(@Query('userId') userId?: string) {
    return {
      items: await this.conversationService.listConversations({ userId }),
    };
  }

  @Post('/')
  public async createConversation(@Body() body: CreateConversationRequest = {}) {
    const conversation = await this.conversationService.createConversation(body);
    if (!conversation) {
      throw new AppError('conversation_create_failed', 500, 'failed to create conversation');
    }

    return { conversation };
  }

  // 列出会话消息
  // 返回会话的所有消息，包括用户问题和助手回答
  @Get('/:id/messages')
  public async listMessages(@Param('id') id: string) {
    if (!id) {
      throw new AppError('invalid_conversation_id', 400, 'conversation id is required');
    }

    const result = await this.conversationService.listMessages(id);
    if (!result) {
      throw new AppError('conversation_not_found', 404, `conversation not found: ${id}`);
    }

    return result;
  }
}

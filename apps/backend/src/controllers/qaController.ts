import { Inject } from '@gulux/gulux';
import { Body, Controller, Get, Post } from '@gulux/gulux/application-http';
import type { AskQuestionRequest } from '@rag/shared';
import QaService from '../services/qaService';
import { AppError } from '../utils/appError';

@Controller({ path: '/qa' })
export default class QaController {
  @Inject()
  private readonly qaService!: QaService;

  @Post('/ask')
  public ask(@Body() body: AskQuestionRequest) {
    if (!body?.question || typeof body.question !== 'string') {
      throw new AppError('invalid_question', 400, 'question is required');
    }

    return this.qaService.ask(body);
  }

  @Get('/logs')
  public async listLogs() {
    return {
      items: await this.qaService.listLogs(),
    };
  }
}

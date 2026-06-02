import { Inject } from '@gulux/gulux';
import { Controller, Get, Post } from '@gulux/gulux/application-http';
import SyncService from '../services/syncService';

@Controller({ path: '/sync' })
export default class SyncController {
  @Inject()
  private readonly syncService!: SyncService;

  @Get('/jobs')
  public async listJobs() {
    return {
      items: await this.syncService.listJobs(),
    };
  }

  @Post('/feishu')
  public triggerFeishuSync() {
    return this.syncService.triggerFeishuSync();
  }
}

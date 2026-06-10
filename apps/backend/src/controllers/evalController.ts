import { Inject } from '@gulux/gulux';
import { Controller, Get, Param, Post } from '@gulux/gulux/application-http';
import EvalReportService from '../services/evalReportService';
import EvalTaskService from '../services/evalTaskService';

@Controller({ path: '/evals' })
export default class EvalController {
  @Inject()
  private readonly evalReportService!: EvalReportService;

  @Inject()
  private readonly evalTaskService!: EvalTaskService;

  @Get('/cases')
  public listCases() {
    return this.evalReportService.listCases();
  }

  @Get('/tasks')
  public listTasks() {
    return this.evalTaskService.listTasks();
  }

  @Post('/task')
  public createTask() {
    return this.evalTaskService.createTask();
  }

  @Get('/tasks/:taskId')
  public getTask(@Param('taskId') taskId: string) {
    return this.evalTaskService.getTask(taskId);
  }

  @Get('/tasks/:taskId/report')
  public getTaskReport(@Param('taskId') taskId: string) {
    return this.evalTaskService.getTaskReport(taskId);
  }
}

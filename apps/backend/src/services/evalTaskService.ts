import { Injectable } from '@gulux/gulux';
import EvalTaskRepository from '../repositories/evalTaskRepository';
import { createId } from '../utils/id';
import { AppError } from '../utils/appError';
import EvalQueueService from './evalQueueService';
import EvalReportService from './evalReportService';

function createTaskId() {
  return createId('eval_task');
}

function now() {
  return new Date().toISOString();
}

@Injectable()
export default class EvalTaskService {
  public constructor(
    private readonly evalTaskRepository: EvalTaskRepository,
    private readonly evalQueueService: EvalQueueService,
    private readonly evalReportService: EvalReportService,
  ) {}

  public async listTasks() {
    return {
      items: await this.evalTaskRepository.listTasks(),
    };
  }

  public async createTask() {
    const createdAt = now();

    const task = await this.evalTaskRepository.createTask({
      id: createTaskId(),
      status: 'queued',
      queuedAt: createdAt,
      createdAt,
      updatedAt: createdAt,
    });

    try {
      const job = await this.evalQueueService.enqueueTask(task.id);
      const taskWithJob = await this.evalTaskRepository.attachQueueJobId(
        task.id,
        job.id ?? task.id,
      );

      return { task: taskWithJob ?? task };
    } catch (error) {
      await this.evalTaskRepository.updateTask(task.id, {
        status: 'failed',
        error: error instanceof Error ? error.message : '评测任务入队失败',
        finishedAt: now(),
        updatedAt: now(),
      });
      throw error;
    }
  }

  public async getTask(taskId: string) {
    const task = await this.evalTaskRepository.getTask(taskId);
    if (!task) {
      throw new AppError('eval_task_not_found', 404, 'eval task not found');
    }

    return { task };
  }

  public async getTaskReport(taskId: string) {
    const { task } = await this.getTask(taskId);
    if (task.status !== 'succeeded') {
      throw new AppError('eval_task_not_succeeded', 409, 'eval task is not succeeded');
    }

    return {
      task,
      report: await this.evalReportService.getReport(task.id),
    };
  }
}

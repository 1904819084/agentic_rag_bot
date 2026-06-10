import { Injectable } from '@gulux/gulux';
import {
  EVAL_TASK_JOB_NAME,
  createEvalQueue,
  createEvalTaskJobOptions,
  type EvalTaskJobData,
} from '../queues/evalQueue';

@Injectable()
export default class EvalQueueService {
  private readonly queue = createEvalQueue();

  public async enqueueTask(taskId: string, jobId = taskId) {
    return this.queue.add(
      EVAL_TASK_JOB_NAME,
      { taskId } satisfies EvalTaskJobData,
      createEvalTaskJobOptions(jobId),
    );
  }
}

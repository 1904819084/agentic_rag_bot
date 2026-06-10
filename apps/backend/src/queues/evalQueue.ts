import { Queue } from 'bullmq';
import { env } from '../config/env';

export const EVAL_QUEUE_NAME = 'agentic-rag-eval';
export const EVAL_TASK_JOB_NAME = 'eval-task';
export type EvalTaskJobName = typeof EVAL_TASK_JOB_NAME;

export type EvalTaskJobData = {
  taskId: string;
};

export function createEvalTaskJobOptions(jobId: string) {
  return {
    jobId,
    attempts: 1,
    removeOnComplete: true,
    removeOnFail: false,
  };
}

export function createEvalQueueConnectionOptions() {
  return {
    host: env.redis.host,
    port: env.redis.port,
    password: env.redis.password,
    maxRetriesPerRequest: null,
  };
}

export function createEvalQueue() {
  return new Queue<EvalTaskJobData, void, EvalTaskJobName>(EVAL_QUEUE_NAME, {
    connection: createEvalQueueConnectionOptions(),
  });
}

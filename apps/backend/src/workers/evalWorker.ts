import { Worker } from 'bullmq';
import { runEndToEndEval } from '../../evals/runEndToEndEval';
import { env } from '../config/env';
import {
  EVAL_QUEUE_NAME,
  EVAL_TASK_JOB_NAME,
  createEvalQueueConnectionOptions,
  createEvalQueue,
  createEvalTaskJobOptions,
  type EvalTaskJobData,
} from '../queues/evalQueue';
import EvalTaskRepository from '../repositories/evalTaskRepository';
import { PostgresRepository } from '../repositories/postgres';

function now() {
  return new Date().toISOString();
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'eval task failed';
}

const evalTaskRepository = new EvalTaskRepository(new PostgresRepository());
const evalQueue = createEvalQueue();

function createRecoveryJobId(taskId: string, index: number) {
  return `${taskId}_requeued_${Date.now()}_${index}`;
}

async function enqueueRecoveryTask(taskId: string, index: number) {
  const recoveryJobId = createRecoveryJobId(taskId, index);
  const job = await evalQueue.add(
    EVAL_TASK_JOB_NAME,
    { taskId } satisfies EvalTaskJobData,
    createEvalTaskJobOptions(recoveryJobId),
  );
  await evalTaskRepository.attachQueueJobId(taskId, String(job.id));
}

async function requeueInterruptedRunningTasks() {
  const requeuedAt = now();
  const interruptedTasks = await evalTaskRepository.requeueRunningTasks({
    queuedAt: requeuedAt,
    updatedAt: requeuedAt,
  });

  for (const [index, task] of interruptedTasks.entries()) {
    await enqueueRecoveryTask(task.id, index);
  }

  if (interruptedTasks.length > 0) {
    console.log(`[eval-worker] requeued ${interruptedTasks.length} interrupted running task(s)`);
  }
}

async function processEvalTask(data: EvalTaskJobData) {
  const startedAt = now();
  const task = await evalTaskRepository.startQueuedTask(data.taskId, {
    startedAt,
    updatedAt: startedAt,
  });
  if (!task) {
    return;
  }

  try {
    const report = await runEndToEndEval(task.id);
    const finishedAt = now();
    await evalTaskRepository.updateTask(task.id, {
      status: 'succeeded',
      reportGeneratedAt: report.generatedAt,
      finishedAt,
      updatedAt: finishedAt,
    });
  } catch (error) {
    const finishedAt = now();
    await evalTaskRepository.updateTask(task.id, {
      status: 'failed',
      error: getErrorMessage(error),
      finishedAt,
      updatedAt: finishedAt,
    });
    throw error;
  }
}

async function startWorker() {
  await requeueInterruptedRunningTasks();

  const worker = new Worker<EvalTaskJobData>(
    EVAL_QUEUE_NAME,
    async (job) => {
      await processEvalTask(job.data);
    },
    {
      connection: createEvalQueueConnectionOptions(),
      concurrency: env.evalQueue.concurrency,
    },
  );

  worker.on('failed', (job, error) => {
    console.error(
      `[eval-worker] job ${job?.id ?? 'unknown'} failed: ${
        error instanceof Error ? (error.stack ?? error.message) : String(error)
      }`,
    );
  });

  worker.on('completed', (job) => {
    console.log(`[eval-worker] job ${job.id} completed`);
  });

  console.log(
    `[eval-worker] started queue=${EVAL_QUEUE_NAME} concurrency=${env.evalQueue.concurrency}`,
  );
}

if (process.argv[1]?.endsWith('evalWorker.ts')) {
  void startWorker().catch((error) => {
    console.error(error instanceof Error ? (error.stack ?? error.message) : error);
    process.exitCode = 1;
  });
}

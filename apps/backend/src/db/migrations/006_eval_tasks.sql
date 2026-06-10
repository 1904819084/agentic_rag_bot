CREATE TABLE IF NOT EXISTS eval_tasks (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL CHECK (status IN ('queued', 'running', 'succeeded', 'failed')),
  queue_job_id TEXT,
  report_generated_at TIMESTAMPTZ,
  error TEXT,
  queued_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE eval_tasks
  ADD COLUMN IF NOT EXISTS queue_job_id TEXT,
  ADD COLUMN IF NOT EXISTS queued_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'eval_tasks_status_check'
      AND conrelid = 'eval_tasks'::regclass
      AND pg_get_constraintdef(oid) LIKE '%pending%'
  ) THEN
    ALTER TABLE eval_tasks DROP CONSTRAINT eval_tasks_status_check;
    ALTER TABLE eval_tasks
      ADD CONSTRAINT eval_tasks_status_check
      CHECK (status IN ('pending', 'queued', 'running', 'succeeded', 'failed'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'eval_tasks_status_check'
      AND conrelid = 'eval_tasks'::regclass
  ) THEN
    ALTER TABLE eval_tasks
      ADD CONSTRAINT eval_tasks_status_check
      CHECK (status IN ('pending', 'queued', 'running', 'succeeded', 'failed'));
  END IF;
END $$;

UPDATE eval_tasks
SET status = 'queued'
WHERE status = 'pending';

ALTER TABLE eval_tasks DROP CONSTRAINT IF EXISTS eval_tasks_status_check;

ALTER TABLE eval_tasks
  ADD CONSTRAINT eval_tasks_status_check
  CHECK (status IN ('queued', 'running', 'succeeded', 'failed'));

CREATE INDEX IF NOT EXISTS idx_eval_tasks_created_at
  ON eval_tasks (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_eval_tasks_status_updated
  ON eval_tasks (status, updated_at DESC);

DROP INDEX IF EXISTS idx_eval_tasks_single_active;

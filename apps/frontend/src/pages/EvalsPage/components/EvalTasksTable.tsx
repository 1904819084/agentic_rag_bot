import type { EvalTask, EvalTaskStatus } from '@rag/shared';
import { Button, Card, Space, Table, Tag, Tooltip, Typography, message } from 'antd';
import { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../../../components/EmptyState';
import { useCreateEvalTask, useEvalTasks } from '../../../hooks/useEvals';
import { formatLocalDateTime } from '../../../utils/dateTime';

const TASK_STATUS_LABEL: Record<EvalTaskStatus, string> = {
  queued: '排队中',
  running: '执行中',
  succeeded: '已完成',
  failed: '失败',
};

const TASK_STATUS_COLOR: Record<EvalTaskStatus, string> = {
  queued: 'default',
  running: 'processing',
  succeeded: 'green',
  failed: 'red',
};

function isTaskActive(task?: EvalTask) {
  return task?.status === 'queued' || task?.status === 'running';
}

export default function EvalTasksTable() {
  const navigate = useNavigate();
  const tasksRequest = useEvalTasks();
  const createEvalTaskRequest = useCreateEvalTask();
  const tasks = useMemo(() => tasksRequest.data?.items ?? [], [tasksRequest.data?.items]);
  const hasActiveTask = useMemo(() => tasks.some(isTaskActive), [tasks]);

  useEffect(() => {
    if (!hasActiveTask) {
      return;
    }

    const timer = window.setInterval(() => {
      void tasksRequest.refreshAsync();
    }, 3000);

    return () => window.clearInterval(timer);
  }, [hasActiveTask, tasksRequest]);

  async function handleCreateEvalTask() {
    const result = await createEvalTaskRequest.runAsync();
    await tasksRequest.refreshAsync();

    if (isTaskActive(result.task)) {
      message.info('评测任务已创建，正在排队执行');
      return;
    }

    if (result.task.status === 'succeeded') {
      message.success('评测任务已完成');
      return;
    }

    if (result.task.status === 'failed') {
      message.error(result.task.error || '评测任务执行失败');
    }
  }

  return (
    <Card
      className="page-card"
      title="评测任务"
      extra={
        <Space size={12}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            共 {tasks.length} 个任务
          </Typography.Text>
          <Button
            type="primary"
            loading={createEvalTaskRequest.loading}
            onClick={handleCreateEvalTask}
          >
            创建评测任务
          </Button>
        </Space>
      }
    >
      <Table<EvalTask>
        rowKey="id"
        loading={tasksRequest.loading}
        dataSource={tasks}
        tableLayout="fixed"
        scroll={{ x: 980 }}
        locale={{
          emptyText: <EmptyState description="暂无评测任务，请先创建一次评测任务" />,
        }}
        columns={[
          {
            title: '创建时间',
            dataIndex: 'createdAt',
            width: 190,
            render: (createdAt) => (
              <Typography.Text strong>{formatLocalDateTime(createdAt)}</Typography.Text>
            ),
          },
          {
            title: '更新时间',
            dataIndex: 'updatedAt',
            width: 190,
            render: (updatedAt) => formatLocalDateTime(updatedAt),
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 110,
            align: 'center',
            render: (status: EvalTaskStatus) => (
              <Tag color={TASK_STATUS_COLOR[status]} bordered={false}>
                {TASK_STATUS_LABEL[status]}
              </Tag>
            ),
          },
          {
            title: '报告生成时间',
            dataIndex: 'reportGeneratedAt',
            ellipsis: true,
            render: (reportGeneratedAt?: string) =>
              reportGeneratedAt ? formatLocalDateTime(reportGeneratedAt) : '-',
          },
          {
            title: '失败原因',
            dataIndex: 'error',
            ellipsis: true,
            render: (error?: string) =>
              error ? (
                <Tooltip title={error}>
                  <Typography.Text type="danger" ellipsis>
                    {error}
                  </Typography.Text>
                </Tooltip>
              ) : (
                '-'
              ),
          },
          {
            title: '操作',
            width: 120,
            fixed: 'right',
            align: 'center',
            render: (_, task) => (
              <Button
                type="link"
                disabled={task.status !== 'succeeded'}
                onClick={() => navigate(`/evals/${encodeURIComponent(task.id)}`)}
              >
                查看详情
              </Button>
            ),
          },
        ]}
      />
    </Card>
  );
}

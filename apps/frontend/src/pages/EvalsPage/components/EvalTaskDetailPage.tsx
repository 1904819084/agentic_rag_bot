import type { EvalFailureReason, RagEvalCaseResult } from '@rag/shared';
import { Button, Card, Space, Table, Tag, Tooltip, Typography } from 'antd';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../../../components/EmptyState';
import { useEvalTaskReport } from '../../../hooks/useEvals';
import { formatLocalDateTime } from '../../../utils/dateTime';
import { FAILURE_COLOR, FAILURE_LABEL, formatPercent, getParentRecallMetric } from '../utils';
import CaseDetailDrawer from './CaseDetailDrawer';
import SummaryCards from './SummaryCards';

export default function EvalTaskDetailPage({ taskId }: { taskId: string }) {
  const navigate = useNavigate();
  const [selectedCase, setSelectedCase] = useState<RagEvalCaseResult>();
  const taskReportRequest = useEvalTaskReport(taskId);
  const report = taskReportRequest.data?.report;

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card
        className="page-card"
        title="评测详情"
        extra={<Button onClick={() => navigate('/evals')}>返回列表</Button>}
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <div>
            <Typography.Text strong>{formatLocalDateTime(report?.generatedAt)}</Typography.Text>
            <Typography.Text type="secondary" style={{ marginLeft: 8 }}>
              {report?.totalCases ?? 0} 个用例
            </Typography.Text>
          </div>
          <SummaryCards report={report} />
        </Space>
      </Card>

      <Card className="page-card" title="用例结果">
        <Table<RagEvalCaseResult>
          rowKey="caseId"
          loading={taskReportRequest.loading}
          dataSource={report?.cases ?? []}
          tableLayout="fixed"
          scroll={{ x: 1320 }}
          locale={{
            emptyText: <EmptyState description="暂无评测结果" />,
          }}
          columns={[
            {
              title: '用例',
              dataIndex: 'caseId',
              width: 110,
              render: (caseId) => <Typography.Text strong>{caseId}</Typography.Text>,
            },
            {
              title: '问题',
              dataIndex: 'question',
              width: 360,
              render: (question) => (
                <Typography.Text ellipsis={{ tooltip: question }}>{question}</Typography.Text>
              ),
            },
            {
              title: '归因',
              dataIndex: 'likelyCause',
              width: 130,
              render: (likelyCause: EvalFailureReason) => (
                <Tag color={FAILURE_COLOR[likelyCause]} bordered={false}>
                  {FAILURE_LABEL[likelyCause] ?? likelyCause}
                </Tag>
              ),
            },
            {
              title: '父块召回率',
              width: 130,
              align: 'center',
              render: (_, caseResult) =>
                formatPercent(getParentRecallMetric(caseResult.metrics).value),
            },
            {
              title: '答案正确性',
              width: 120,
              align: 'center',
              render: (_, caseResult) => formatPercent(caseResult.metrics.answerCorrectness),
            },
            {
              title: '答案忠实性',
              width: 120,
              align: 'center',
              render: (_, caseResult) => formatPercent(caseResult.metrics.answerFaithfulness),
            },
            {
              title: '答案完整性',
              width: 120,
              align: 'center',
              render: (_, caseResult) => formatPercent(caseResult.metrics.answerCompleteness),
            },
            {
              title: '评审原因',
              dataIndex: ['metrics', 'judgeReason'],
              width: 260,
              render: (judgeReason) => (
                <Tooltip title={judgeReason}>
                  <Typography.Text ellipsis>{judgeReason || '-'}</Typography.Text>
                </Tooltip>
              ),
            },
            {
              title: '操作',
              width: 110,
              fixed: 'right',
              render: (_, caseResult) => (
                <Button type="link" onClick={() => setSelectedCase(caseResult)}>
                  查看详情
                </Button>
              ),
            },
          ]}
        />
      </Card>

      <CaseDetailDrawer caseResult={selectedCase} onClose={() => setSelectedCase(undefined)} />
    </Space>
  );
}

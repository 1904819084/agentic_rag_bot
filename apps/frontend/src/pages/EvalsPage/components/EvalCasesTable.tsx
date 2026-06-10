import type { RagEvalCase } from '@rag/shared';
import { Button, Card, Table, Typography } from 'antd';
import { useState } from 'react';
import EmptyState from '../../../components/EmptyState';
import { useEvalCases } from '../../../hooks/useEvals';
import EvalCaseDetailDrawer from './EvalCaseDetailDrawer';

export default function EvalCasesTable() {
  const casesRequest = useEvalCases();
  const cases = casesRequest.data?.items ?? [];
  const [selectedEvalCase, setSelectedEvalCase] = useState<RagEvalCase>();

  return (
    <Card
      className="page-card"
      title="评测数据集"
      extra={
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          共 {cases.length} 条
        </Typography.Text>
      }
    >
      <Table<RagEvalCase>
        rowKey="id"
        loading={casesRequest.loading}
        dataSource={cases}
        tableLayout="fixed"
        scroll={{ x: 820 }}
        locale={{
          emptyText: <EmptyState description="暂无评测数据集" />,
        }}
        columns={[
          {
            title: '用例',
            dataIndex: 'id',
            width: 120,
            render: (caseId) => <Typography.Text strong>{caseId}</Typography.Text>,
          },
          {
            title: '问题',
            dataIndex: 'question',
            width: 560,
            render: (question) => (
              <Typography.Text ellipsis={{ tooltip: question }}>{question}</Typography.Text>
            ),
          },
          {
            title: '操作',
            width: 120,
            fixed: 'right',
            render: (_, evalCase) => (
              <Button type="link" onClick={() => setSelectedEvalCase(evalCase)}>
                查看详情
              </Button>
            ),
          },
        ]}
      />
      <EvalCaseDetailDrawer
        evalCase={selectedEvalCase}
        onClose={() => setSelectedEvalCase(undefined)}
      />
    </Card>
  );
}

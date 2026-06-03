import type { QaLog } from '@rag/shared';
import { Card, Space, Table, Tag, Typography } from 'antd';
import EmptyState from '../../../components/EmptyState';

interface QaLogsTableProps {
  items: QaLog[];
  loading: boolean;
}

export default function QaLogsTable({ items, loading }: QaLogsTableProps) {
  return (
    <Card
      className="page-card"
      title="问答日志"
      extra={
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          共 {items.length} 条
        </Typography.Text>
      }
    >
      <Table<QaLog>
        rowKey="id"
        loading={loading}
        dataSource={items}
        scroll={{ x: 1100 }}
        locale={{
          emptyText: <EmptyState description="暂无问答日志" />,
        }}
        columns={[
          {
            title: '问题',
            dataIndex: 'question',
            render: (value) => (
              <Typography.Paragraph
                ellipsis={{ rows: 2, tooltip: value }}
                style={{ marginBottom: 0 }}
              >
                {value}
              </Typography.Paragraph>
            ),
          },
          {
            title: '渠道',
            dataIndex: 'channel',
            width: 100,
            render: (value) => <Tag bordered={false}>{value}</Tag>,
          },
          {
            title: '用户',
            dataIndex: 'userId',
            width: 160,
            render: (value) => <span className="mono muted-text">{value || '-'}</span>,
          },
          {
            title: '引用',
            dataIndex: 'citations',
            width: 80,
            align: 'right',
            render: (value: QaLog['citations']) => (
              <Space size={4}>
                <span className="mono">{value.length}</span>
              </Space>
            ),
          },
          {
            title: '创建时间',
            dataIndex: 'createdAt',
            width: 180,
            render: (value) => (
              <span className="muted-text" style={{ fontSize: 12 }}>
                {value}
              </span>
            ),
          },
        ]}
      />
    </Card>
  );
}

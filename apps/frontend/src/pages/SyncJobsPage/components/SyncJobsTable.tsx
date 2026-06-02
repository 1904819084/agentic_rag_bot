import { ReloadOutlined, SyncOutlined } from '@ant-design/icons';
import type { SyncJob } from '@rag/shared';
import { Button, Card, Space, Table, Tag, Typography } from 'antd';
import EmptyState from '../../../components/EmptyState';
import StatusTag from '../../../components/StatusTag';
import { SYNC_STATUS_COLOR, SYNC_STATUS_LABEL } from '../../../constants';

interface SyncJobsTableProps {
  items: SyncJob[];
  loading: boolean;
  triggering: boolean;
  onRefresh: () => void;
  onTrigger: () => void;
}

export default function SyncJobsTable({
  items,
  loading,
  triggering,
  onRefresh,
  onTrigger,
}: SyncJobsTableProps) {
  return (
    <Card
      className="page-card"
      title="同步任务"
      extra={
        <Space>
          <Typography.Text type="secondary" style={{ fontSize: 12, marginRight: 8 }}>
            共 {items.length} 个任务
          </Typography.Text>
          <Button icon={<ReloadOutlined />} onClick={onRefresh} loading={loading}>
            刷新
          </Button>
          <Button type="primary" icon={<SyncOutlined />} onClick={onTrigger} loading={triggering}>
            触发飞书同步
          </Button>
        </Space>
      }
    >
      <Table<SyncJob>
        rowKey="id"
        loading={loading}
        dataSource={items}
        scroll={{ x: 1100 }}
        locale={{
          emptyText: <EmptyState description="暂无同步任务，点击右上角按钮触发" />,
        }}
        columns={[
          {
            title: '任务 ID',
            dataIndex: 'id',
            width: 220,
            render: (value) => <span className="mono muted-text">{value}</span>,
          },
          {
            title: '类型',
            dataIndex: 'type',
            width: 180,
            render: (value) => <Tag bordered={false}>{value}</Tag>,
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 120,
            render: (value: string) => (
              <StatusTag value={value} colorMap={SYNC_STATUS_COLOR} labelMap={SYNC_STATUS_LABEL} />
            ),
          },
          {
            title: '文档数',
            dataIndex: 'documentCount',
            width: 100,
            align: 'right',
            render: (value) => <span className="mono">{value ?? '-'}</span>,
          },
          {
            title: 'Chunk 数',
            dataIndex: 'chunkCount',
            width: 100,
            align: 'right',
            render: (value) => <span className="mono">{value ?? '-'}</span>,
          },
          {
            title: '消息',
            dataIndex: 'message',
            ellipsis: true,
            render: (value) =>
              value ? (
                <Typography.Text type="secondary" style={{ fontSize: 13 }}>
                  {value}
                </Typography.Text>
              ) : (
                <span className="muted-text">-</span>
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

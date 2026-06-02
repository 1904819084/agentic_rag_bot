import type { KnowledgeDocument } from '@rag/shared';
import { Button, Card, Space, Table, Tag, Typography } from 'antd';
import EmptyState from '../../../components/EmptyState';
import StatusTag from '../../../components/StatusTag';
import { DOCUMENT_STATUS_COLOR, DOCUMENT_STATUS_LABEL } from '../../../constants';

interface DocumentsTableProps {
  items: KnowledgeDocument[];
  loading: boolean;
  onRefresh: () => void;
}

export default function DocumentsTable({ items, loading, onRefresh }: DocumentsTableProps) {
  return (
    <Card
      className="page-card"
      title="知识文档"
      extra={
        <Space size={12}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            共 {items.length} 篇
          </Typography.Text>
          <Button onClick={onRefresh} loading={loading}>
            刷新
          </Button>
        </Space>
      }
    >
      <Table<KnowledgeDocument>
        rowKey="id"
        loading={loading}
        dataSource={items}
        scroll={{ x: 1200 }}
        locale={{
          emptyText: <EmptyState description="暂无文档，从上方导入飞书 Docx 开始" />,
        }}
        columns={[
          {
            title: '标题',
            dataIndex: 'title',
            render: (text, record) =>
              record.url ? (
                <a href={record.url} target="_blank" rel="noreferrer">
                  {text}
                </a>
              ) : (
                text
              ),
          },
          {
            title: '来源',
            dataIndex: 'source',
            width: 120,
            render: (value) => <Tag bordered={false}>{value}</Tag>,
          },
          {
            title: 'Docx Token',
            dataIndex: 'sourceDocId',
            width: 200,
            ellipsis: true,
            render: (value) => <span className="mono">{value}</span>,
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 110,
            render: (value: string) => (
              <StatusTag
                value={value}
                colorMap={DOCUMENT_STATUS_COLOR}
                labelMap={DOCUMENT_STATUS_LABEL}
              />
            ),
          },
          {
            title: 'Parent',
            dataIndex: 'parentChunkCount',
            width: 100,
            align: 'right',
            render: (value) => <span className="mono">{value ?? '-'}</span>,
          },
          {
            title: 'Child',
            dataIndex: 'childChunkCount',
            width: 100,
            align: 'right',
            render: (value) => <span className="mono">{value ?? '-'}</span>,
          },
          {
            title: '更新时间',
            dataIndex: 'updatedAt',
            width: 180,
            render: (value) => (
              <span className="muted-text" style={{ fontSize: 12 }}>
                {value || '-'}
              </span>
            ),
          },
          {
            title: '同步时间',
            dataIndex: 'syncedAt',
            width: 180,
            render: (value) => (
              <span className="muted-text" style={{ fontSize: 12 }}>
                {value || '-'}
              </span>
            ),
          },
        ]}
      />
    </Card>
  );
}

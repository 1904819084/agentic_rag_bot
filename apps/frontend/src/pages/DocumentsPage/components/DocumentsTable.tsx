import type { Document } from '@rag/shared';
import type { ReactNode } from 'react';
import { Card, Space, Table, Tag, Tooltip, Typography } from 'antd';
import EmptyState from '../../../components/EmptyState';
import StatusTag from '../../../components/StatusTag';
import { DOCUMENT_STATUS_COLOR, DOCUMENT_STATUS_LABEL } from '../../../constants';
import { formatLocalDateTime } from '../../../utils/dateTime';

interface DocumentsTableProps {
  documents: Document[];
  loading: boolean;
  extra?: ReactNode;
}

const SOURCE_LABEL: Record<Document['source'], string> = {
  feishu: '飞书',
  local_file: '本地文件',
};

function formatFileSize(size?: number) {
  if (!size) {
    return '-';
  }

  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }

  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

function EllipsisText({
  children,
  className,
}: {
  children?: string;
  className?: string;
}) {
  if (!children) {
    return <span>-</span>;
  }

  return (
    <Typography.Text className={className} ellipsis={{ tooltip: children }}>
      {children}
    </Typography.Text>
  );
}

export default function DocumentsTable({ documents, loading, extra }: DocumentsTableProps) {
  return (
    <Card
      className="page-card"
      title="知识文档"
      extra={
        <Space size={12}>
          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
            共 {documents.length} 篇
          </Typography.Text>
          {extra}
        </Space>
      }
    >
      <Table<Document>
        rowKey="id"
        loading={loading}
        dataSource={documents}
        tableLayout="fixed"
        scroll={{ x: 1320 }}
        locale={{
          emptyText: <EmptyState description="暂无文档，从上方导入飞书文档开始" />,
        }}
        columns={[
          {
            title: '标题',
            dataIndex: 'title',
            width: 280,
            render: (documentTitle, document) =>
              document.sourceUrl ? (
                <Tooltip title={documentTitle}>
                  <a className="table-ellipsis-link" href={document.sourceUrl} target="_blank" rel="noreferrer">
                    {documentTitle}
                  </a>
                </Tooltip>
              ) : (
                <EllipsisText>{documentTitle}</EllipsisText>
              ),
          },
          {
            title: '来源',
            dataIndex: 'source',
            width: 120,
            render: (documentSource: Document['source']) => (
              <Tag bordered={false}>{SOURCE_LABEL[documentSource] ?? documentSource}</Tag>
            ),
          },
          {
            title: '来源标识',
            dataIndex: 'sourceDocId',
            width: 200,
            render: (sourceDocId) => <EllipsisText className="mono">{sourceDocId}</EllipsisText>,
          },
          {
            title: '文件',
            dataIndex: 'fileName',
            width: 240,
            render: (fileName, document) =>
              fileName ? (
                <Space direction="vertical" size={0} style={{ width: '100%' }}>
                  <EllipsisText>{fileName}</EllipsisText>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {formatFileSize(document.fileSize)}
                  </Typography.Text>
                </Space>
              ) : (
                '-'
              ),
          },
          {
            title: '状态',
            dataIndex: 'status',
            width: 150,
            render: (documentStatus: string) => (
              <StatusTag
                value={documentStatus}
                colorMap={DOCUMENT_STATUS_COLOR}
                labelMap={DOCUMENT_STATUS_LABEL}
              />
            ),
          },
          {
            title: 'Parent',
            dataIndex: 'parentChunkCount',
            width: 80,
            align: 'right',
            render: (parentChunkCount) => <span className="mono">{parentChunkCount ?? '-'}</span>,
          },
          {
            title: 'Child',
            dataIndex: 'childChunkCount',
            width: 80,
            align: 'right',
            render: (childChunkCount) => <span className="mono">{childChunkCount ?? '-'}</span>,
          },
          {
            title: '更新时间',
            dataIndex: 'updatedAt',
            width: 170,
            render: (updatedAt) => (
              <span className="muted-text" style={{ fontSize: 12 }}>
                {formatLocalDateTime(updatedAt)}
              </span>
            ),
          },
          {
            title: '创建时间',
            dataIndex: 'createdAt',
            width: 170,
            render: (createdAt) => (
              <span className="muted-text" style={{ fontSize: 12 }}>
                {formatLocalDateTime(createdAt)}
              </span>
            ),
          },
        ]}
      />
    </Card>
  );
}

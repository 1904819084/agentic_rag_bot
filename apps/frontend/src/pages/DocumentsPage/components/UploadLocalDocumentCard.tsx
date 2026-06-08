import { InboxOutlined } from '@ant-design/icons';
import { Card, Typography, Upload, type UploadProps } from 'antd';

const ACCEPTED_FILE_TYPES = '.txt,.md,.markdown,.docx,.pdf,.html,.htm,.csv,.xlsx,.xml,.json';
const MAX_FILE_SIZE_MB = 20;

interface UploadLocalDocumentCardProps {
  loading: boolean;
  onUpload: (documentFile: File) => Promise<unknown>;
}

export default function UploadLocalDocumentCard({
  loading,
  onUpload,
}: UploadLocalDocumentCardProps) {
  const uploadProps: UploadProps = {
    name: 'file',
    accept: ACCEPTED_FILE_TYPES,
    maxCount: 1,
    showUploadList: false,
    disabled: loading,
    beforeUpload: async (documentFile) => {
      // Keep the first version synchronous and bounded; larger files should move to async jobs.
      if (documentFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        throw new Error(`文件不能超过 ${MAX_FILE_SIZE_MB}MB`);
      }

      await onUpload(documentFile);
      return Upload.LIST_IGNORE;
    },
  };

  return (
    <Card
      className="page-card"
      title="上传本地文档"
      extra={
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          支持 TXT / Markdown / DOCX / PDF / HTML / CSV / XLSX，最大 {MAX_FILE_SIZE_MB}MB
        </Typography.Text>
      }
    >
      <Upload.Dragger {...uploadProps}>
        <p className="ant-upload-drag-icon">
          <InboxOutlined />
        </p>
        <Typography.Text strong>{loading ? '正在解析并索引...' : '拖拽文件到这里或点击上传'}</Typography.Text>
      </Upload.Dragger>
    </Card>
  );
}

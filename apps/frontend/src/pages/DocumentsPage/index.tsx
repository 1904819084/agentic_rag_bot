import { Button, Space } from 'antd';
import { useState } from 'react';
import {
  useDocuments,
  useImportFeishuDocxDocument,
  useImportLocalFileDocument,
} from '../../hooks/useDocuments';
import DocumentsTable from './components/DocumentsTable';
import ImportDocumentModal from './components/ImportDocumentModal';

export default function DocumentsPage() {
  const [importModalOpen, setImportModalOpen] = useState(false);
  const documentsRequest = useDocuments();
  const importRequest = useImportFeishuDocxDocument(documentsRequest.refresh);
  const uploadRequest = useImportLocalFileDocument(documentsRequest.refresh);
  const documents = documentsRequest.data?.items ?? [];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <DocumentsTable
        documents={documents}
        loading={documentsRequest.loading}
        extra={
          <Button type="primary" onClick={() => setImportModalOpen(true)}>
            导入文档
          </Button>
        }
      />
      <ImportDocumentModal
        open={importModalOpen}
        feishuLoading={importRequest.loading}
        localFileLoading={uploadRequest.loading}
        onClose={() => setImportModalOpen(false)}
        onImportFeishu={(url) => importRequest.runAsync({ url })}
        onUploadLocalFile={(documentFile) => uploadRequest.runAsync(documentFile)}
      />
    </Space>
  );
}

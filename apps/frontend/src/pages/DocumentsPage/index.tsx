import { Space } from 'antd';
import { useDocuments, useImportFeishuDocxDocument } from '../../hooks/useDocuments';
import DocumentsTable from './components/DocumentsTable';
import ImportDocumentCard from './components/ImportDocumentCard';

export default function DocumentsPage() {
  const documentsRequest = useDocuments();
  const importRequest = useImportFeishuDocxDocument(documentsRequest.refresh);
  const items = documentsRequest.data?.items ?? [];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <ImportDocumentCard
        loading={importRequest.loading}
        onSubmit={(url) => importRequest.runAsync({ url })}
      />
      <DocumentsTable
        items={items}
        loading={documentsRequest.loading}
        onRefresh={documentsRequest.refresh}
      />
    </Space>
  );
}

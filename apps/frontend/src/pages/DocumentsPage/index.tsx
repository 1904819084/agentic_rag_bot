import { Space } from 'antd';
import {
  useDocuments,
  useImportFeishuDocxDocument,
  useImportLocalFileDocument,
} from '../../hooks/useDocuments';
import DocumentsTable from './components/DocumentsTable';
import ImportDocumentCard from './components/ImportDocumentCard';
import UploadLocalDocumentCard from './components/UploadLocalDocumentCard';

export default function DocumentsPage() {
  const documentsRequest = useDocuments();
  const importRequest = useImportFeishuDocxDocument(documentsRequest.refresh);
  const uploadRequest = useImportLocalFileDocument(documentsRequest.refresh);
  const documents = documentsRequest.data?.items ?? [];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <ImportDocumentCard
        loading={importRequest.loading}
        onSubmit={(url) => importRequest.runAsync({ url })}
      />
      <UploadLocalDocumentCard
        loading={uploadRequest.loading}
        onUpload={(documentFile) => uploadRequest.runAsync(documentFile)}
      />
      <DocumentsTable
        documents={documents}
        loading={documentsRequest.loading}
        onRefresh={documentsRequest.refresh}
      />
    </Space>
  );
}

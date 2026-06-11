import { InboxOutlined, LinkOutlined, UploadOutlined } from '@ant-design/icons';
import { Button, Form, Input, Modal, Tabs, Typography, Upload, type UploadProps } from 'antd';
import { useState } from 'react';

const ACCEPTED_FILE_TYPES = '.txt,.md,.markdown,.docx,.pdf,.html,.htm,.csv,.xlsx,.xml,.json';
const MAX_FILE_SIZE_MB = 20;

interface ImportDocumentModalProps {
  open: boolean;
  feishuLoading: boolean;
  localFileLoading: boolean;
  onClose: () => void;
  onImportFeishu: (url: string) => Promise<unknown>;
  onUploadLocalFile: (documentFile: File) => Promise<unknown>;
}

interface FeishuFormValues {
  url: string;
}

export default function ImportDocumentModal({
  open,
  feishuLoading,
  localFileLoading,
  onClose,
  onImportFeishu,
  onUploadLocalFile,
}: ImportDocumentModalProps) {
  const [form] = Form.useForm<FeishuFormValues>();
  const [activeTab, setActiveTab] = useState('local');

  async function handleFeishuFinish(values: FeishuFormValues) {
    await onImportFeishu(values.url.trim());
    form.resetFields();
    onClose();
  }

  const uploadProps: UploadProps = {
    name: 'file',
    accept: ACCEPTED_FILE_TYPES,
    maxCount: 1,
    showUploadList: false,
    disabled: localFileLoading,
    beforeUpload: async (documentFile) => {
      if (documentFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        throw new Error(`文件不能超过 ${MAX_FILE_SIZE_MB}MB`);
      }

      await onUploadLocalFile(documentFile);
      onClose();
      return Upload.LIST_IGNORE;
    },
  };

  return (
    <Modal
      title="导入文档"
      open={open}
      onCancel={onClose}
      footer={null}
      width={720}
      destroyOnHidden
    >
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'local',
            label: '本地上传',
            icon: <UploadOutlined />,
            children: (
              <div className="document-import-panel">
                <Typography.Text type="secondary">
                  支持 TXT / Markdown / DOCX / PDF / HTML / CSV / XLSX / XML / JSON，最大 {MAX_FILE_SIZE_MB}MB
                </Typography.Text>
                <Upload.Dragger {...uploadProps}>
                  <p className="ant-upload-drag-icon">
                    <InboxOutlined />
                  </p>
                  <Typography.Text strong>
                    {localFileLoading ? '正在解析并索引...' : '拖拽文件到这里或点击上传'}
                  </Typography.Text>
                </Upload.Dragger>
              </div>
            ),
          },
          {
            key: 'feishu',
            label: '飞书链接',
            icon: <LinkOutlined />,
            children: (
              <Form form={form} layout="vertical" onFinish={handleFeishuFinish}>
                <Form.Item
                  name="url"
                  label="飞书文档链接"
                  rules={[{ required: true, message: '请输入飞书文档链接' }]}
                >
                  <Input size="large" placeholder="https://xxx.feishu.cn/wiki/... 或 /docx/..." allowClear />
                </Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={feishuLoading}
                  disabled={feishuLoading}
                >
                  导入并索引
                </Button>
              </Form>
            ),
          },
        ]}
      />
    </Modal>
  );
}

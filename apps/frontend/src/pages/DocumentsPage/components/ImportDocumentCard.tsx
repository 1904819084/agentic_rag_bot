import { Button, Card, Form, Input, Typography } from 'antd';

interface ImportDocumentCardProps {
  loading: boolean;
  onSubmit: (url: string) => Promise<unknown>;
}

interface UploadFormValues {
  url: string;
}

export default function ImportDocumentCard({ loading, onSubmit }: ImportDocumentCardProps) {
  const [form] = Form.useForm<UploadFormValues>();

  async function handleFinish(values: UploadFormValues) {
    await onSubmit(values.url.trim());
    form.resetFields();
  }

  return (
    <Card
      className="page-card"
      title="导入飞书云文档"
      extra={
        <Typography.Text type="secondary" style={{ fontSize: 12 }}>
          粘贴 Docx 链接，系统将自动解析并索引
        </Typography.Text>
      }
    >
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Form.Item
          name="url"
          label="飞书 Docx 链接"
          rules={[{ required: true, message: '请输入飞书 Docx 链接' }]}
        >
          <Input size="large" placeholder="https://xxx.feishu.cn/docx/..." allowClear />
        </Form.Item>
        <Button type="primary" htmlType="submit" loading={loading} disabled={loading}>
          导入并索引
        </Button>
      </Form>
    </Card>
  );
}

import { SendOutlined } from '@ant-design/icons';
import { Button, Form, Input } from 'antd';
import styles from '../index.module.less';

interface ChatInputProps {
  loading: boolean;
  onAsk: (question: string) => Promise<void>;
}

interface ChatFormValues {
  question: string;
}

export default function ChatInput({ loading, onAsk }: ChatInputProps) {
  const [form] = Form.useForm<ChatFormValues>();

  async function handleFinish(values: ChatFormValues) {
    const question = values.question.trim();
    if (!question) {
      return;
    }

    form.resetFields();
    await onAsk(question);
  }

  return (
    <Form form={form} className={styles.input} onFinish={handleFinish}>
      <Form.Item
        name="question"
        rules={[{ required: true, message: '请输入问题' }]}
        style={{ marginBottom: 8 }}
      >
        <Input.TextArea
          rows={3}
          placeholder="例如：当时为什么没有采用方案 B？"
          disabled={loading}
          autoSize={{ minRows: 3, maxRows: 6 }}
          onPressEnter={(event) => {
            if (!event.shiftKey) {
              event.preventDefault();
              form.submit();
            }
          }}
        />
      </Form.Item>
      <div className={styles.inputRow}>
        <div className={styles.inputHint}>Enter 发送 · Shift + Enter 换行</div>
        <Button type="primary" htmlType="submit" icon={<SendOutlined />} loading={loading}>
          发送
        </Button>
      </div>
    </Form>
  );
}

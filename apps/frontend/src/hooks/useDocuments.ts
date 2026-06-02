import useRequest from 'ahooks/es/useRequest';
import { message } from 'antd';
import { importFeishuDocxDocument, listDocuments } from '../services/documentService';

export function useDocuments() {
  return useRequest(listDocuments, {
    onError: (error) => {
      message.error(error.message || '加载文档失败');
    },
  });
}

export function useImportFeishuDocxDocument(onSuccess?: () => void) {
  return useRequest(importFeishuDocxDocument, {
    manual: true,
    onSuccess: () => {
      message.success('飞书文档已导入并进入索引');
      onSuccess?.();
    },
    onError: (error) => {
      message.error(error.message || '上传文档失败');
    },
  });
}

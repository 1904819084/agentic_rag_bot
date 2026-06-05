// =============================================
// 业务常量集中定义（非 JSX 的纯数据）
// =============================================

/** 默认问答提交用户 ID（开发期） */
export const DEFAULT_QA_USER_ID = 'dev-user';

/** 知识文档状态 → Antd Tag color */
export const DOCUMENT_STATUS_COLOR: Record<string, string> = {
  success: 'success',
  deleted: 'default',
  failed: 'error',
};

/** 知识文档状态 → 中文标签 */
export const DOCUMENT_STATUS_LABEL: Record<string, string> = {
  success: '文档导入知识库成功',
  deleted: '文档已从知识库删除',
  failed: '文档导入知识库失败',
};

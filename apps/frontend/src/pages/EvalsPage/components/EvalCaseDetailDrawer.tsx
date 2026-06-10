import type { RagEvalCase } from '@rag/shared';
import { Drawer, Typography } from 'antd';
import TextList from './TextList';
import styles from '../index.module.less';

export default function EvalCaseDetailDrawer({
  evalCase,
  onClose,
}: {
  evalCase?: RagEvalCase;
  onClose: () => void;
}) {
  return (
    <Drawer
      title={evalCase?.id ?? '用例详情'}
      open={Boolean(evalCase)}
      onClose={onClose}
      width={720}
      destroyOnClose
    >
      {evalCase ? (
        <>
          <div className={styles.detailSection}>
            <div className={styles.detailTitle}>问题</div>
            <Typography.Paragraph>{evalCase.question}</Typography.Paragraph>
          </div>

          <div className={styles.detailSection}>
            <div className={styles.detailTitle}>期望答案要点</div>
            <TextList items={evalCase.expectedAnswerPoints} />
          </div>

          <div className={styles.detailSection}>
            <div className={styles.detailTitle}>禁止说法</div>
            <TextList items={evalCase.forbiddenClaims} />
          </div>

          <div className={styles.detailSection}>
            <div className={styles.detailTitle}>期望父块 ID</div>
            <TextList items={evalCase.expectedParentChunkIds} />
          </div>
        </>
      ) : null}
    </Drawer>
  );
}

import { Tabs } from 'antd';
import { useParams } from 'react-router-dom';
import EvalCasesTable from './components/EvalCasesTable';
import EvalTaskDetailPage from './components/EvalTaskDetailPage';
import EvalTasksTable from './components/EvalTasksTable';
import styles from './index.module.less';

function EvalTasksPage() {
  return (
    <div className={styles.layout}>
      <Tabs
        items={[
          {
            key: 'tasks',
            label: '评测任务',
            children: <EvalTasksTable />,
          },
          {
            key: 'cases',
            label: '评测数据集',
            children: <EvalCasesTable />,
          },
        ]}
      />
    </div>
  );
}

export default function EvalsPage() {
  const { taskId } = useParams();

  return taskId ? <EvalTaskDetailPage taskId={taskId} /> : <EvalTasksPage />;
}

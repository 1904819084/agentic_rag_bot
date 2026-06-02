import { useSyncJobs, useTriggerFeishuSync } from '../../hooks/useSyncJobs';
import SyncJobsTable from './components/SyncJobsTable';

export default function SyncJobsPage() {
  const syncJobsRequest = useSyncJobs();
  const triggerRequest = useTriggerFeishuSync(syncJobsRequest.refresh);
  const items = syncJobsRequest.data?.items ?? [];

  return (
    <SyncJobsTable
      items={items}
      loading={syncJobsRequest.loading}
      triggering={triggerRequest.loading}
      onRefresh={syncJobsRequest.refresh}
      onTrigger={triggerRequest.run}
    />
  );
}

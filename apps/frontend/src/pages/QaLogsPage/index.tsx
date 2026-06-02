import { useQaLogs } from '../../hooks/useQaLogs';
import QaLogsTable from './components/QaLogsTable';

export default function QaLogsPage() {
  const qaLogsRequest = useQaLogs();
  return <QaLogsTable items={qaLogsRequest.data?.items ?? []} loading={qaLogsRequest.loading} />;
}

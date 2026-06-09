import dayjs from 'dayjs';

const DISPLAY_TIME_FORMAT = 'YYYY-MM-DD HH:mm:ss';
const REPORT_DIR_TIME_FORMAT = 'YYYY-MM-DD_HH-mm-ss';

export function createEvalGeneratedAt() {
  return dayjs().format(DISPLAY_TIME_FORMAT);
}

export function formatEvalDisplayTime(value: string) {
  return dayjs(value).format(DISPLAY_TIME_FORMAT);
}

export function createEvalReportDirName(generatedAt: string) {
  return dayjs(generatedAt).format(REPORT_DIR_TIME_FORMAT);
}

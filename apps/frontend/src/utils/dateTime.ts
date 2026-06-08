import dayjs from 'dayjs';

export function formatLocalDateTime(value?: string) {
  if (!value) {
    return '-';
  }

  const date = dayjs(value);
  if (!date.isValid()) {
    return value;
  }

  return date.format('YYYY-MM-DD HH:mm');
}

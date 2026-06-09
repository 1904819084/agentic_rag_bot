export function clampRatio(value: unknown) {
  const ratio = Number(value);
  if (!Number.isFinite(ratio)) {
    return 0;
  }

  return Math.max(0, Math.min(1, ratio));
}

export function normalizeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === 'string')
    : [];
}

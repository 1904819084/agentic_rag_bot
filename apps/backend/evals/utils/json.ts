export function parseJsonObject<T>(text: string): Partial<T> | null {
  try {
    const parsed = JSON.parse(text) as Partial<T>;
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

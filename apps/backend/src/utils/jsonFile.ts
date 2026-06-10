import { readFile } from 'node:fs/promises';

export async function readJsonFile<T>(filePath: string) {
  return JSON.parse(await readFile(filePath, 'utf8')) as T;
}

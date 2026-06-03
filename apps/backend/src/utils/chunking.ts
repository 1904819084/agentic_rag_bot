import type { ChildChunk, ChunkPlainTextInput, ParentChunk } from '../types';

const DEFAULT_CHILD_MAX_CHARS = 1200;
const DEFAULT_CHILD_OVERLAP_CHARS = 160;

function normalizeText(content: string) {
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

function createIdPart(value: string) {
  return (
    value
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'section'
  );
}

// 按标题分割为父块内容
function splitIntoParentContents(content: string) {
  const lines = normalizeText(content).split('\n');
  const parents: string[] = [];
  let buffer: string[] = [];

  function flush() {
    const text = buffer.join('\n').trim();
    if (text) {
      parents.push(text);
    }
    buffer = [];
  }

  for (const line of lines) {
    const heading = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (heading) {
      flush();
    }
    buffer.push(line);
  }

  flush();

  if (!parents.length && content.trim()) {
    return [normalizeText(content)];
  }

  return parents;
}

// 按段落分割为子块内容
function splitIntoChildContents(content: string, maxChars: number, overlapChars: number) {
  if (content.length <= maxChars) {
    return [content];
  }

  const chunks: string[] = [];
  let start = 0;

  while (start < content.length) {
    const hardEnd = Math.min(start + maxChars, content.length);
    const slice = content.slice(start, hardEnd);
    const sentenceBreak = Math.max(
      slice.lastIndexOf('\n\n'),
      slice.lastIndexOf('。'),
      slice.lastIndexOf('. '),
    );
    const end = sentenceBreak > maxChars * 0.45 ? start + sentenceBreak + 1 : hardEnd;
    const chunk = content.slice(start, end).trim();

    if (chunk) {
      chunks.push(chunk);
    }

    if (end >= content.length) {
      break;
    }

    start = Math.max(end - overlapChars, start + 1);
  }

  return chunks;
}

// 把文档分割为父块和子块
export function chunkPlainText(input: ChunkPlainTextInput) {
  const childMaxChars = input.childMaxChars ?? DEFAULT_CHILD_MAX_CHARS;
  const childOverlapChars = input.childOverlapChars ?? DEFAULT_CHILD_OVERLAP_CHARS;
  const parentContents = splitIntoParentContents(input.content);
  const parents: ParentChunk[] = [];
  const children: ChildChunk[] = [];

  parentContents.forEach((parentContent, parentIndex) => {
    const parentId = `${input.docId}_p_${parentIndex}_${createIdPart(parentContent)}`;
    const parent: ParentChunk = {
      id: parentId,
      docId: input.docId,
      content: parentContent,
      createdAt: new Date().toISOString(),
    };
    parents.push(parent);

    splitIntoChildContents(parentContent, childMaxChars, childOverlapChars).forEach(
      (childContent, childIndex) => {
        children.push({
          id: `${parentId}_c_${childIndex}`,
          parentId,
          docId: input.docId,
          content: childContent,
        });
      },
    );
  });

  return { parents, children };
}

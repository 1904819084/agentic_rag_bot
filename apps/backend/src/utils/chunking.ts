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

function splitIntoSections(title: string, content: string) {
  const lines = normalizeText(content).split('\n');
  const sections: Array<{ title: string; sectionPath: string[]; content: string }> = [];
  let currentTitle = title;
  let currentPath = [title];
  let buffer: string[] = [];

  function flush() {
    const text = buffer.join('\n').trim();
    if (text) {
      sections.push({
        title: currentTitle,
        sectionPath: currentPath,
        content: text,
      });
    }
    buffer = [];
  }

  for (const line of lines) {
    const heading = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (heading) {
      flush();
      currentTitle = heading[2].trim();
      currentPath = [currentTitle];
      continue;
    }
    buffer.push(line);
  }

  flush();

  if (!sections.length && content.trim()) {
    return [{ title, sectionPath: [title], content: normalizeText(content) }];
  }

  return sections;
}

function splitLongText(content: string, maxChars: number, overlapChars: number) {
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

export function chunkPlainText(input: ChunkPlainTextInput) {
  const childMaxChars = input.childMaxChars ?? DEFAULT_CHILD_MAX_CHARS;
  const childOverlapChars = input.childOverlapChars ?? DEFAULT_CHILD_OVERLAP_CHARS;
  const sections = splitIntoSections(input.title, input.content);
  const parents: ParentChunk[] = [];
  const children: ChildChunk[] = [];

  sections.forEach((section, sectionIndex) => {
    const parentId = `${input.docId}_p_${sectionIndex}_${createIdPart(section.title)}`;
    const parent: ParentChunk = {
      id: parentId,
      docId: input.docId,
      title: section.title,
      sectionPath: section.sectionPath,
      content: section.content,
    };
    parents.push(parent);

    splitLongText(section.content, childMaxChars, childOverlapChars).forEach(
      (childContent, childIndex) => {
        children.push({
          id: `${parentId}_c_${childIndex}`,
          parentId,
          docId: input.docId,
          title: section.title,
          sectionPath: section.sectionPath,
          content: childContent,
          contentForEmbedding: [
            `文档：${input.title}`,
            `章节：${section.sectionPath.join(' > ')}`,
            childContent,
          ].join('\n'),
        });
      },
    );
  });

  return { parents, children };
}

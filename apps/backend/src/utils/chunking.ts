import type { ChildChunk, ChunkPlainTextInput, ParentChunk } from '../types';

const DEFAULT_CHILD_MAX_CHARS = 1200;
const DEFAULT_CHILD_OVERLAP_CHARS = 160;

// Markdown章节
type MarkdownSection = {
  content: string;
  sectionPath: string[];
};

function hasSectionBody(content: string) {
  return content
    .split('\n')
    .some((line) => {
      const trimmedLine = line.trim();
      return trimmedLine && !/^#{1,6}\s+/.test(trimmedLine);
    });
}

// 清洗文本，移除控制字符和空行
function normalizeText(content: string) {
  return content
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('')
    .filter((char) => {
      const codePoint = char.charCodeAt(0);
      return codePoint === 9 || codePoint === 10 || codePoint >= 32;
    })
    .join('')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function createIdPart(value: string) {
  return (
    value
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 48) || 'section'
  );
}

function stripHeadingMarker(line: string) {
  return line.replace(/^#{1,6}\s+/, '').trim();
}

function formatContentForEmbedding(input: {
  title: string;
  sectionPath: string[];
  content: string;
}) {
  return [
    `文档：${input.title}`,
    input.sectionPath.length ? `章节：${input.sectionPath.join(' > ')}` : undefined,
    input.content,
  ]
    .filter(Boolean)
    .join('\n');
}

// 按Markdown标题分割为父块内容
function splitIntoMarkdownSections(content: string): MarkdownSection[] {
  const lines = normalizeText(content).split('\n');
  const sections: MarkdownSection[] = [];
  const headingStack: Array<{ level: number; title: string }> = [];
  let sectionLines: string[] = [];
  let sectionPath: string[] = [];

  function flush() {
    const sectionContent = sectionLines.join('\n').trim();
    if (sectionContent && hasSectionBody(sectionContent)) {
      sections.push({
        content: sectionContent,
        sectionPath,
      });
    }
    sectionLines = [];
  }

  for (const line of lines) {
    const heading = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
    if (heading) {
      flush();
      const level = heading[1].length;
      const title = stripHeadingMarker(line);
      while (headingStack.length && headingStack[headingStack.length - 1].level >= level) {
        headingStack.pop();
      }
      headingStack.push({ level, title });
      sectionPath = headingStack.map((item) => item.title);
    }
    sectionLines.push(line);
  }

  flush();

  if (!sections.length && content.trim()) {
    return [{ content: normalizeText(content), sectionPath: [] }];
  }

  return sections;
}

/**
 * 按Markdown段落分割为子块内容
 */
function splitMarkdownBlocks(content: string) {
  return normalizeText(content)
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
}

// 按段落分割为句子
function splitSentences(paragraph: string) {
  const sentences = paragraph.match(/[^。！？!?；;.\n]+[。！？!?；;.]?|\n+/g);
  return (sentences ?? [paragraph]).map((sentence) => sentence.trim()).filter(Boolean);
}

/**
 * 按段落分割为子块内容，每个子块最大字符数不超过 maxChars，重叠字符数为 overlapChars
 */
function splitOversizedText(text: string, maxChars: number, overlapChars: number) {
  const chunks: string[] = [];
  let start = 0;

  while (start < text.length) {
    const end = Math.min(start + maxChars, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk) {
      chunks.push(chunk);
    }
    if (end >= text.length) {
      break;
    }
    start = Math.max(end - overlapChars, start + 1);
  }

  return chunks;
}

//
function splitParagraphBySentences(paragraph: string, maxChars: number, overlapChars: number) {
  if (paragraph.length <= maxChars) {
    return [paragraph];
  }

  const chunks: string[] = [];
  let buffer = '';

  for (const sentence of splitSentences(paragraph)) {
    if (sentence.length > maxChars) {
      if (buffer.trim()) {
        chunks.push(buffer.trim());
        buffer = '';
      }
      chunks.push(...splitOversizedText(sentence, maxChars, overlapChars));
      continue;
    }

    const nextBuffer = buffer ? `${buffer}${sentence}` : sentence;
    if (nextBuffer.length > maxChars && buffer) {
      chunks.push(buffer.trim());
      buffer = sentence;
    } else {
      buffer = nextBuffer;
    }
  }

  if (buffer.trim()) {
    chunks.push(buffer.trim());
  }

  return chunks;
}

function splitIntoChildContents(content: string, maxChars: number, overlapChars: number) {
  const blocks = splitMarkdownBlocks(content);
  const chunks: string[] = [];
  let buffer = '';

  function pushBuffer() {
    if (buffer.trim()) {
      chunks.push(buffer.trim());
      buffer = '';
    }
  }

  for (const block of blocks) {
    const blockChunks = splitParagraphBySentences(block, maxChars, overlapChars);
    for (const blockChunk of blockChunks) {
      const separator = buffer ? '\n\n' : '';
      const nextBuffer = `${buffer}${separator}${blockChunk}`;
      if (nextBuffer.length > maxChars && buffer) {
        pushBuffer();
        buffer = blockChunk;
      } else {
        buffer = nextBuffer;
      }
    }
  }

  pushBuffer();
  return chunks.length ? chunks : [normalizeText(content)];
}

// 把文档分割为父块和子块
export function chunkPlainText(input: ChunkPlainTextInput) {
  const childMaxChars = input.childMaxChars ?? DEFAULT_CHILD_MAX_CHARS;
  const childOverlapChars = input.childOverlapChars ?? DEFAULT_CHILD_OVERLAP_CHARS;
  const sections = splitIntoMarkdownSections(input.content);
  const parents: ParentChunk[] = [];
  const children: ChildChunk[] = [];

  sections.forEach((section, parentIndex) => {
    const parentId = `${input.docId}_p_${parentIndex}_${createIdPart(
      section.sectionPath.at(-1) ?? section.content,
    )}`;
    const parent: ParentChunk = {
      id: parentId,
      docId: input.docId,
      content: section.content,
      sectionPath: section.sectionPath,
      createdAt: new Date().toISOString(),
    };
    parents.push(parent);

    splitIntoChildContents(section.content, childMaxChars, childOverlapChars).forEach(
      (childContent, childIndex) => {
        children.push({
          id: `${parentId}_c_${childIndex}`,
          parentId,
          docId: input.docId,
          content: childContent,
          sectionPath: section.sectionPath,
          contentForEmbedding: formatContentForEmbedding({
            title: input.title,
            sectionPath: section.sectionPath,
            content: childContent,
          }),
        });
      },
    );
  });

  return { parents, children };
}

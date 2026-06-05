import { Injectable } from '@gulux/gulux';
import type { UserMemory } from '@rag/shared';
import UserMemoryRepository from '../repositories/userMemoryRepository';
import type { MemoryContext } from '../types';
import { createId } from '../utils/id';

const MEMORY_PATTERNS = [
  /(?:记住|以后|之后|后续|从现在开始|请你)([^。！？\n]{4,80})/g,
  /(?:我希望|我喜欢|我偏好|不用|不要)([^。！？\n]{4,80})/g,
];

function normalizeMemoryContent(text: string) {
  return text.trim().replace(/^[:：,，\s]+/, '').replace(/\s+/g, ' ');
}

// 从用户问题中提取显式用户记忆
// 包括用户偏好和约束
function extractExplicitUserMemories(question: string) {
  const memories: Array<Pick<UserMemory, 'type' | 'content' | 'confidence'>> = [];

  for (const pattern of MEMORY_PATTERNS) {
    for (const match of question.matchAll(pattern)) {
      const content = normalizeMemoryContent(match[0]);
      if (content.length >= 6) {
        memories.push({
          type: content.includes('不要') || content.includes('不用') ? 'constraint' : 'preference',
          content,
          confidence: 0.8,
        });
      }
    }
  }

  return memories;
}

@Injectable()
export default class UserMemoryService {
  public constructor(private readonly userMemoryRepository: UserMemoryRepository) {}

  // 列出用户记忆上下文
  // 返回用户的所有记忆上下文，包括偏好和约束
  public async listMemoryContexts(userId?: string): Promise<MemoryContext[]> {
    if (!userId) {
      return [];
    }

    const memories = await this.userMemoryRepository.listByUser(userId);
    return memories.map((memory) => ({
      type: `user_${memory.type}`,
      content: memory.content,
      usage: '用户记忆只用于理解用户偏好和回答风格，不作为知识库事实证据。',
    }));
  }

  // 从用户问题中提取显式用户记忆
  // 包括用户偏好和约束
  // 保存提取到的记忆到数据库中
  public async extractAndSaveFromQuestion(input: {
    userId?: string;
    conversationId: string;
    question: string;
  }) {
    if (!input.userId) {
      return;
    }

    const memories = extractExplicitUserMemories(input.question);
    await Promise.all(
      memories.map((memory) =>
        this.userMemoryRepository.upsertMemory({
          id: createId('mem'),
          userId: input.userId as string,
          type: memory.type,
          content: memory.content,
          confidence: memory.confidence,
          metadata: {
            conversationId: input.conversationId,
          },
        }),
      ),
    );
  }
}

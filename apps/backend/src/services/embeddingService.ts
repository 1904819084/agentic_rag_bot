import { Injectable } from '@gulux/gulux';
import crypto from 'node:crypto';
import { env } from '../config/env';

@Injectable()
export default class EmbeddingService {
  public async embedQuery(query: string): Promise<number[]> {
    return this.embedText(query);
  }

  public async embedText(text: string): Promise<number[]> {
    if (env.embedding.provider === 'http') {
      return this.embedWithHttp(text);
    }

    return this.embedWithHash(text);
  }

  public async embedTexts(texts: string[]): Promise<number[][]> {
    const vectors: number[][] = [];
    for (const text of texts) {
      vectors.push(await this.embedText(text));
    }
    return vectors;
  }

  private async embedWithHttp(text: string): Promise<number[]> {
    if (!env.embedding.endpoint) {
      throw new Error('EMBEDDING_ENDPOINT is required when EMBEDDING_PROVIDER=http');
    }

    const response = await fetch(env.embedding.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(env.embedding.apiKey ? { Authorization: `Bearer ${env.embedding.apiKey}` } : {}),
      },
      body: JSON.stringify({
        input: text,
        model: env.embedding.model || undefined,
      }),
    });

    if (!response.ok) {
      throw new Error(`Embedding request failed: ${response.status}`);
    }

    const body = (await response.json()) as {
      embedding?: unknown;
      data?: Array<{ embedding?: unknown }>;
    };
    const embedding = Array.isArray(body.embedding) ? body.embedding : body.data?.[0]?.embedding;

    if (!Array.isArray(embedding)) {
      throw new Error('Embedding response missing embedding array');
    }

    const vector = embedding.map(Number);
    if (vector.length !== env.embedding.dimension) {
      throw new Error(
        `Embedding dimension mismatch: expected ${env.embedding.dimension}, got ${vector.length}`,
      );
    }

    return vector;
  }

  private embedWithHash(text: string): number[] {
    const vector = new Array(env.embedding.dimension).fill(0);
    const tokens = text.toLowerCase().match(/[\p{L}\p{N}_-]+/gu) ?? [];

    for (const token of tokens) {
      const digest = crypto.createHash('sha256').update(token).digest();
      const index = digest.readUInt32BE(0) % env.embedding.dimension;
      const sign = digest[4] % 2 === 0 ? 1 : -1;
      vector[index] += sign;
    }

    const norm = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    return norm > 0 ? vector.map((value) => value / norm) : vector;
  }
}

import { Injectable } from '@gulux/gulux';
import { DataType } from '@zilliz/milvus2-sdk-node';
import { env } from '../config/env';
import { MilvusClientProvider } from '../infra/milvusClient';
import type { ChildChunkDraft } from '../utils/chunking';

@Injectable()
export default class MilvusIndexService {
  private initialized = false;

  public constructor(private readonly milvus: MilvusClientProvider) {}

  public async ensureCollection() {
    if (this.initialized) {
      return;
    }

    const client = this.milvus.getClient();
    const collectionName = this.milvus.collectionName;
    const hasCollection = await client.hasCollection({ collection_name: collectionName });

    if (!hasCollection.value) {
      await client.createCollection({
        collection_name: collectionName,
        fields: [
          { name: 'id', data_type: DataType.VarChar, is_primary_key: true, max_length: 256 },
          { name: 'parent_id', data_type: DataType.VarChar, max_length: 256 },
          { name: 'doc_id', data_type: DataType.VarChar, max_length: 256 },
          { name: 'title', data_type: DataType.VarChar, max_length: 1024 },
          { name: 'section_path', data_type: DataType.VarChar, max_length: 2048 },
          { name: 'content', data_type: DataType.VarChar, max_length: 8192 },
          { name: 'url', data_type: DataType.VarChar, max_length: 2048, nullable: true },
          { name: 'embedding', data_type: DataType.FloatVector, dim: env.milvus.dimension },
        ],
      } as never);

      await client.createIndex({
        collection_name: collectionName,
        field_name: 'embedding',
        index_type: 'AUTOINDEX',
        metric_type: 'COSINE',
      } as never);
    }

    try {
      await client.loadCollection({ collection_name: collectionName });
    } catch {
      // Collection may already be loaded.
    }

    this.initialized = true;
  }

  public async upsertChunks(chunks: ChildChunkDraft[], vectors: number[][], url?: string) {
    if (!chunks.length) {
      return;
    }

    await this.ensureCollection();
    const client = this.milvus.getClient();

    await client.upsert({
      collection_name: this.milvus.collectionName,
      data: chunks.map((chunk, index) => ({
        id: chunk.id,
        parent_id: chunk.parentId,
        doc_id: chunk.docId,
        title: chunk.title.slice(0, 1024),
        section_path: chunk.sectionPath.join(' > ').slice(0, 2048),
        content: chunk.content.slice(0, 8192),
        url: url ?? '',
        embedding: vectors[index],
      })),
    } as never);
  }
}

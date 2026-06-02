import { Injectable } from '@gulux/gulux';
import { MilvusClient } from '@zilliz/milvus2-sdk-node';
import { env } from '../config/env';

@Injectable()
export class MilvusClientProvider {
  private client: MilvusClient | null = null;

  public getClient() {
    if (!this.client) {
      this.client = new MilvusClient({ address: env.milvus.address });
    }

    return this.client;
  }

  public get collectionName() {
    return env.milvus.collection;
  }
}

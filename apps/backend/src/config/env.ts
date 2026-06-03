import dotenv from 'dotenv';

dotenv.config();

function readNumber(value: string | undefined, defaultValue: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

export const env = {
  port: readNumber(process.env.PORT, 3001),
  postgres: {
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: readNumber(process.env.POSTGRES_PORT, 5432),
    database: process.env.POSTGRES_DB ?? 'rag',
    user: process.env.POSTGRES_USER ?? 'bytedance',
    password: process.env.POSTGRES_PASSWORD ?? '123456',
  },
  retrieval: {
    provider: process.env.RETRIEVAL_PROVIDER ?? 'hybrid',
    topK: readNumber(process.env.RETRIEVAL_TOP_K, 8),
  },
  embedding: {
    provider: process.env.EMBEDDING_PROVIDER ?? 'hash',
    endpoint: process.env.EMBEDDING_ENDPOINT ?? '',
    apiKey: process.env.EMBEDDING_API_KEY ?? '',
    model: process.env.EMBEDDING_MODEL ?? '',
  },
  milvus: {
    address: process.env.MILVUS_ADDRESS ?? 'localhost:19530',
    collection: process.env.MILVUS_COLLECTION ?? 'rag_child_chunks',
    dimension: readNumber(process.env.MILVUS_DIMENSION, 1024),
  },
  feishu: {
    appId: process.env.FEISHU_APP_ID ?? '',
    appSecret: process.env.FEISHU_APP_SECRET ?? '',
    verificationToken: process.env.FEISHU_VERIFICATION_TOKEN ?? '',
    encryptKey: process.env.FEISHU_ENCRYPT_KEY ?? '',
  },
};

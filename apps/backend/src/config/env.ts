import dotenv from 'dotenv';

dotenv.config();

function readNumber(value: string | undefined, defaultValue: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : defaultValue;
}

const DEFAULT_FEISHU_OAUTH_SCOPE = [
  'docx:document:readonly',
  'wiki:wiki:readonly',
].join(' ');

export const env = {
  port: readNumber(process.env.PORT, 3001),
  postgres: {
    host: process.env.POSTGRES_HOST ?? 'localhost',
    port: readNumber(process.env.POSTGRES_PORT, 5432),
    database: process.env.POSTGRES_DB ?? 'agentic_rag',
    user: process.env.POSTGRES_USER ?? 'bytedance',
    password: process.env.POSTGRES_PASSWORD ?? '123456',
  },
  retrieval: {
    provider: process.env.RETRIEVAL_PROVIDER ?? 'hybrid',
    topK: readNumber(process.env.RETRIEVAL_TOP_K, 8),
  },
  redis: {
    host: process.env.REDIS_HOST ?? 'localhost',
    port: readNumber(process.env.REDIS_PORT, 6379),
    password: process.env.REDIS_PASSWORD || undefined,
  },
  evalQueue: {
    concurrency: readNumber(process.env.EVAL_QUEUE_CONCURRENCY, 1),
  },
  embedding: {
    provider: process.env.EMBEDDING_PROVIDER ?? 'hash',
    endpoint: process.env.EMBEDDING_ENDPOINT ?? '',
    apiKey: process.env.EMBEDDING_API_KEY ?? '',
    model: process.env.EMBEDDING_MODEL ?? '',
    dimension: readNumber(process.env.EMBEDDING_DIMENSION, 1024),
  },
  feishu: {
    appId: process.env.FEISHU_APP_ID ?? 'cli_a97b05c584fa5bcb',
    appSecret: process.env.FEISHU_APP_SECRET ?? 'EjSIDNbePwkiq7SKimQ7jepP88FYLQR8',
    verificationToken: process.env.FEISHU_VERIFICATION_TOKEN ?? '',
    authRedirectUri: process.env.FEISHU_AUTH_REDIRECT_URI ?? '',
    authSuccessRedirectUri: process.env.FEISHU_AUTH_SUCCESS_REDIRECT_URI ?? '',
    oauthScope: process.env.FEISHU_OAUTH_SCOPE ?? DEFAULT_FEISHU_OAUTH_SCOPE,
  },
};

# RAG Engineering Knowledge Bot

面向研发人员的 PRD/TRD 知识库问答系统，支持通过飞书云文档 Docx 链接导入需求文档、技术方案、评审纪要和行动点，帮助追溯业务背景、历史技术决策和后续行动点。

## 技术栈

- Monorepo：pnpm workspace
- Web：React + TypeScript + Vite + Ant Design + axios
- Backend：Gulux
- LLM：Fornax SDK / PTaaS + Prompt Hub（仅用于 Query 改写和答案生成）
- Retrieval：自建混合检索，PostgreSQL 关键词检索 + Milvus 向量检索 + RRF 融合
- Workflow：LangGraph
- Vector DB：Milvus fallback
- Metadata：PostgreSQL
- Queue/Cache：Redis + BullMQ

## 目录结构

```text
apps/frontend  React Web 前端
apps/backend   Gulux 后端服务
packages/shared 前后端共享类型
.trae/document  系统设计文档
```

## 本地启动

1. 安装依赖：

```bash
pnpm install
```

2. 启动本地基础设施：

```bash
docker compose -f infra/docker-compose.yml up -d
```

3. 配置环境变量：

```bash
cp apps/backend/.env.example apps/backend/.env
```

填写 Fornax、Feishu、PostgreSQL、Redis、Embedding 配置。导入飞书 Docx 链接需要 `FEISHU_APP_ID` 和 `FEISHU_APP_SECRET`。默认 `RETRIEVAL_PROVIDER=hybrid`，不会使用 Fornax Knowledge Retriever。`EMBEDDING_PROVIDER=hash` 可用于本地验证；生产应改为真实 embedding HTTP 服务。不要提交 `.env`。

4. 启动开发服务：

```bash
pnpm dev
```

- Web: http://localhost:5173
- Backend API: http://localhost:3001/api

## 常用命令

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @rag/backend dev:api
pnpm --filter @rag/backend dev:worker
pnpm --filter @rag/frontend dev
```

## Feishu 回调验证

```bash
curl -X POST http://localhost:3001/api/feishu/events \
  -H 'Content-Type: application/json' \
  -d '{"challenge":"test_challenge"}'
```

预期返回：

```json
{ "challenge": "test_challenge" }
```

## 后续扩展

轻量 MVP 中已预留以下扩展点：

- OpenSearch / Elasticsearch：BM25 混合检索
- 应用级 MinIO / S3：原始文档快照和附件
- OCR / PDF 解析服务：图片、流程图、PDF 入库
- 文件解析：当前首版支持飞书云文档 Docx 链接导入，后续可接 docx/pdf 文件解析
- 真实 Embedding Provider：当前本地默认 hash embedding 仅用于开发验证，生产需要接真实 text-to-vector embedding provider
- Web SSO / 权限系统
- 飞书事件加密与签名完整校验

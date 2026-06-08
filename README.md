# 基于 Agentic RAG 的业务研发知识库问答助手

面向研发人员的 PRD/TRD 知识库问答系统。系统支持从飞书云文档 Docx 链接导入研发文档，基于多轮会话、用户记忆、查询改写、查询计划 DAG、混合检索和答案校验，帮助追溯业务背景、历史技术决策和行动点。

## 当前能力

- 文档导入：支持飞书 Docx 链接和本地 TXT / Markdown / DOCX / PDF 文件上传，切分 parent / child chunks，写入 PostgreSQL 和 pgvector。
- 混合检索：支持 keyword、vector、hybrid 三种检索模式，默认 hybrid，并用 RRF 和 query overlap 做结果融合与重排。
- Agentic RAG 问答：LangGraph 编排 `rewrite_query -> plan_query -> retrieve -> build_context -> generate_answer -> verify_answer`。
- 多轮会话：前端支持会话侧栏、会话选择、新建会话、历史消息加载；用户没有会话时直接提问会由 `/chat/ask` 自动创建会话。
- 会话上下文：后端会读取会话摘要和最近消息，作为后续问题的上下文。
- 用户记忆：从用户问题中提取显式偏好/约束，后续按 `userId` 注入问答上下文；记忆只影响回答风格和偏好，不作为知识库事实证据。
- 答案可解释性：回答返回引用、查询计划 DAG、分步检索结果和答案支撑性校验信息，前端在消息中展示计划步骤。
- 飞书事件入口：支持飞书 URL verification challenge 和文本消息事件回复。

## 技术栈

- Monorepo：pnpm workspace
- Web：React 18 + TypeScript + Vite + Ant Design + ahooks + axios
- Backend：Gulux + TypeScript + Node.js
- LLM：Fornax SDK / PTaaS + Prompt Hub
- Workflow：LangGraph
- Retrieval：PostgreSQL 全文检索 + pgvector 向量检索 + RRF 融合
- Storage：PostgreSQL + pgvector

## 目录结构

```text
apps/frontend
  React Web 前端，包含研发问答页、文档管理页、会话侧栏和消息展示

apps/backend
  Gulux API、RAG Graph、文档导入、检索、会话和用户记忆服务

packages/shared
  前后端共享 TypeScript 类型，包括文档、会话、问答、引用和查询计划类型

infra
  本地 PostgreSQL + pgvector docker compose

.trae/document
  设计文档
```

## 核心链路

### 文档入库

1. 前端在文档页提交飞书 Docx 链接，或上传本地 TXT / Markdown / DOCX / PDF 文件。
2. 后端 `POST /documents/import/feishu-docx` 拉取飞书文档内容，或 `POST /documents/import/file` 解析上传文件。
3. `DocumentIngestionService` 将解析后的正文切分为 parent / child chunks。
4. `EmbeddingService` 为 child chunks 生成向量。
5. `DocumentRepository` 写入 `documents`、`parent_chunks`、`child_chunks`。

### 问答

1. 前端调用 `POST /chat/ask`，传入 `question`、可选 `conversationId` 和 `userId`。
2. `ConversationService.prepareConversation` 准备会话：没有 `conversationId` 时自动创建会话，标题使用首问前 32 个字符。
3. 后端读取会话摘要、最近消息和用户记忆。
4. `RagGraphService` 执行 LangGraph：
   `rewrite_query -> plan_query -> retrieve -> build_context -> generate_answer -> verify_answer`。
5. 后端追加用户消息和助手消息，更新会话摘要，并从问题中提取用户记忆。
6. 前端保存返回的 `conversationId`，刷新会话列表和消息；新会话会即时出现在侧栏。

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

填写 Fornax、Feishu、PostgreSQL、Embedding 配置。导入飞书 Docx 链接需要 `FEISHU_APP_ID` 和 `FEISHU_APP_SECRET`。飞书事件回调校验需要 `FEISHU_VERIFICATION_TOKEN`。

本地默认配置：

- `RETRIEVAL_PROVIDER=hybrid`
- `RETRIEVAL_TOP_K=8`
- `EMBEDDING_PROVIDER=hash`
- `EMBEDDING_DIMENSION=1024`

`hash` embedding 只适合本地验证；生产环境应配置真实 embedding HTTP 服务。不要提交 `.env`。

4. 准备数据库表：

```bash
psql "$DATABASE_URL" -f apps/backend/src/db/migrations/001_init.sql
psql "$DATABASE_URL" -f apps/backend/src/db/migrations/002_multi_turn_qa.sql
psql "$DATABASE_URL" -f apps/backend/src/db/migrations/003_local_file_documents.sql
```

如果没有 `DATABASE_URL`，按 `.env` 中的 PostgreSQL 配置连接本地库后执行这些迁移文件。

5. 启动开发服务：

```bash
pnpm dev
```

- Web: http://localhost:5173
- Backend API: http://localhost:3001/api

也可以分别启动：

```bash
pnpm dev:backend
pnpm dev:frontend
```

## 常用命令

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm format:check
pnpm --filter @rag/shared build
pnpm --filter @rag/shared check:dist
pnpm --filter @rag/backend dev:api
pnpm --filter @rag/frontend dev
```

说明：

- `pnpm dev` 会先构建 `@rag/shared`，再同时启动 backend 和 frontend。
- `pnpm build` 会依次构建 shared、检查 shared `dist` 是否与 `src` 对齐、构建 backend 和 frontend。
- 根目录当前没有统一 `pnpm test` 脚本。
- 后端测试文件位于 `apps/backend/test`，使用 Node test runner。
- 前端新增的会话列表纯函数测试位于 `apps/frontend/src/pages/ChatPage/conversationList.test.ts`。

可按需运行单个测试，例如：

```bash
pnpm --filter @rag/backend exec tsx --test test/conversationService.test.ts
pnpm --filter @rag/backend exec tsx --test ../../apps/frontend/src/pages/ChatPage/conversationList.test.ts
```

## API 概览

后端接口默认挂载在 `/api` 下。

### Chat

```http
POST /api/chat/ask
```

请求：

```json
{
  "question": "当时为什么没有采用方案 B？",
  "conversationId": "conv_xxx",
  "userId": "default-user"
}
```

`conversationId` 可省略。省略时后端会自动创建会话，并在响应中返回新 `conversationId`。

响应包含：

- `conversationId`
- `conversation`
- `answer`
- `citations`
- `rewrittenQuery`
- `queryPlanDag`
- `stepResults`
- `answerVerification`

### Conversations

```http
GET /api/conversations?userId=default-user
POST /api/conversations
GET /api/conversations/:id/messages
```

`POST /api/conversations` 可用于手动创建空会话。用户直接提问时不需要先调用该接口。

### Documents

```http
GET /api/documents
POST /api/documents/import/feishu-docx
POST /api/documents/import/file
GET /api/documents/:id
```

`POST /api/documents/import/file` 使用 `multipart/form-data`，字段名为 `file`。当前支持 `.txt`、`.md`、`.markdown`、`.docx`、`.pdf`，文件大小上限 20MB；上传原文件会保存到 `apps/backend/storage/uploads`，并用内容 hash 作为本地文档来源标识。

当前 `GET /api/documents/:id` 仍返回 501，文档详情页尚未实现。

### Feishu

```http
POST /api/feishu/events
```

支持飞书 URL verification challenge：

```bash
curl -X POST http://localhost:3001/api/feishu/events \
  -H 'Content-Type: application/json' \
  -d '{"challenge":"test_challenge"}'
```

预期返回：

```json
{ "challenge": "test_challenge" }
```

## 数据表

`001_init.sql` 创建文档和检索相关表：

- `documents`
- `parent_chunks`
- `child_chunks`

`002_multi_turn_qa.sql` 创建多轮会话和用户记忆相关表：

- `conversations`
- `conversation_messages`
- `user_memories`

`003_local_file_documents.sql` 为本地文件上传增加文档元信息字段：

- `file_name`
- `mime_type`
- `file_size`
- `storage_key`
- `content_hash`
- `import_error`

## 前端页面

- `/chat`：研发问答。支持会话列表、自动建会话、历史消息加载、回答引用、查询计划和答案校验信息展示。
- `/documents`：PRD / TRD 文档管理。支持查看文档列表、导入飞书 Docx 文档和上传本地文档。

## 注意事项

- `EMBEDDING_DIMENSION` 必须与数据库 `child_chunks.embedding vector(1024)` 维度一致。
- `RETRIEVAL_PROVIDER` 可选 `keyword`、`vector`、`hybrid`。
- 当前用户身份由前端默认常量传入，尚未接入 SSO / 权限系统。
- 飞书事件加密和签名完整校验已有配置位，但当前主要实现 token 校验和文本消息回复。
- `apps/backend/output` 和前端 `dist` 是构建产物，不应作为源码逻辑修改入口。

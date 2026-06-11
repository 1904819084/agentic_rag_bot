# 基于 Agentic RAG 的业务研发知识库问答助手

面向研发人员的 PRD/TRD 知识库问答系统。系统支持飞书 Docx 链接和本地文件导入，基于多轮会话、用户记忆、查询改写、任务规划、分步执行、混合检索和评测体系，帮助追溯业务背景、历史技术决策和行动点。

## 当前能力

- 文档导入：支持飞书 Docx 链接和本地 TXT / Markdown / DOCX / PDF / HTML / CSV / XLSX / XML / JSON 文件上传，统一转为 Markdown 文本后切分 parent / child chunks，写入 PostgreSQL 和 pgvector。
- 原文查看：本地上传文件会保存到 `apps/backend/storage/uploads`，前端可通过 `GET /api/documents/:id/original` 预览或下载原文件。
- 混合检索：支持 keyword、vector、hybrid 三种检索模式，默认 hybrid，并用 RRF 和 query overlap 做结果融合与重排。
- Agentic RAG 问答：LangGraph 编排 `rewrite_query -> plan_query -> execute_plan -> build_context -> generate_answer`。
- 任务规划：planning agent 只返回 `QueryPlan.tasks`，每个任务只包含 `id`、`type`、`query`、`dependsOn`；任务类型只有 `retrieve` 和 `reasoning`。
- 分步执行：`retrieve` 任务只检索，不调用 LLM；`reasoning` 任务只基于依赖步骤结果和命中父块内容调用 Fornax 推理。
- 多轮会话：前端支持会话侧栏、会话选择、新建会话、修改标题、删除会话和历史消息加载；用户没有会话时直接提问会由 `/chat/ask` 自动创建会话。
- 会话上下文：后端会读取会话摘要和最近消息，作为后续问题的上下文。
- 用户记忆：从用户问题中提取显式偏好/约束，后续按 `userId` 注入问答上下文；记忆只影响回答风格和偏好，不作为知识库事实证据。
- 答案可解释性：回答返回参考文档、任务计划、分步执行结果和检索父块上下文；前端在消息中展示计划步骤和参考文档。
- 评测台：支持查看评测数据集、创建 Agentic RAG 评测任务、查看任务列表和评测详情。
- 评测任务 MQ：评测任务通过 BullMQ + Redis 解耦 API 和 worker，支持 `queued / running / succeeded / failed` 状态；worker 重启时会把 `running` 任务恢复为 `queued` 并重新投递 MQ。
- 飞书登录：使用飞书 OAuth 授权码流程，登录态保存在服务端 session；授权回调会校验 OAuth `state` cookie，降低 login CSRF 风险。
- 飞书事件入口：支持飞书 URL verification challenge 和文本消息事件回复。

## 技术栈

- Monorepo：pnpm workspace
- Web：React 18 + TypeScript + Vite + Ant Design + ahooks + axios
- Backend：Gulux + TypeScript + Node.js
- LLM：Fornax SDK / PTaaS + Prompt Hub
- Workflow：LangGraph
- Queue：BullMQ + Redis
- Retrieval：PostgreSQL 全文检索 + pgvector 向量检索 + RRF 融合
- Storage：PostgreSQL + pgvector

## 目录结构

```text
apps/frontend
  React Web 前端，包含研发问答页、文档管理页、评测台、会话侧栏和消息展示

apps/backend
  Gulux API、RAG Graph、文档导入、检索、评测任务、队列 worker、会话和用户记忆服务

packages/shared
  前后端共享 TypeScript 类型，包括文档、会话、问答、引用、查询计划和评测类型

infra
  本地 PostgreSQL + pgvector docker compose

.trae/document
  设计文档
```

## 核心链路

### 文档入库

1. 前端在文档页打开统一导入弹窗，选择飞书链接导入或本地文件上传。
2. 飞书文档导入会复用当前系统登录 session 中保存的飞书 user access token；如果 access token 过期，后端会优先尝试用 refresh token 自动续期。
3. 后端 `POST /documents/import/feishu-docx` 拉取飞书文档内容，或 `POST /documents/import/file` 解析上传文件。
4. 本地文件优先使用 `markitdown-ts` 转为 Markdown；TXT / Markdown 直接清洗文本；DOCX / PDF 保留 mammoth / pdf-parse 兜底解析。
5. 后端会提升常见编号标题为 Markdown 标题，再由 `DocumentIngestionService` 切分为 parent / child chunks。
6. parent chunk 按 Markdown 标题组织，child chunk 按段落和句子递归切分，用于检索和 embedding。
7. 检索命中 child chunk 后，会回表返回对应 parent chunk 的 `content` 给 LLM 生成答案。
8. `EmbeddingService` 为 child chunks 生成向量。
9. `DocumentRepository` 写入 `documents`、`parent_chunks`、`child_chunks`。

### 飞书登录和授权

1. 前端启动后调用 `GET /api/auth/me` 检查当前 session。
2. 未登录时，前端调用 `GET /api/auth/feishu/login-url`，后端生成飞书授权 URL，同时写入短期 HttpOnly cookie `rag_feishu_oauth_state`。
3. 浏览器跳转到飞书授权页，用户确认授权。
4. 飞书跳回 `FEISHU_AUTH_REDIRECT_URI`，也就是后端 `GET /api/auth/feishu/callback`，并带上 `code` 和 `state`。
5. 后端先校验 callback 中的 `state` 是否与 `rag_feishu_oauth_state` cookie 一致；不一致会返回 `invalid_feishu_oauth_state`。
6. state 校验通过后，后端用 `code` 换飞书 user access token，再用 token 拉取飞书用户信息。
7. `AuthService` 创建或更新 `app_users`，再创建 `auth_sessions`，把飞书 access token / refresh token 和过期时间保存在服务端。
8. 后端写入系统 session cookie `rag_auth_session`，清理 `rag_feishu_oauth_state`，最后跳回 `FEISHU_AUTH_SUCCESS_REDIRECT_URI`。
9. 后续导入飞书文档时，后端从 `auth_sessions` 读取 user access token；如果 token 已过期且 session 中有 refresh token，会先自动刷新并更新 session。

### 问答

1. 前端调用 `POST /chat/ask`，传入 `question`、可选 `conversationId` 和 `userId`。
2. `ConversationService.prepareConversation` 准备会话：没有 `conversationId` 时自动创建会话，标题使用首问前 32 个字符。
3. 后端读取会话摘要、最近消息和用户记忆。
4. `RagGraphService` 执行 LangGraph：
   `rewrite_query -> plan_query -> execute_plan -> build_context -> generate_answer`。
5. `plan_query` 调用 `demo.agentic_rag_planing.prompt`，只生成最小任务计划：
   `tasks: [{ id, type, query, dependsOn }]`。
6. `execute_plan` 根据 `dependsOn` 推导执行层级：
   - `retrieve`：执行检索，命中 child chunks 后返回对应 parent chunk 内容。
   - `reasoning`：调用 `demo.agentic_rag_reasoning.prompt`，输入依赖步骤结果和依赖步骤命中的父块内容。
7. `build_context` 将最终去重后的 parent chunk 内容格式化为 `[资料 N]`，同时生成前端展示用的去重参考文档列表。
8. `generate_answer` 调用 `demo.agentic_rag_answer.prompt`，基于资料上下文和 step results 生成最终答案。
9. 后端追加用户消息和助手消息，更新会话摘要，并从问题中提取用户记忆。
10. 前端保存返回的 `conversationId`，刷新会话列表和消息；新会话会即时出现在侧栏。

### 评测

1. 评测数据集位于 `apps/backend/evals/cases/rag_eval_cases.json`。
2. 前端评测台调用 `POST /api/evals/task` 创建评测任务。
3. API 只创建 `eval_tasks` 记录并投递 BullMQ，不在 API 进程中执行完整评测。
4. `apps/backend/src/workers/evalWorker.ts` 消费 `agentic-rag-eval` 队列，逐个 case 调用真实 RAG 链路。
5. 检索指标使用 `parentRecall@K`，K 来自 `RETRIEVAL_TOP_K`。
6. 生成指标包括 `answerCorrectness`、`answerFaithfulness`、`answerCompleteness`，由 Fornax judge prompt 评分，范围为 0-1。
7. 每次评测结果写入 `apps/backend/evals/reports/<taskId>/report.json`。
8. 前端通过 `GET /api/evals/tasks/:taskId/report` 展示 summary 和 case 明细。

## 本地启动

1. 安装依赖：

```bash
pnpm install
```

2. 启动本地基础设施：

```bash
docker compose -f infra/docker-compose.yml up -d
```

本地需要 PostgreSQL + pgvector 和 Redis。Redis 用于 BullMQ 评测任务队列；建议开启 AOF 持久化。

3. 配置环境变量：

```bash
cp apps/backend/.env.example apps/backend/.env
```

填写 Fornax、Feishu、PostgreSQL、Redis、Embedding 配置。系统登录使用飞书 OAuth 授权码流程，登录成功默认回到 `http://localhost:5175/chat`。`FEISHU_AUTH_REDIRECT_URI` 必须配置为飞书开放平台允许的 OAuth 回调地址，例如本地开发的 `http://localhost:3002/api/auth/feishu/callback`。`FEISHU_OAUTH_SCOPE` 用来声明登录时要让用户授权的权限，多个 scope 用空格分隔；默认请求 `docx:document:readonly wiki:wiki:readonly`，用于读取新版文档和解析知识库链接。飞书后台未开通的 scope 会导致授权页报 `20027 当前应用权限不足`；如果需要 refresh token，可在飞书后台开通 `offline_access` 后再加入配置，后端会在 access token 过期时自动 refresh。飞书事件回调校验需要 `FEISHU_VERIFICATION_TOKEN`。

本地默认配置：

- `POSTGRES_HOST=localhost`
- `POSTGRES_PORT=5432`
- `POSTGRES_DB=agentic_rag`
- `POSTGRES_USER=bytedance`
- `POSTGRES_PASSWORD=123456`
- `REDIS_HOST=localhost`
- `REDIS_PORT=6379`
- `RETRIEVAL_PROVIDER=hybrid`
- `RETRIEVAL_TOP_K=8`
- `EVAL_QUEUE_CONCURRENCY=1`
- `EMBEDDING_PROVIDER=hash`
- `EMBEDDING_DIMENSION=1024`

`hash` embedding 只适合本地验证；生产环境应配置真实 embedding HTTP 服务。不要提交 `.env`。

Fornax Prompt Hub 需要配置以下 prompt key：

- `demo.agentic_rag_rewrite.prompt`：问题改写。
- `demo.agentic_rag_planing.prompt`：任务规划，只输出 `steps` JSON。
- `demo.agentic_rag_reasoning.prompt`：中间推理，只处理 `reasoning` 子任务。
- `demo.agentic_rag_answer.prompt`：最终答案生成。
- `demo.agentic_rag_eval.prompt`：评测 judge，输出生成指标 JSON。

4. 准备数据库表：

```bash
psql "$DATABASE_URL" -f apps/backend/src/db/migrations/001_init.sql
psql "$DATABASE_URL" -f apps/backend/src/db/migrations/002_multi_turn_qa.sql
psql "$DATABASE_URL" -f apps/backend/src/db/migrations/003_local_file_documents.sql
psql "$DATABASE_URL" -f apps/backend/src/db/migrations/004_query_plan_task_type_reasoning.sql
psql "$DATABASE_URL" -f apps/backend/src/db/migrations/005_simplify_query_plan_metadata.sql
psql "$DATABASE_URL" -f apps/backend/src/db/migrations/006_eval_tasks.sql
psql "$DATABASE_URL" -f apps/backend/src/db/migrations/007_feishu_auth.sql
```

如果没有 `DATABASE_URL`，按 `.env` 中的 PostgreSQL 配置连接本地库后执行这些迁移文件。

5. 启动开发服务：

```bash
pnpm --filter @rag/shared build
pnpm --filter @rag/backend dev:api
pnpm --filter @rag/backend dev:eval-worker
pnpm --filter @rag/frontend dev
```

默认地址：

- Web: http://localhost:5173
- Backend API: http://localhost:3001/api
- Eval worker: 单独进程，无 HTTP 端口

如果需要指定端口和代理目标：

```bash
PORT=3020 pnpm --filter @rag/backend dev:api
VITE_API_PROXY_TARGET=http://127.0.0.1:3020 pnpm --filter @rag/frontend dev --host 127.0.0.1 --port 5178
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
pnpm --filter @rag/backend dev:eval-worker
pnpm --filter @rag/backend eval:e2e
pnpm --filter @rag/frontend dev
```

说明：

- `pnpm dev` 会先构建 `@rag/shared`，再同时启动 backend 和 frontend；它不会启动 eval worker。
- 需要评测任务自动执行时，必须额外启动 `pnpm --filter @rag/backend dev:eval-worker`。
- `pnpm build` 会依次构建 shared、检查 shared `dist` 是否与 `src` 对齐、构建 backend 和 frontend。
- 后端测试文件位于 `apps/backend/test`，使用 Node test runner。

可按需运行单个测试，例如：

```bash
pnpm --filter @rag/backend exec tsx --test test/queryPlan.test.ts
pnpm --filter @rag/backend exec tsx --test test/executePlanNode.test.ts
pnpm --filter @rag/backend exec tsx --test test/generateAnswerNode.test.ts
pnpm --filter @rag/backend exec tsx --test test/evalTaskRepository.test.ts
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
- `rewrittenQuery`
- `queryPlan`
- `stepResults`
- `referenceDocuments`
- `contexts`

### Conversations

```http
GET /api/conversations?userId=default-user
POST /api/conversations
PATCH /api/conversations/:id
DELETE /api/conversations/:id
GET /api/conversations/:id/messages
```

`POST /api/conversations` 可用于手动创建空会话。用户直接提问时不需要先调用该接口。

### Documents

```http
GET /api/documents
POST /api/documents/import/feishu-docx
POST /api/documents/import/file
GET /api/documents/:id/original
```

`POST /api/documents/import/file` 使用 `multipart/form-data`，字段名为 `file`。当前支持 `.txt`、`.md`、`.markdown`、`.docx`、`.pdf`、`.html`、`.csv`、`.xlsx`、`.xml`、`.json`，文件大小上限 20MB；上传原文件会保存到 `apps/backend/storage/uploads`，并用内容 hash 作为本地文档来源标识。

`POST /api/documents/import/feishu-docx` 接收飞书 `/docx/...` 或 `/wiki/...` 链接。前端不再单独做导入授权，后端会使用当前系统登录 session 中保存的飞书 user access token 读取文档；如果 access token 过期且 session 中有 refresh token，后端会自动 refresh 后继续导入。飞书开放平台需要为应用配置 OAuth 重定向 URL，例如本地开发的 `http://localhost:3002/api/auth/feishu/callback`，并在权限管理中开通 `FEISHU_OAUTH_SCOPE` 配置的权限；如果新增 OpenAPI 能力，也需要把对应 scope 加入 `FEISHU_OAUTH_SCOPE` 后让用户重新登录授权。

### Auth

```http
GET /api/auth/me
GET /api/auth/feishu/login-url
GET /api/auth/feishu/callback
POST /api/auth/logout
```

`GET /api/auth/feishu/login-url` 返回飞书授权 URL，并写入短期 OAuth state cookie。`GET /api/auth/feishu/callback` 会校验飞书回传的 `state`，校验通过后创建系统 session cookie。前端不直接保存飞书 token，飞书 user access token 和 refresh token 都保存在后端 `auth_sessions` 表。

### Evals

```http
GET /api/evals/cases
GET /api/evals/tasks
POST /api/evals/task
GET /api/evals/tasks/:taskId
GET /api/evals/tasks/:taskId/report
```

`POST /api/evals/task` 只创建任务并投递 MQ。任务执行需要启动 eval worker。

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

`003_local_file_documents.sql` 为本地文件导入补充文档元信息：

- `documents.file_name`
- `documents.mime_type`
- `documents.file_size`
- `documents.storage_key`
- `documents.content_hash`
- `documents.import_error`

`004_query_plan_task_type_reasoning.sql` 和 `005_simplify_query_plan_metadata.sql` 清理历史 query plan metadata。

`006_eval_tasks.sql` 创建评测任务表：

- `eval_tasks`

`007_feishu_auth.sql` 创建飞书登录和服务端 session 表：

- `app_users`
- `auth_sessions`

## 评测指标

当前评测体系分三层理解：

- Retrieval Eval：`parentRecall@K`
- Generation Eval：`answerCorrectness`、`answerFaithfulness`、`answerCompleteness`
- End-to-End Eval：每个 case 真实跑完整 RAG 链路，再汇总检索和生成指标

`parentRecall@K` 的对象是 parent chunk，不是 document。前端展示百分比，原始报告 JSON 中保存 0-1 数值。

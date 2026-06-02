# 基于Agentic RAG 的业务研发知识库问答系统设计

> 日期：2026-06-01
> 当前定位：面向研发人员的 PRD/TRD问答系统，首版支持通过飞书 Docx 链接导入文档，并提供带引用的研发知识问答。

## 1. 背景

研发团队在需求评审、技术方案设计、复盘和后续迭代中会持续产生 PRD、TRD。这些文档通常能回答“为什么当时这么做”“某个方案为什么被否决”“某个行动点是否被记录”等问题，但直接检索长文档成本较高。

本系统不是通用 FAQ，也不是完整企业知识库平台。当前目标是把研发文档转成可检索的知识资产，并在回答时返回可追溯引用，降低研发追溯背景和技术决策的成本。

## 2. 当前范围

### 2.1 已覆盖能力

- Web 控制台导入飞书 Docx 链接。
- 从飞书开放 API 获取 Docx 标题和 raw content。
- 将文档写入 PostgreSQL，并按标题结构进行父子分块。
- 为 child chunk 生成 embedding，并写入 Milvus。
- 支持 PostgreSQL 关键词检索、Milvus 向量检索和 hybrid 检索。
- 使用 RRF 融合向量与关键词结果，并做简单 query overlap 重排。
- 使用 LangGraph 编排问答流程：Query 改写、Query 规划、检索、上下文构建、答案生成。
- 使用 Fornax SDK / Prompt Hub 完成 Query 改写、Query 拆分和答案生成。
- Web 端提供研发问答、文档列表、同步任务、问答日志页面。
- 支持飞书事件 challenge 校验和文本消息问答回调。

### 2.2 当前不纳入首版的能力

以下能力不要在本文档中作为当前设计假设：

- 本地文件上传、PDF 解析、图片 OCR、附件解析。
- 飞书 Wiki、Sheet、Bitable、Drive 目录全量同步。
- 完整企业权限同步、SSO、部门/用户组权限模型。
- OpenSearch / Elasticsearch 独立索引。
- 离线评估平台、反馈闭环、A/B 实验。
- 多租户、计费、审计报表。

这些能力可以作为后续扩展，但不能影响当前实现复杂度。

## 3. 技术栈

- Monorepo：pnpm workspace
- 前端：React、TypeScript、Vite、Ant Design、ahooks `useRequest`、axios
- 后端：Gulux、TypeScript
- RAG 编排：LangGraph
- LLM：Fornax SDK / Prompt Hub
- 元数据与关键词检索：PostgreSQL
- 向量检索：Milvus
- 队列：Redis + BullMQ
- 共享类型：`packages/shared`

## 4. 仓库结构

```text
apps/frontend
  React Web 控制台

apps/backend
  Gulux API 服务、RAG 服务、同步队列和 Worker

packages/shared
  前后端共享 TypeScript 类型

infra
  本地 PostgreSQL、Redis、Milvus、MinIO、etcd docker compose
```

## 5. 总体架构

```text
Web 控制台 / 飞书消息
        |
        v
Gulux API Controllers
        |
        +--> 文档导入链路
        |       FeishuDocxService
        |       DocumentIngestionService
        |       ChunkingService
        |       EmbeddingService
        |       DocumentRepository / MilvusIndexService
        |
        +--> 问答链路
                QaService
                RagGraphService
                LangGraph nodes
                RetrievalService
                ContextBuilderService
                Fornax LLM
```

系统分为两条主链路：

1. 文档导入链路：把飞书 Docx 文档转为数据库记录、父子 chunk 和向量索引。
2. 在线问答链路：把用户问题转成检索计划，召回上下文，再基于证据生成答案。

## 6. 文档导入链路

### 6.1 API

当前文档导入入口：

```http
POST /api/documents/import/feishu-docx
Content-Type: application/json

{
  "url": "https://xxx.feishu.cn/docx/xxxx"
}
```

返回：

```json
{
  "document": {
    "id": "docx_...",
    "source": "feishu",
    "sourceDocId": "docx token",
    "documentType": "other",
    "title": "文档标题",
    "url": "https://xxx.feishu.cn/docx/xxxx",
    "status": "active",
    "parentChunkCount": 3,
    "childChunkCount": 10,
    "updatedAt": "2026-06-01T00:00:00.000Z",
    "syncedAt": "2026-06-01T00:00:00.000Z"
  }
}
```

### 6.2 处理流程

```text
用户粘贴飞书 Docx 链接
        |
        v
parseFeishuDocxUrl 校验 URL 并提取 docx token
        |
        v
FeishuDocxService 获取 tenant_access_token、文档标题和 raw content
        |
        v
chunkPlainText 按 Markdown 标题拆 parent chunk，再按长度拆 child chunk
        |
        v
DocumentRepository 写入 documents、parent_chunks、child_chunks
        |
        v
EmbeddingService 生成 child chunk embedding
        |
        v
MilvusIndexService 写入 rag_child_chunks collection
```

### 6.3 分块策略

当前分块策略保持轻量：

- 先按 Markdown 标题行拆成 section，每个 section 形成一个 parent chunk。
- 每个 parent chunk 按默认 1200 字符拆成 child chunk。
- child chunk 默认重叠 160 字符。
- embedding 文本由文档标题、章节路径和正文拼接而成。

当前不做复杂版式解析、表格语义还原、图片 OCR 或行动点结构化抽取。

### 6.4 向量写入容错

文档和 chunk 会先写入 PostgreSQL。Milvus 或 embedding 服务不可用时，导入流程不会因为向量索引失败而整体失败，关键词检索仍可使用。

## 7. 问答链路

### 7.1 API

```http
POST /api/qa/ask
Content-Type: application/json

{
  "question": "当时为什么没有采用方案 B？",
  "channel": "web",
  "userId": "dev-user"
}
```

返回：

```json
{
  "answer": "基于资料生成的回答",
  "rewrittenQuery": "改写后的问题",
  "queryPlan": ["子问题 1", "子问题 2"],
  "queryPlanDag": {
    "isComplex": true,
    "steps": [
      { "id": 1, "query": "子问题 1", "depends": [] }
    ],
    "executionLevels": [[1]]
  },
  "stepResults": [],
  "citations": [
    {
      "sourceId": "资料 1",
      "docId": "docx_...",
      "title": "文档标题",
      "sectionPath": ["章节"],
      "url": "https://xxx.feishu.cn/docx/xxxx",
      "snippet": "引用片段",
      "score": 0.78
    }
  ],
  "contexts": [],
  "qaLogId": "qa_...",
  "latencyMs": 1234
}
```

### 7.2 LangGraph 节点

```text
START
  |
  v
rewrite_query
  |
  v
plan_query
  |
  v
retrieve
  |
  v
build_context
  |
  v
generate_answer
  |
  v
END
```

节点职责：

- `rewrite_query`：调用 Fornax 将口语问题改写成更适合检索的表达；失败时回退原问题。
- `plan_query`：调用 Fornax 做 Query 拆分，生成 `QueryPlanDag`；失败时生成单步计划。
- `retrieve`：按 DAG 执行检索。存在依赖关系时，下游子问题会把上游中间答案拼进检索 query。
- `build_context`：把检索结果转成 `formattedContexts` 和 `citations`。
- `generate_answer`：调用 Fornax 基于上下文和中间步骤生成最终答案；失败时返回可解释的降级文案。

### 7.3 检索策略

`RETRIEVAL_PROVIDER` 支持：

- `keyword`：只使用 PostgreSQL 关键词检索。
- `milvus`：只使用 Milvus 向量检索。
- `hybrid`：同时使用 Milvus 和 PostgreSQL，再做融合排序。

hybrid 模式流程：

```text
query
  |
  +--> Milvus cosine vector search
  |
  +--> PostgreSQL full-text / ILIKE keyword search
  |
  v
RRF 融合
  |
  v
query overlap rerank
  |
  v
topK contexts
```

当前 PostgreSQL 关键词检索使用 `to_tsvector('simple', title + content_for_embedding)` 和 `plainto_tsquery('simple', query)`，同时保留 `ILIKE` 兜底。

### 7.4 引用构造

每条检索结果会转成一个 citation：

- `sourceId`：前端展示用，例如 `资料 1`。
- `docId`：文档 ID。
- `title`：文档或章节标题。
- `sectionPath`：章节路径。
- `url`：飞书文档链接。
- `snippet`：正文前 220 字符。
- `score`：检索分数，如果来源提供。

答案生成 prompt 要求关键结论标注引用，例如 `[资料 1]`。前端同时展示引用卡片，方便用户打开原始飞书文档核对。

## 8. 数据模型

### 8.1 documents

保存文档级元信息。

关键字段：

- `id`
- `source`
- `source_doc_id`
- `document_type`
- `project_key`
- `business_domain`
- `title`
- `url`
- `status`
- `parent_chunk_count`
- `child_chunk_count`
- `metadata`
- `updated_at`
- `synced_at`

### 8.2 parent_chunks

保存按章节形成的父块。

关键字段：

- `id`
- `doc_id`
- `title`
- `section_path`
- `content`
- `summary`
- `url`

### 8.3 child_chunks

保存实际参与检索和向量化的子块。

关键字段：

- `id`
- `parent_id`
- `doc_id`
- `title`
- `section_path`
- `content`
- `content_for_embedding`
- `url`
- `embedding_id`

### 8.4 qa_logs

保存问答日志，供 Web 页面查看。

关键字段：

- `id`
- `question`
- `answer`
- `channel`
- `user_id`
- `citations`
- `latency_ms`
- `created_at`

### 8.5 sync_jobs

保存同步任务记录。当前飞书同步任务只是任务骨架，用于后续接入真实增量同步。

关键字段：

- `id`
- `type`
- `status`
- `message`
- `document_count`
- `chunk_count`
- `started_at`
- `finished_at`
- `created_at`

## 9. 后端模块边界

```text
controllers
  qaController.ts
  documentController.ts
  syncController.ts
  feishuController.ts

services
  qaService.ts
  ragGraphService.ts
  documentIngestionService.ts
  feishuDocxService.ts
  chunkingService.ts
  embeddingService.ts
  retrievalService.ts
  contextBuilderService.ts
  milvusIndexService.ts
  syncService.ts

ragGraph
  createRagAnswerGraph.ts
  nodes/*
  queryPlanDag.ts
  ragGraphState.ts

repositories
  documentRepository.ts
  qaLogRepository.ts
  syncJobRepository.ts
  postgres.ts

queues / workers
  syncQueue.ts
  syncWorker.ts
```

设计原则：

- Controller 只做参数校验和服务调用。
- Service 承载业务流程。
- Repository 只封装数据库读写。
- RagGraph 节点只做问答流程编排。
- shared package 是前后端 API 类型的单一来源。

## 10. 前端结构

前端页面：

- `/chat`：研发问答。
- `/documents`：飞书 Docx 导入与文档列表。
- `/sync`：同步任务列表和触发入口。
- `/logs`：问答日志。

请求状态统一通过 `ahooks/useRequest` 封装在 `src/hooks`：

```text
src/hooks/useAskQuestion.ts
src/hooks/useDocuments.ts
src/hooks/useSyncJobs.ts
src/hooks/useQaLogs.ts
```

页面组件只负责组合 hooks 和业务组件。表格、表单、聊天消息、引用面板按页面拆到 `pages/*/components`，避免页面文件继续变重。

## 11. 配置

关键环境变量：

```text
PORT=3001
PROCESS_ROLE=api

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=rag
POSTGRES_USER=rag
POSTGRES_PASSWORD=rag

REDIS_HOST=localhost
REDIS_PORT=6379

RETRIEVAL_PROVIDER=hybrid
RETRIEVAL_TOP_K=8

EMBEDDING_PROVIDER=hash
EMBEDDING_ENDPOINT=
EMBEDDING_API_KEY=
EMBEDDING_MODEL=

MILVUS_ADDRESS=localhost:19530
MILVUS_COLLECTION=rag_child_chunks
MILVUS_DIMENSION=1024

FORNAX_AK=
FORNAX_SK=
FORNAX_REGION=CN

FEISHU_APP_ID=
FEISHU_APP_SECRET=
FEISHU_VERIFICATION_TOKEN=
FEISHU_ENCRYPT_KEY=
```

本地开发可以使用 `EMBEDDING_PROVIDER=hash`。生产环境应接入真实 embedding HTTP 服务，并保证向量维度和 `MILVUS_DIMENSION` 一致。

## 12. 本地启动

```bash
pnpm install
docker compose -f infra/docker-compose.yml up -d
cp apps/backend/.env.example apps/backend/.env
pnpm dev
```

默认地址：

- Web：`http://localhost:5173`
- Backend API：`http://localhost:3001/api`

常用验证：

```bash
pnpm typecheck
pnpm test
pnpm build
pnpm --filter @rag/frontend lint
pnpm --filter @rag/backend test
```

## 13. 错误处理与降级

- 飞书 URL 非 Docx 链接时返回 `invalid_feishu_docx_url`。
- 未配置飞书 app 时返回 `feishu_app_not_configured`。
- 飞书内容为空时返回 `empty_feishu_docx_content`。
- Milvus 或 embedding 失败不会阻断 PostgreSQL 写入，系统仍可走关键词检索。
- Fornax 调用失败时，Query 改写回退原问题；答案生成返回明确降级文案。
- Redis 不可用时，同步任务 API 不阻断首版流程。

## 14. 后续演进

后续扩展按优先级推进：

1. 飞书目录或 Wiki 增量同步，替换当前 sync job 占位逻辑。
2. 文档详情页，展示 parent/child chunk 和索引状态。
3. 更完整的权限模型，在导入或同步阶段写入 `metadata.permission_users`，检索阶段过滤。
4. 真实 embedding provider 与向量召回质量评估。
5. 文档类型识别和项目维度筛选。
6. 问答反馈和低质量回答排查工具。

这些能力应在需求明确后独立设计，不应提前塞进首版主链路。

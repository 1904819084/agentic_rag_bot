# 基于Agentic RAG 的业务研发知识库问答助手

面向研发人员的 PRD/TRD 知识库问答系统，支持通过飞书云文档 Docx 链接导入需求文档、技术方案，帮助追溯业务背景、历史技术决策和行动点。

## 技术栈

- Monorepo：pnpm workspace
- Web：React + TypeScript + Vite + Ant Design + ahooks + axios
- Backend：Gulux + TypeScript + Node.js
- LLM：Fornax SDK / PTaaS + Prompt Hub
- Retrieval：自建混合检索，PostgreSQL 关键词检索 + Milvus 向量检索 + RRF 融合
- Workflow：LangGraph
- Vector DB：Milvus
- Metadata：PostgreSQL
- Queue/Cache：Redis + BullMQ

## 目录结构

```text
apps/frontend     React Web 前端
apps/backend      Gulux API、RAG 编排、文档导入和同步任务
packages/shared   前后端共享 TypeScript 类型
infra             本地 PostgreSQL / Redis / Milvus docker compose
.trae/document    系统设计文档
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

4. 构建共享类型：

```bash
pnpm --filter @rag/shared build
```

`@rag/shared` 的构建会先清理 `dist`，避免源码和构建产物漂移。

5. 启动开发服务：

```bash
pnpm dev
```

- Web: http://localhost:5173
- Backend API: http://localhost:3001/api

## 常用命令

```bash
pnpm typecheck
pnpm lint
pnpm build
pnpm --filter @rag/shared check:dist
pnpm --filter @rag/backend dev:api
pnpm --filter @rag/backend dev:worker
pnpm --filter @rag/frontend dev
```

说明：

- `pnpm build` 会依次构建 shared、检查 shared `dist` 是否与 `src` 对齐、构建 backend 和 frontend。
- 当前根目录没有 `pnpm test` 脚本；后端如果需要恢复单测入口，应在 `apps/backend/package.json` 中补回 test script。

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

- 应用级 MinIO / S3：原始文档快照和附件
- OCR / PDF 解析服务：图片、流程图、PDF 入库
- 文件解析：当前首版支持飞书云文档 Docx 链接导入，后续可接 docx/pdf 文件解析
- 真实 Embedding Provider：当前本地默认 hash embedding 仅用于开发验证，生产需要接真实 text-to-vector embedding provider
- Web SSO / 权限系统
- 飞书事件加密与签名完整校验

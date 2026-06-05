# Agentic RAG 多轮问答、任务规划、上下文工程与记忆工程设计方案

> 日期：2026-06-03  
> 文档定位：这是对现有 `agentic-rag-qa-system-design.md` 的补充设计文档，重点覆盖当前代码已经具备的 Agentic RAG 雏形、下一阶段任务规划升级、多轮问答、上下文工程、记忆工程、证据校验与演进路线。  
> 适用系统：业务研发知识库问答系统，面向 PRD / TRD / 研发方案 / 飞书文档知识问答。

---

## 1. 背景与结论

当前项目已经具备 Agentic RAG 的基础链路：

```text
用户问题
  -> Query Rewrite
  -> Query Planning
  -> DAG Retrieval / Step Answer
  -> Context Build
  -> Final Answer
```

对应当前代码中的主要位置：

- RAG 图编排：`apps/backend/src/ragGraph/createRagAnswerGraph.ts`
- Query 改写：`apps/backend/src/ragGraph/nodes/rewriteQueryNode.ts`
- Query 规划：`apps/backend/src/ragGraph/nodes/planQueryNode.ts`
- DAG 构建：`apps/backend/src/ragGraph/queryPlanDag.ts`
- DAG 检索执行：`apps/backend/src/ragGraph/nodes/retrieveNode.ts`
- 上下文构建：`apps/backend/src/ragGraph/nodes/buildContextNode.ts`
- 最终回答：`apps/backend/src/ragGraph/nodes/generateAnswerNode.ts`
- 问答服务入口：`apps/backend/src/services/qaService.ts`
- 前后端共享问答类型：`packages/shared/src/qa.ts`

因此，从工程形态看，当前不是从零开始，而是已经有一个 **Plan-and-Execute RAG MVP**。

但当前系统仍然有明显边界：

1. Planning 目前主要是 query decomposition，不是完整任务规划。
2. 多轮问答只有前端本地消息状态，后端没有真正的 conversation state。
3. `conversationId` 已经出现在共享类型中，但后端没有贯穿使用。
4. Context 构造仍偏单轮，缺少分层、预算、压缩、引用一致性策略。
5. Memory 工程尚未落地，系统无法长期记住用户偏好、项目目标、历史决策。
6. Agentic 能力缺少 evidence verifier、re-plan、clarification、tool selection 等关键机制。

本设计方案的核心目标是：

```text
把当前单轮 Plan-and-Execute RAG
升级为 Conversation-aware Agentic RAG
```

也就是：

```text
Conversation-aware Agentic RAG
=
会话状态
+ 历史感知 Query Rewrite
+ 结构化任务规划
+ 分步骤检索与合成
+ 证据充分性校验
+ 分层上下文构建
+ 用户/项目/会话记忆
+ 可追溯引用
```

---

## 2. 当前实现评估

### 2.1 已经实现的能力

当前系统已经实现了比较完整的 RAG MVP：

```text
飞书文档导入
  -> 文档切块
  -> Embedding
  -> 向量/关键词检索
  -> Hybrid Ranking
  -> LangGraph RAG 编排
  -> Query Rewrite
  -> Query Planning DAG
  -> 子问题检索和中间答案
  -> 最终答案生成
  -> 引用返回
```

其中，Agentic RAG 相关最关键的是 LangGraph 编排和 DAG 执行。

当前图结构固定为：

```text
START
  -> rewrite_query
  -> plan_query
  -> retrieve
  -> build_context
  -> generate_answer
  -> END
```

这个设计是一个合理的 MVP 起点，优点是：

- 链路清晰。
- 每个节点职责明确。
- Query planning 与 retrieval 解耦。
- DAG 可以表达简单多跳依赖。
- fallback 逻辑能避免 LLM planning 出错导致整个请求失败。

### 2.2 当前实现不是完整 Agent 的原因

当前系统更准确地说是 **固定 workflow 型 Agentic RAG**，而不是完整动态 Agent。

原因如下：

1. **没有动态路由**  
   所有请求都走同一条固定链路，不会根据问题类型选择不同流程。

2. **没有工具选择**  
   Planner 只拆 query，不决定调用什么工具。例如：知识库检索、记忆检索、日志查询、文档详情读取、澄清用户等。

3. **没有 evidence verifier**  
   当前回答生成后没有独立节点检查“答案是否被引用支持”。

4. **没有资料不足后的 re-plan**  
   如果某个 step 检索不足，当前通常只是生成一个弱回答，而不是自动补充检索或调整查询策略。

5. **没有多轮会话状态**  
   用户问“那它呢？”这类省略/指代问题时，后端没有持久化历史上下文可用。

6. **没有长期记忆**  
   系统不会记住用户偏好、项目约束、历史决策。

因此下一阶段不应该只继续扩展文档导入能力，而应该优先升级 RAG 核心架构。

---

## 3. 设计目标与非目标

### 3.1 设计目标

#### 目标一：支持真正的多轮问答

用户可以连续追问：

```text
第一轮：介绍一下飞书文档导入链路。
第二轮：它支持 wiki 吗？
第三轮：如果失败了，应该优先排查哪里？
```

系统应该知道第二、三轮中的“它”指的是“飞书文档导入链路”，并能把问题改写为完整独立问题。

#### 目标二：把 planning 从“拆 query”升级为“任务规划”

当前 planner 只输出：

```json
{
  "id": 1,
  "query": "...",
  "depends": []
}
```

未来 planner 应该输出：

- 问题类型。
- 是否需要澄清。
- 每一步的任务类型。
- 每一步的检索 query。
- 每一步需要什么证据。
- 每一步应该产出什么。
- 最终答案组织方式。

#### 目标三：建立分层上下文工程

不同来源的上下文应该分层管理，而不是拼成一大段文本。

上下文至少包括：

- 当前问题。
- 改写后的问题。
- 最近消息窗口。
- 会话摘要。
- 检索到的知识库片段。
- DAG 中间步骤结果。
- 用户记忆。
- 项目记忆。
- 引用和证据约束。

#### 目标四：建立记忆工程

系统应该能区分：

- 临时聊天历史。
- 会话摘要。
- 用户偏好。
- 项目长期目标。
- 历史决策。
- 可语义检索的长期记忆。

并且应该有明确写入、更新、删除、检索和注入策略。

#### 目标五：增加证据校验

最终答案不应只依赖 LLM 自信生成，而应该检查：

- 关键结论是否有引用。
- 引用是否真的支持结论。
- 是否存在资料不足却强行回答。
- 中间答案是否被错误传播。

### 3.2 非目标

本设计不是一次性要求全部实现，以下内容可以后续逐步演进：

- 完整通用 Agent 平台。
- 任意外部工具调用。
- 企业级权限系统。
- 跨租户记忆隔离。
- 复杂评估平台。
- 大规模 prompt AB 实验。

本阶段目标应该是把现有 RAG MVP 升级成结构清晰、可持续演进的 Conversation-aware Agentic RAG。

---

## 4. 总体架构设计

### 4.1 目标链路

推荐目标链路如下：

```text
用户输入
  |
  v
QaController
  |
  v
QaService.ask(question, conversationId, userId, channel)
  |
  +--> ConversationService
  |       - 创建/读取 conversation
  |       - 读取最近 N 条 messages
  |       - 读取 conversation summary
  |
  +--> MemoryService
  |       - 读取 user memory
  |       - 读取 project memory
  |       - 语义检索 related memory
  |
  v
RagGraphService.answer(input)
  |
  v
LangGraph
  |
  +--> load_context_state
  +--> history_aware_rewrite
  +--> classify_intent
  +--> plan_task_dag
  +--> execute_plan
  |       +--> retrieve_step_context
  |       +--> generate_step_answer
  |       +--> check_step_evidence
  |       +--> optional_retrieve_more
  +--> build_answer_context
  +--> generate_answer
  +--> verify_answer
  +--> maybe_repair_answer
  |
  v
返回 answer + citations + plan + stepResults
  |
  +--> 保存 user message / assistant message
  +--> 更新 conversation summary
  +--> 抽取并写入 long-term memory
```

### 4.2 架构原则

#### 原则一：用户问题、检索 query、推理任务要分开

不要把三者混在同一个字段里。

- `question`：用户真正想知道什么。
- `searchQuery`：给 retrieval 系统用的检索表达。
- `reasoningInstruction`：给 LLM 合成答案用的推理指令。

原因：

- 用户问题可能口语化，不适合直接检索。
- 检索 query 应该短、关键词明确。
- 推理任务可能需要依赖前序步骤结果，不适合直接塞进向量检索。

#### 原则二：memory 不是 evidence

记忆可以帮助理解用户，但不能替代知识库证据。

例如：

```text
记忆：用户正在做 Agentic RAG 项目。
```

这可以帮助改写问题，但不能作为回答“代码是否支持 wiki”的证据。回答代码事实仍应来自源码、文档或检索上下文。

#### 原则三：Planner 不负责回答问题

Planner 只负责：

- 判断问题类型。
- 判断是否需要澄清。
- 设计执行步骤。
- 指定每一步需要的证据和输出。

它不应该直接给最终答案。

原因：

- 避免 planner 幻觉污染后续链路。
- 避免未检索就生成结论。
- 便于执行器验证每一步。

#### 原则四：复杂问题才拆解，简单问题不要过度规划

不是所有问题都需要 DAG。

例如：

```text
飞书文档导入接口路径是什么？
```

单步检索即可。

而下面问题才需要复杂规划：

```text
比较当前 RAG 系统和理想 Agentic RAG 在 planning、多轮上下文、记忆工程上的差距，并给出改造路线。
```

#### 原则五：所有 LLM 结构化输出都要可校验、可降级

Planning、Memory extraction、Verification 都应该使用结构化 JSON 输出，并在解析失败时 fallback。

原因：

- LLM 输出不稳定。
- 线上系统不能因为一个 prompt 格式错误就失败。
- fallback 能保证最低可用性。

---

## 5. Task Planning 设计

### 5.1 当前 planning 的问题

当前 planning 的 schema 大致是：

```json
{
  "is_complex": true,
  "steps": [
    {
      "id": 1,
      "query": "子问题",
      "depends": []
    }
  ]
}
```

这个 schema 的优点是简单、容易落地，但问题是表达能力不足。

它无法表达：

- 这个问题属于事实查询、比较、总结、诊断还是决策？
- 是否需要向用户追问？
- 每一步是否真的需要检索？
- 每一步检索什么关键词？
- 每一步需要什么证据才算完成？
- 每一步输出应该是什么格式？
- 最终答案应该表格、列表、步骤说明还是推荐结论？

### 5.2 推荐的 Planning Schema

建议升级为 schema version 形式，方便未来兼容。

```json
{
  "schema_version": "agentic_rag_plan_v1",
  "is_complex": true,
  "intent": "compare",
  "need_clarification": false,
  "clarification_question": "",
  "reason": "用户要求比较多个维度，需要分别检索并综合。",
  "steps": [
    {
      "id": 1,
      "type": "retrieve",
      "question": "当前系统的 planning 设计是什么？",
      "search_query": "Agentic RAG planning planQueryNode queryPlanDag retrieveNode",
      "depends": [],
      "expected_evidence": "能说明当前 planning 节点和 DAG 执行逻辑的代码或文档。",
      "output": "当前 planning 设计摘要"
    },
    {
      "id": 2,
      "type": "retrieve",
      "question": "当前系统的多轮问答支持情况是什么？",
      "search_query": "conversationId ChatPage QaService AskQuestionRequest 多轮问答",
      "depends": [],
      "expected_evidence": "能说明 conversationId 是否贯穿、消息是否持久化的代码。",
      "output": "当前多轮能力评估"
    },
    {
      "id": 3,
      "type": "synthesize",
      "question": "基于 planning 和多轮现状，给出下一阶段改造优先级。",
      "search_query": "",
      "depends": [1, 2],
      "expected_evidence": "步骤 1 和步骤 2 的中间结论。",
      "output": "改造路线和优先级"
    }
  ],
  "final_answer": {
    "format": "分节说明 + 优先级列表 + 理由",
    "citation_required": true,
    "if_insufficient_evidence": "明确指出哪些判断缺少代码证据，不能强行下结论。"
  }
}
```

### 5.3 Step Type 设计

建议初期支持以下 step type：

| 类型 | 含义 | 是否需要检索 | 说明 |
|---|---|---:|---|
| `retrieve` | 检索知识库/代码/文档 | 是 | 最常见步骤 |
| `synthesize` | 基于依赖结果合成 | 否 | 比较、归纳、总结 |
| `verify` | 验证某个结论 | 可能 | 可再次检索证据 |
| `clarify` | 向用户追问 | 否 | 问题不清楚时中断流程 |

短期可以只落地：

```text
retrieve + synthesize
```

中期再加：

```text
verify + clarify
```

### 5.4 Intent 设计

Planner 应先识别问题类型：

| Intent | 场景 | Planning 策略 |
|---|---|---|
| `factual` | 单事实查询 | 单步检索 |
| `multi_hop` | 多跳推理 | DAG 分解 |
| `compare` | 对比多个对象 | 并行检索 + 合成 |
| `summarize` | 总结某范围资料 | 多路检索 + 聚合 |
| `diagnose` | 排查问题 | 按链路/模块拆解 |
| `decision` | 给建议/选型 | 证据 + 权衡 + 风险 |
| `ambiguous` | 问题不清楚 | 追问澄清 |

这样 planner 才不是盲目拆 query，而是根据任务类型规划执行路线。

### 5.5 DAG 校验规则

为了保证 plan 可执行，后端必须校验：

1. step id 必须是正整数。
2. step id 不能重复。
3. `depends` 只能引用存在的 step id。
4. step 不能依赖自己。
5. 不能存在环。
6. `retrieve` step 必须有 `search_query` 或可 fallback 到 `question`。
7. `synthesize` step 必须有依赖。
8. 如果 `need_clarification = true`，则不应继续执行检索，应返回澄清问题。

当前 `queryPlanDag.ts` 已经实现了部分 DAG 校验，后续可以在此基础上扩展。

### 5.6 Planning Prompt 建议

Prompt 的关键原则：

```text
你是任务规划器，不是回答器。
只能输出 JSON。
不要输出 markdown code fence。
复杂问题才拆解。
每个 retrieve step 必须可独立检索。
每个 synthesize step 必须依赖前序步骤。
depends 只能引用已有 step id。
资料不足时不要假设答案，应该设置 expected_evidence。
```

示例 Prompt：

```text
你是一个 Agentic RAG 任务规划器。
你的任务不是回答用户问题，而是把用户问题拆成可检索、可执行、可验证的任务 DAG。

输入：
- original_query: 用户原始问题
- rewritten_query: 历史感知改写后的问题
- conversation_summary: 会话摘要
- recent_messages: 最近几轮对话

要求：
1. 如果问题简单，输出 is_complex=false，steps 只保留一个 retrieve step。
2. 如果问题需要比较、归纳、多跳推理、诊断或决策，输出 is_complex=true。
3. 每个 step 必须是可以执行的任务。
4. retrieve step 的 search_query 应适合检索，不要包含过长推理文本。
5. synthesize step 用于合并依赖结果，不直接检索。
6. depends 只能引用前面已经存在的 step id。
7. 如果用户问题不清楚，need_clarification=true，并给出 clarification_question。
8. 不要回答用户问题。
9. 只能输出合法 JSON，不要输出 markdown。
```

### 5.7 为什么要这样设计 Planning

原因一：避免过度依赖单次检索。  
复杂研发问题往往需要先分别查多个模块，再综合判断。

原因二：避免中间推理不可控。  
DAG 把复杂问题拆成可观察、可验证的步骤，方便调试和展示。

原因三：便于并发。  
互不依赖的步骤可以并发检索，降低延迟。

原因四：便于未来扩展工具。  
一旦 planner 有 `type` 字段，就可以逐步支持 memory retrieval、code search、log search、document detail reading 等工具。

原因五：便于失败恢复。  
某一步资料不足时，可以只针对这一步补充检索，而不是重跑整个问题。

---

## 6. Plan Execution 设计

### 6.1 当前执行逻辑

当前 `retrieveNode` 会读取 `queryPlanDag.executionLevels`，按层级执行：

```text
level 1: 并行执行无依赖步骤
level 2: 等 level 1 完成后执行依赖步骤
...
```

这个方向是正确的。

### 6.2 推荐执行模型

每个 step 执行时应包含以下过程：

```text
Step Input
  -> 构造 retrieval query
  -> 检索知识库
  -> 去重和 rerank
  -> 构造 step context
  -> 生成 step answer
  -> 检查 step evidence sufficiency
  -> 输出 step result
```

Step result 建议结构：

```json
{
  "step_id": 1,
  "type": "retrieve",
  "question": "当前系统的 planning 设计是什么？",
  "search_query": "Agentic RAG planning planQueryNode queryPlanDag",
  "dependency_step_ids": [],
  "answer": "当前系统通过 planQueryNode 调用 PromptHub 生成 query decomposition...",
  "contexts": [],
  "evidence_status": "sufficient",
  "missing_evidence": [],
  "citations": []
}
```

### 6.3 Search Query 与 Dependency Result 的关系

当前实现中，依赖步骤结果会被拼入 retrieval query。这个方法短期可用，但长期不推荐。

问题在于：

1. 上游 step answer 如果有误，会污染后续检索。
2. 向量检索 query 变长后，可能稀释关键词。
3. 检索任务和推理任务混在一起，难以调试。

推荐做法：

```text
retrieval search_query:
  只放适合检索的关键词/问题。

step answer generation:
  使用 dependency_results + retrieved_contexts。
```

也就是：

```json
{
  "question": "比较 A 和 B 的性能风险",
  "search_query": "A B 性能 风险 压测 QPS 延迟",
  "dependency_results": ["A 性能摘要", "B 性能摘要"]
}
```

不要把完整 dependency answer 直接塞进向量检索 query。

### 6.4 Step Evidence Sufficiency

每个 retrieve step 执行后，应该判断证据是否足够。

可以先用简单规则：

```text
if contexts.length === 0:
  evidence_status = "none"
elif topScore < threshold:
  evidence_status = "weak"
else:
  evidence_status = "sufficient"
```

后续再用 LLM verifier：

```json
{
  "is_sufficient": false,
  "reason": "检索结果只说明了飞书 docx 导入，没有说明 wiki 链接处理。",
  "missing_evidence": ["wiki 链接解析逻辑", "wiki node 转 docx token 逻辑"],
  "suggested_followup_queries": [
    "feishu wiki docx token parseFeishuDocumentUrl",
    "wiki node obj_type docx FeishuDocumentService"
  ]
}
```

如果证据不足，可以进入补充检索：

```text
retrieve_step
  -> evidence_check: weak
  -> retrieve_more
  -> regenerate_step_answer
```

### 6.5 为什么需要 Step Evidence Check

原因：Agentic RAG 最容易出错的地方不是最终回答，而是中间步骤悄悄错了。

如果中间答案错了，后续 synthesize 会把错误当事实使用。  
所以每个 step 都应该有最基本的 evidence status。

---

## 7. 多轮问答设计

### 7.1 当前多轮状态

当前前后端共享类型已经有：

```ts
conversationId?: string;
```

但后端 `QaService.ask` 当前没有使用 conversationId，前端 ChatPage 也只是用 React state 保留当前页面消息。刷新页面后消息丢失，后端也无法基于历史消息理解追问。

因此当前实际是：

```text
前端看起来像多轮
后端本质是单轮
```

### 7.2 目标多轮能力

系统应该支持：

1. 同一 conversation 下连续追问。
2. 用户省略主语时能基于历史补全。
3. 能保存历史消息和引用。
4. 能维护 conversation summary。
5. 能把历史上下文用于 query rewrite 和 planning。
6. 能避免把全部历史消息无限塞进 prompt。

### 7.3 Conversation 数据模型

建议新增表：

#### conversations

```sql
CREATE TABLE conversations (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  channel TEXT NOT NULL,
  title TEXT,
  summary TEXT,
  last_topic TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### conversation_messages

```sql
CREATE TABLE conversation_messages (
  id TEXT PRIMARY KEY,
  conversation_id TEXT NOT NULL REFERENCES conversations(id),
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  citations JSONB NOT NULL DEFAULT '[]',
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### qa_logs 与 conversation 的关系

当前已有 qa log，可以增加：

```sql
ALTER TABLE qa_logs ADD COLUMN conversation_id TEXT;
```

或者将 qa log 保持审计用途，conversation_messages 负责对话上下文。

### 7.4 多轮请求流程

```text
1. 前端发送 question + conversationId + userId。
2. 如果 conversationId 不存在，后端创建 conversation。
3. 后端读取最近 N 条 messages。
4. 后端读取 conversation summary。
5. 后端读取相关 memories。
6. 执行 history-aware rewrite。
7. 基于 rewritten question 执行 planning 和 retrieval。
8. 生成答案。
9. 保存 user message。
10. 保存 assistant message。
11. 更新 conversation summary。
12. 运行 memory extractor。
13. 返回 answer + conversationId + citations。
```

### 7.5 History-aware Query Rewrite

多轮问答中，第一步不是普通 rewrite，而是 history-aware rewrite。

输入：

```json
{
  "current_question": "那它支持 wiki 吗？",
  "conversation_summary": "用户正在讨论飞书文档导入链路。",
  "recent_messages": [
    {
      "role": "user",
      "content": "介绍一下飞书文档导入链路"
    },
    {
      "role": "assistant",
      "content": "飞书文档导入链路包括 URL 解析、飞书 API 拉取、chunk、embedding、入库。"
    }
  ]
}
```

输出：

```json
{
  "rewritten_query": "飞书文档导入链路是否支持 wiki 链接？如果支持，是如何从 wiki 链接解析到 docx 文档的？",
  "resolved_references": [
    {
      "text": "它",
      "refers_to": "飞书文档导入链路"
    }
  ]
}
```

### 7.6 Conversation Summary 更新策略

不能每轮都把全部历史塞进 prompt。推荐使用：

```text
conversation_summary + recent_messages + current_question
```

Summary 更新可以每轮执行，也可以每 N 轮执行。

更新 prompt 目标：

```text
保留用户当前目标、正在讨论的对象、已经确认的结论、未解决问题。
删除寒暄、重复内容、无长期价值细节。
```

示例 summary：

```text
用户正在设计一个业务研发知识库 Agentic RAG 系统。当前关注点是当前代码是否已经实现 planning、多轮问答如何设计、context engineering 和 memory engineering 如何落地。已确认当前代码有 LangGraph 固定链路和 query plan DAG，但 conversationId 尚未贯穿后端，多轮上下文和长期记忆尚未实现。
```

### 7.7 多轮上下文窗口策略

推荐初期策略：

```text
recent_messages: 最近 6 条消息
conversation_summary: 始终保留
current_question: 始终保留
retrieved_contexts: top K
memory_contexts: top M
```

不要简单保留所有历史，因为：

1. token 成本不可控。
2. 旧消息可能干扰当前问题。
3. LLM 对长历史中的关键事实关注不稳定。
4. 隐私和权限风险更高。

---

## 8. 上下文工程设计

### 8.1 为什么需要上下文工程

RAG 系统的质量不只取决于检索和模型，也取决于给模型的上下文组织方式。

如果直接把所有内容拼成一个字符串，会出现：

- 重要内容被埋没。
- 历史消息干扰当前问题。
- memory 和 evidence 混淆。
- 引用和结论无法对应。
- token 超预算。
- 无法调试某个答案为什么生成。

因此需要结构化 context package。

### 8.2 上下文分层

推荐把上下文分成以下层：

```text
Layer 0: System Rules
Layer 1: Current Question
Layer 2: Rewritten Question
Layer 3: Conversation Summary
Layer 4: Recent Messages
Layer 5: User / Project Memory
Layer 6: Query Plan / Step Results
Layer 7: Retrieved Knowledge Contexts
Layer 8: Citation Rules
Layer 9: Output Format Rules
```

### 8.3 各层职责

#### Layer 0：System Rules

约束模型行为：

```text
- 只能基于提供资料回答知识库事实。
- 资料不足时必须说明不足。
- 不要伪造引用。
- 不要把用户记忆当作代码事实证据。
```

#### Layer 1：Current Question

用户当前输入，保留原文。

原因：

- 原文包含用户语气和意图。
- 改写可能丢失细节。

#### Layer 2：Rewritten Question

历史感知后的完整问题。

原因：

- 检索和 planning 更适合使用完整问题。
- 处理“它”“这个”“刚才那个方案”等指代。

#### Layer 3：Conversation Summary

压缩历史对话。

作用：

- 保留长期对话主题。
- 降低 token。
- 支持跨多轮追问。

#### Layer 4：Recent Messages

最近几轮原文。

作用：

- 处理局部指代。
- 保留刚刚发生的细节。
- 避免 summary 压缩损失。

#### Layer 5：Memory

长期偏好和项目事实。

必须标记来源和类型：

```json
{
  "type": "user_preference",
  "content": "用户希望先讨论架构和逻辑设计，不急着写代码。",
  "confidence": 0.95
}
```

#### Layer 6：Query Plan / Step Results

包括：

- planner 生成的 DAG。
- 每一步 query。
- 每一步 answer。
- 每一步 evidence status。

作用：让最终回答能解释推理过程。

#### Layer 7：Retrieved Knowledge Contexts

真正的知识库证据。

每个 context 应包含：

```json
{
  "id": "chunk_id",
  "docId": "doc_id",
  "title": "文档标题",
  "content": "片段内容",
  "score": 0.82,
  "sourceUrl": "..."
}
```

#### Layer 8：Citation Rules

例如：

```text
关键结论必须引用资料。
不能引用未出现在 retrieved_contexts 中的来源。
如果多个片段支持同一结论，优先引用分数高且内容直接的片段。
```

#### Layer 9：Output Format Rules

由 planner 或前端决定。

例如：

```text
请用：结论先行 + 分点说明 + 风险/不足 + 引用来源。
```

### 8.4 Context Package 示例

推荐内部使用结构化对象，不要过早拼成字符串。

```json
{
  "current_question": "那它支持 wiki 吗？",
  "rewritten_question": "飞书文档导入链路是否支持 wiki 链接？如果支持，是如何从 wiki 链接解析到 docx 文档的？",
  "conversation_summary": "用户正在讨论飞书文档导入链路和 Agentic RAG 架构。",
  "recent_messages": [
    {
      "role": "user",
      "content": "介绍一下飞书文档导入链路"
    },
    {
      "role": "assistant",
      "content": "飞书文档导入链路包括 URL 解析、飞书 API 拉取、chunk、embedding、入库。"
    }
  ],
  "memories": [
    {
      "type": "project",
      "content": "当前项目目标是构建业务研发知识库 Agentic RAG。"
    }
  ],
  "query_plan": {
    "intent": "factual",
    "steps": [
      {
        "id": 1,
        "type": "retrieve",
        "question": "飞书文档导入是否支持 wiki 链接？",
        "search_query": "feishu wiki docx parseFeishuDocumentUrl"
      }
    ]
  },
  "retrieved_contexts": [
    {
      "id": "chunk_1",
      "title": "feishuDocumentUrl.ts",
      "content": "...",
      "score": 0.91
    }
  ],
  "citation_rules": [
    "回答代码事实必须引用 retrieved_contexts。",
    "资料不足时说明不足。"
  ]
}
```

### 8.5 Context Budget 策略

建议给不同层分配预算。

假设最终回答 prompt 预算为 100%，可以先这样分配：

| 上下文层 | 预算建议 |
|---|---:|
| system rules / citation rules | 5% |
| current + rewritten question | 5% |
| conversation summary | 10% |
| recent messages | 10% |
| memory | 10% |
| step results | 20% |
| retrieved contexts | 40% |

如果 token 超预算，裁剪顺序建议：

```text
低相关 memory
  -> 较旧 recent messages
  -> 低分 retrieved contexts
  -> 冗长 step answer
  -> conversation summary 压缩
```

不要裁剪：

- 当前问题。
- 改写问题。
- 关键 citation rules。
- top 证据片段。

### 8.6 Context 与 Citation 的关系

每个进入最终 answer prompt 的 retrieved context 都应该有稳定编号。

例如：

```text
[资料 1]
标题：feishuDocumentUrl.ts
来源：...
内容：...

[资料 2]
标题：qaService.ts
来源：...
内容：...
```

最终 answer 只能引用这些资料编号。

这样 verifier 才能检查：

- 答案引用的资料是否存在。
- 资料内容是否支持答案。
- 是否引用了无关资料。

---

## 9. 记忆工程设计

### 9.1 记忆与历史消息的区别

历史消息是用户和助手说过的话。  
记忆是从历史中抽取出的长期有用事实。

两者不能混为一谈。

例如历史消息：

```text
用户：现在你不用写代码，注重项目的架构和逻辑设计。
```

可以抽取成用户偏好记忆：

```text
用户当前阶段偏好先讨论架构和逻辑设计，不急着写代码。
```

但不是所有历史消息都应该成为记忆。

### 9.2 Memory 类型

建议分四类。

#### 1. Conversation Memory

会话级记忆，生命周期通常绑定 conversation。

内容包括：

- 当前讨论主题。
- 已确认结论。
- 未解决问题。
- 最近关注模块。

存储位置：`conversations.summary` 或单独 summary 表。

#### 2. User Memory

用户级长期偏好。

例如：

```text
用户希望技术设计回答直接指出问题和改造路线。
用户倾向于先讨论架构，再写代码。
```

这类记忆跨 conversation 生效。

#### 3. Project Memory

项目级长期事实和决策。

例如：

```text
当前 RAG 项目目标是构建面向研发文档的 Agentic RAG 知识库助手。
下一阶段重点是多轮问答、上下文工程、记忆工程。
```

项目 memory 应该与 repo 或 project id 绑定。

#### 4. Semantic / Episodic Memory

可向量检索的历史经验和事件。

例如：

```text
2026-06-03 讨论过：当前代码已有 query planning DAG，但没有真正使用 conversationId。
```

适合在用户以后问“之前我们说多轮怎么设计来着？”时检索。

### 9.3 Memory 数据模型

建议新增 memories 表：

```sql
CREATE TABLE memories (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,
  scope_id TEXT,
  type TEXT NOT NULL,
  content TEXT NOT NULL,
  source TEXT NOT NULL,
  confidence DOUBLE PRECISION NOT NULL DEFAULT 1.0,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);
```

字段说明：

| 字段 | 含义 |
|---|---|
| `scope` | `user` / `project` / `conversation` |
| `scope_id` | userId / projectId / conversationId |
| `type` | `preference` / `project_fact` / `decision` / `topic` / `constraint` |
| `content` | 记忆内容 |
| `source` | 记忆来源，例如 `conversation_extraction` |
| `confidence` | 置信度 |
| `metadata` | 关联消息、时间、标签等 |
| `deleted_at` | 软删除 |

如果需要语义检索，可以增加 memory_embeddings：

```sql
CREATE TABLE memory_embeddings (
  memory_id TEXT PRIMARY KEY REFERENCES memories(id),
  embedding vector(1024),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### 9.4 Memory 写入策略

每轮问答结束后，可以运行 memory extractor。

输入：

```json
{
  "user_message": "现在你不用写代码，注重项目的架构和逻辑设计。",
  "assistant_message": "...",
  "conversation_summary": "..."
}
```

输出：

```json
{
  "should_write": true,
  "memories": [
    {
      "scope": "user",
      "type": "preference",
      "content": "用户当前阶段希望先讨论架构和逻辑设计，不急着写代码。",
      "confidence": 0.95
    }
  ]
}
```

### 9.5 什么应该写入 Memory

应该写入：

1. 用户明确表达的稳定偏好。
2. 项目的长期目标。
3. 已确认的架构决策。
4. 后续会反复使用的约束。
5. 用户明确要求“记住”的事项。
6. 多轮对话中形成的重要结论。

不应该写入：

1. 一次性临时问题。
2. 未验证的猜测。
3. 代码里已经可以直接查到的普通事实。
4. 敏感凭证、token、secret。
5. 用户没有授权保存的隐私信息。
6. 低价值寒暄。

### 9.6 Memory 更新策略

Memory 不是只增不改。

需要处理：

- 新记忆与旧记忆重复。
- 新记忆修正旧记忆。
- 用户偏好发生变化。
- 某个项目决策被废弃。

更新策略：

```text
1. 写入前先检索相似 memory。
2. 如果是重复内容，更新 updated_at 和 metadata，不新增。
3. 如果是修正内容，旧 memory 标记 superseded。
4. 如果用户明确否定某条记忆，软删除。
```

Memory metadata 示例：

```json
{
  "status": "active",
  "supersedes": ["memory_old_id"],
  "source_message_ids": ["msg_1", "msg_2"],
  "tags": ["agentic-rag", "architecture"]
}
```

### 9.7 Memory 检索策略

每次问答时，不应该注入全部 memory。

推荐检索：

```text
1. 按 scope 过滤：userId + projectId + conversationId。
2. 按 type 加权：preference、project_fact、decision 优先。
3. 对当前 rewritten question 做语义检索。
4. 取 top M。
5. 注入时标明 memory 类型，不和 evidence 混用。
```

例如：

```json
{
  "memory_contexts": [
    {
      "type": "user_preference",
      "content": "用户希望先讨论架构，不急着写代码。",
      "usage": "影响回答风格，不作为事实证据。"
    },
    {
      "type": "project_goal",
      "content": "当前项目目标是构建业务研发知识库 Agentic RAG。",
      "usage": "帮助理解用户问题背景。"
    }
  ]
}
```

### 9.8 为什么 Memory 必须和 Evidence 分离

如果不分离，模型可能出现：

```text
因为 memory 里说“当前代码支持 wiki”，所以回答代码支持 wiki。
```

这是危险的。代码事实应该来自源码或知识库检索，而不是记忆。

正确用法：

```text
memory 帮助理解用户正在问飞书文档导入。
retrieved_contexts 证明代码是否支持 wiki。
```

---

## 10. Answer Verification 设计

### 10.1 为什么需要 Verifier

RAG 常见错误：

1. 检索到了相关但不支持结论的片段。
2. 答案过度概括。
3. 引用和结论不匹配。
4. 资料不足但没有说明不足。
5. 中间 step 的错误被最终答案继承。

因此需要独立 verifier。

### 10.2 Verifier 输入

```json
{
  "question": "用户问题",
  "rewritten_question": "改写问题",
  "answer": "待验证答案",
  "citations": [],
  "retrieved_contexts": [],
  "step_results": []
}
```

### 10.3 Verifier 输出

```json
{
  "is_supported": true,
  "unsupported_claims": [],
  "missing_citations": [],
  "contradictions": [],
  "insufficient_evidence_sections": [],
  "repair_instruction": ""
}
```

如果不通过，可以进入 repair：

```text
generate_answer
  -> verify_answer: failed
  -> repair_answer
  -> final
```

### 10.4 初期可以做的轻量 Verifier

不必一开始做很复杂。可以先做规则校验：

1. 如果 answer 中出现“代码已经实现/支持/调用”等强事实，但 citations 为空，则标记风险。
2. 如果 retrieved_contexts 为空，答案必须包含“资料不足”。
3. 如果 citations 中的 sourceId 不存在于 contexts，标记错误。
4. 如果 step evidence_status 有 `none`，最终答案必须说明不足。

之后再引入 LLM verifier。

---

## 11. 与当前代码的演进映射

### 11.1 Shared Types

当前：

- `packages/shared/src/qa.ts` 已有 `conversationId?: string`。

建议扩展：

```ts
export interface AskQuestionRequest {
  question: string;
  conversationId?: string;
  userId?: string;
  channel?: QaChannel;
}

export interface AskQuestionResponse {
  conversationId: string;
  answer: string;
  rewrittenQuery?: string;
  queryPlan?: string[];
  queryPlanDag?: QueryPlanDag;
  stepResults?: QueryPlanStepResult[];
  citations: Citation[];
  contexts?: RetrievedContext[];
  qaLogId?: string;
}
```

新增更丰富的 plan 类型：

```ts
export type QueryPlanIntent =
  | 'factual'
  | 'multi_hop'
  | 'compare'
  | 'summarize'
  | 'diagnose'
  | 'decision'
  | 'ambiguous';

export type QueryPlanStepType = 'retrieve' | 'synthesize' | 'verify' | 'clarify';

export interface QueryPlanStep {
  id: number;
  type?: QueryPlanStepType;
  query: string;
  searchQuery?: string;
  depends: number[];
  expectedEvidence?: string;
  output?: string;
}

export interface QueryPlanDag {
  schemaVersion?: string;
  isComplex: boolean;
  intent?: QueryPlanIntent;
  needClarification?: boolean;
  clarificationQuestion?: string;
  steps: QueryPlanStep[];
  executionLevels: number[][];
}
```

为了兼容当前代码，`query` 和 `depends` 继续保留。

### 11.2 QaService

当前 `QaService.ask` 没有使用 conversationId。

建议目标：

```text
QaService.ask
  -> conversationService.ensureConversation
  -> conversationService.loadConversationContext
  -> memoryService.loadRelevantMemories
  -> ragGraphService.answer
  -> conversationService.appendMessages
  -> conversationSummaryService.updateSummary
  -> memoryExtractionService.extractAndUpsert
  -> qaLogRepository.createLog
```

### 11.3 RagGraphService

当前每次 answer 都 create graph。

短期可以不改。重点是 input 增加：

```ts
{
  question,
  conversationId,
  conversationSummary,
  recentMessages,
  memories,
  userId,
  channel
}
```

### 11.4 Rewrite Node

当前 rewrite 只用 question。

建议升级为 history-aware rewrite：

```text
输入：question + conversationSummary + recentMessages + memories
输出：rewrittenQuery + resolvedReferences
```

### 11.5 Plan Node

当前 plan 只输入 rewrittenQuery 和 original question。

建议增加：

```text
conversationSummary
recentMessages
memoryContext
intent examples
strict JSON schema
```

### 11.6 Retrieve Node

当前 retrieve 使用 step.query，并在有依赖时拼接 dependencyResults。

建议改为：

```text
retrieve query = step.searchQuery || step.query
answer generation input = step.question + dependencyResults + contexts
```

### 11.7 Build Context Node

当前 build context 主要处理 retrieved contexts。

建议升级为 ContextBuilder：

```text
buildFinalAnswerContext({
  currentQuestion,
  rewrittenQuestion,
  conversationSummary,
  recentMessages,
  memories,
  queryPlan,
  stepResults,
  retrievedContexts,
  citationRules,
  outputFormat
})
```

### 11.8 Generate Answer Node

当前 generate answer 使用：

```text
query
contexts
step_results
```

建议增加：

```text
conversation summary
recent messages
memory contexts
answer format
insufficient evidence policy
```

### 11.9 新增 Verify Answer Node

在图中增加：

```text
build_context
  -> generate_answer
  -> verify_answer
  -> repair_answer?  // 条件执行
  -> END
```

---

## 12. 推荐演进路线

### Phase 1：补齐 Conversation 基础能力

目标：让多轮问答真正可用。

任务：

1. 新增 conversations 表。
2. 新增 conversation_messages 表。
3. `AskQuestionResponse` 返回 conversationId。
4. 前端保存当前 conversationId。
5. 后端读取最近 N 条消息。
6. 后端保存 user/assistant message。
7. `QaService.ask` 贯穿 conversationId。

验收标准：

- 刷新页面后可以恢复历史会话，或者至少后端能按 conversationId 找到历史。
- 第二轮问“它支持吗”时，rewrite 能补全“它”的指代。

### Phase 2：History-aware Rewrite + Conversation Summary

目标：解决省略和指代问题。

任务：

1. Rewrite node 输入 recentMessages 和 summary。
2. 新增 conversation summary 更新逻辑。
3. Summary 每轮或每 N 轮更新。
4. prompt 明确输出 rewritten query。

验收标准：

- 多轮追问能生成完整 rewrittenQuery。
- summary 不无限增长。

### Phase 3：Planning Schema 升级

目标：把 planning 从 query list 升级成 task plan。

任务：

1. 扩展 QueryPlanDag 类型。
2. Planner 输出 intent、type、search_query、expected_evidence。
3. DAG 校验兼容新字段。
4. Retrieve node 使用 search_query。
5. Synthesize step 不直接检索。

验收标准：

- 比较类问题能生成并行 retrieve + synthesize DAG。
- 诊断类问题能按链路拆解。
- 简单事实问题不会过度拆解。

### Phase 4：Memory 工程 MVP

目标：支持用户偏好和项目事实记忆。

任务：

1. 新增 memories 表。
2. 新增 MemoryService。
3. 每轮问答后运行 memory extractor。
4. 写入前做去重。
5. 问答前按 user/project/conversation 读取相关 memory。
6. prompt 中明确 memory 不是 evidence。

验收标准：

- 系统能记住用户偏好，例如“先讲架构，不急着写代码”。
- 系统不会把 memory 当作代码事实引用。

### Phase 5：Evidence Verifier

目标：降低幻觉和引用不一致。

任务：

1. 增加 step evidence status。
2. 增加 final answer verifier。
3. 失败时 repair answer。
4. 返回中展示资料不足点。

验收标准：

- 无检索结果时不会强答。
- 引用为空时不会声称“代码已经实现”。
- 答案中的关键结论可以追溯到 contexts。

### Phase 6：Re-plan / Retrieve More

目标：让 Agentic RAG 能在证据不足时自我修复。

任务：

1. Evidence checker 输出 suggested_followup_queries。
2. 对弱证据 step 追加检索。
3. 重新生成 step answer。
4. 限制最大 retry 次数。

验收标准：

- 第一次检索不足时，系统能自动补充检索。
- 不会无限循环。

---

## 13. 风险与取舍

### 13.1 复杂度风险

如果一次性加入 conversation、memory、verifier、replan，系统复杂度会上升很快。

建议按阶段演进，不要一次性重构全部。

优先级应该是：

```text
conversationId 贯穿
  -> history-aware rewrite
  -> planning schema 升级
  -> memory MVP
  -> verifier
  -> replan
```

### 13.2 延迟风险

多节点 LLM 调用会增加延迟。

优化方式：

1. 简单 factual 问题跳过复杂 planning。
2. memory extraction 可以异步。
3. summary update 可以异步或每 N 轮执行。
4. verifier 可以先做轻量规则，再升级 LLM。
5. DAG 同层并发执行。

### 13.3 Memory 污染风险

错误记忆会长期影响系统。

控制方式：

1. 写入前要求高置信度。
2. 保存 source message id。
3. 支持用户删除/纠正。
4. memory 只作为理解上下文，不作为事实证据。
5. 项目事实优先从代码/文档检索验证。

### 13.4 Prompt 漂移风险

如果 PromptHub 中 planning prompt 改坏，系统可能退化。

控制方式：

1. 所有结构化输出加 schema validation。
2. 解析失败要记录 warning。
3. fallback 到单步 RAG。
4. 保留 prompt key 配置化。
5. 增加 golden test。

---

## 14. 评估指标

### 14.1 多轮能力指标

- 指代问题改写准确率。
- conversationId 贯穿成功率。
- 历史上下文使用正确率。
- 追问回答相关性。

### 14.2 Planning 指标

- 简单问题不过度拆解率。
- 复杂问题合理拆解率。
- DAG 合法率。
- step 检索命中率。
- step answer 可用率。

### 14.3 RAG 质量指标

- 答案有引用比例。
- 引用支持结论比例。
- 资料不足时正确拒答/弱答比例。
- 幻觉率。
- 用户追问率。

### 14.4 Memory 指标

- 有效记忆写入率。
- 重复记忆率。
- 错误记忆率。
- memory 命中后回答改善率。
- 用户纠正 memory 次数。

---

## 15. 推荐的最终形态

最终系统应该具备以下能力：

```text
用户问一个研发问题
  |
  v
系统知道这是哪个 conversation、哪个 user、哪个 project
  |
  v
系统读取最近对话、会话摘要、相关 memory
  |
  v
系统把省略问题改写成完整问题
  |
  v
系统判断问题类型，是事实、比较、诊断还是决策
  |
  v
系统生成结构化 DAG plan
  |
  v
系统按步骤检索知识库，并生成中间答案
  |
  v
系统检查每一步证据是否足够
  |
  v
系统必要时补充检索或说明资料不足
  |
  v
系统生成最终答案和引用
  |
  v
系统验证答案是否被证据支持
  |
  v
系统保存会话，更新摘要，抽取长期记忆
```

这才是适合业务研发知识库的 Agentic RAG。

---

## 16. 一句话总结

当前代码已经有 Agentic RAG 的骨架，但还处在单轮 Plan-and-Execute RAG 阶段。下一阶段的关键不是继续堆更多文档来源，而是围绕 **conversation state、structured planning、context engineering、memory engineering、evidence verification** 做系统化升级。这样系统才能从“能检索资料并回答”进化为“能理解连续意图、规划任务、校验证据、沉淀记忆”的研发知识库 Agent。 

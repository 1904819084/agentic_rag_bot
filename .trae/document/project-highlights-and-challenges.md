# Agentic RAG 项目亮点与难点梳理

## 项目定位

本项目是一个面向业务研发场景的知识库问答系统，目标不是简单做“文档问答”，而是让研发人员能够围绕 PRD、TRD、历史方案和技术决策进行可追溯、多轮、可评测的问答。

系统当前覆盖了文档导入、Markdown 化、语义切分、混合检索、多轮会话、用户记忆、Agentic RAG 推理、引用展示、评测体系和 MQ 异步评测任务等能力。

## 核心亮点

### 1. 文档处理链路比较完整

系统支持飞书 Docx 链接和本地文件上传两类入口，本地文件覆盖 TXT、Markdown、DOCX、PDF、HTML、CSV、XLSX、XML、JSON 等格式。非 Markdown 文件会优先通过 `markitdown-ts` 转换为 Markdown，TXT / Markdown 走轻量清洗。

这比直接把原始文本按固定长度切块更可靠。Markdown 结构可以保留标题、段落、列表和表格等语义信息，为后续父块和子块切分提供更好的结构基础。

### 2. 父块 / 子块双层切分

项目没有直接把所有内容切成固定大小 chunks，而是设计了 parent chunk 和 child chunk 两层结构：

- parent chunk：按 Markdown 标题和章节语义组织，作为最终给 LLM 生成答案的上下文。
- child chunk：按段落和句子递归切分，作为检索和 embedding 的最小召回单元。

这样做的好处是兼顾检索精度和生成上下文完整性。检索阶段用更细的 child chunk 提升命中率，生成阶段回表取 parent chunk，避免只给模型碎片化句子导致语义缺失。

### 3. 混合检索与重排

检索层支持 keyword、vector、hybrid 三种模式，默认使用 hybrid。系统会结合 PostgreSQL 全文检索、pgvector 向量检索、RRF 融合和 query overlap 重排。

这能缓解单纯向量检索在代码名、接口名、业务名词、缩写、字段名等场景下不稳定的问题，也能弥补纯关键词检索对语义改写和同义表达支持不足的问题。

### 4. Agentic RAG 任务规划

问答链路不是单次检索加单次生成，而是通过 LangGraph 编排：

```text
rewrite_query -> plan_query -> execute_plan -> build_context -> generate_answer
```

planning agent 输出简化后的任务计划：

```ts
tasks: Array<{
  id: number;
  type: 'retrieve' | 'reasoning';
  query: string;
  dependsOn: number[];
}>
```

这使系统可以处理多跳问题、对比问题、诊断问题和决策类问题。任务之间通过 `dependsOn` 表达依赖关系，执行层可以根据 DAG 层级推进。

### 5. 检索任务与推理任务职责清晰

系统把计划任务明确分为两类：

- `retrieve`：只做检索，不调用大模型。
- `reasoning`：基于依赖步骤结果和命中的父块上下文调用 Fornax 进行中间推理。

这个划分减少了不必要的 LLM 调用，也让执行链路更可解释。用户可以看到每个子任务的查询、类型、依赖关系、命中上下文和阶段性答案。

### 6. 多轮会话和用户记忆

系统支持会话侧栏、历史消息加载、新建会话、修改标题、删除会话等完整会话能力。后端会维护会话摘要和最近消息，用于后续问题上下文。

用户记忆只保存显式偏好和约束，并明确不作为知识库事实证据。这一点很重要：它能影响回答风格和偏好，但不会污染 RAG 的事实来源。

### 7. 引用概念拆分清楚

系统把模型使用的资料上下文和前端展示的参考文档拆开：

- 生成阶段使用 parent chunk 内容，格式化为 `[资料 N]`。
- 前端展示使用去重后的 `referenceDocuments`。

这样避免了“模型引用编号”和“前端文档编号”混在一起，也解决了同一个文档因为命中多个父块而在参考文档里重复出现的问题。

### 8. 评测体系从一开始就纳入架构

项目不是只做功能演示，而是加入了 RAG 评测体系：

- Retrieval Eval：`parentRecall@K`
- Generation Eval：`answerCorrectness`
- Generation Eval：`answerFaithfulness`
- Generation Eval：`answerCompleteness`
- End-to-End Eval：真实跑完整 RAG 链路并汇总指标

评测任务通过 BullMQ + Redis 异步执行，API 只负责创建任务和入队，worker 负责真实运行。前端评测台可以查看数据集、任务列表、summary 和 case 明细。

### 9. MQ 解耦评测任务

评测任务可能耗时长、依赖 Fornax、embedding、数据库和检索链路。项目把评测从 API 进程中拆出，形成：

```text
POST /api/evals/task
-> eval_tasks status = queued
-> BullMQ
-> evalWorker
-> running / succeeded / failed
```

worker 重启时会把 `running` 任务恢复为 `queued` 并重新投递 MQ，避免任务卡死。这个设计也为后续文档入库异步化、聊天问答异步化打下基础。

## 核心难点

### 1. 文档格式多样，结构容易丢失

业务研发文档可能来自飞书、Markdown、Word、PDF、表格和半结构化文件。不同格式转成纯文本后很容易丢标题层级、列表结构、表格关系和段落边界。

项目里的处理策略是先尽量转为 Markdown，再基于 Markdown 标题和编号标题提升逻辑进行结构化切分。这样能让后续 parent chunk 更接近真实章节，而不是一段随机文本。

难点在于：转换质量会直接影响切分质量，切分质量又会影响检索召回和答案生成。文档处理不是一个边缘模块，而是整个 RAG 质量的入口。

### 2. 父块和子块粒度需要权衡

如果父块太大，生成上下文容易冗余，模型可能抓不住重点；如果父块太小，答案会缺少完整背景。  
如果子块太大，检索不够精准；如果子块太小，语义被切碎，召回结果可能缺少判断依据。

项目采用“父块按结构，子块按段落句子递归”的方式，是在检索精度和生成完整性之间做折中。

### 3. 检索命中和答案生成之间容易断层

RAG 常见问题是：检索看起来命中了，但最终答案仍然答不出来。原因可能包括：

- 命中的是 child chunk，但给 LLM 的上下文太碎。
- 命中了同一文档的局部内容，但缺少父章节背景。
- 多个子任务各自命中，最终生成阶段没有正确整合。
- 用户问题需要推理，而不是简单摘录。

本项目通过 child 命中后回表 parent 内容、step results 传递、reasoning 任务和最终 answer node 来缓解这个断层。

### 4. Agentic RAG 的状态和类型容易膨胀

早期任务规划如果返回过多字段，例如 intent、evidenceStatus、复杂 metadata，会导致执行层和前端展示都被复杂类型绑住。

项目后续把 planning 输出收敛到最小结构：

```ts
id
type
query
dependsOn
```

这是一个重要取舍：保留执行必须信息，删除难以稳定维护的推断字段，让执行器更容易重构。

### 5. 检索任务和推理任务边界要严格

如果所有子任务都调用 LLM，系统会变慢、变贵，也更难定位问题。  
如果所有子任务都只检索，又无法处理依赖推理、多跳整合和诊断类问题。

因此项目把任务类型收敛为 `retrieve` 和 `reasoning`，并规定：

- `retrieve` 不走 Fornax。
- `reasoning` 才走 Fornax。

这个边界让性能、成本和可解释性都更可控。

### 6. 评测指标需要和系统对象对齐

检索评测容易混淆“召回文档”和“召回 chunk”。当前系统真实召回对象是 parent chunk，因此评测指标使用 `parentRecall@K`，而不是 document recall。

这个选择能更准确地反映当前检索链路是否找到了生成答案所需的上下文。否则如果只评估 document 命中，可能文档对了但章节错了，最终答案仍然失败。

### 7. 生成质量评测需要控制主观性

`answerCorrectness`、`answerFaithfulness`、`answerCompleteness` 需要 LLM judge 判断，天然存在主观性和波动。项目通过固定 eval case、expected answer points、forbidden claims 和 judge prompt 来降低波动。

这类评测不能只看一次结果，更适合做回归比较：同一批 case，在改检索、切分、prompt、执行器后比较指标变化。

### 8. 长任务必须脱离 API 进程

评测任务已经通过 MQ 解耦。这个经验也暴露出类似问题：文档入库、embedding、聊天生成如果耗时增加，也会拖住 API 请求。

当前评测任务已完成拆分，文档入库和聊天生成后续也可以按同样模式演进：

```text
API 创建任务
DB 记录状态
MQ 排队
worker 执行
前端轮询状态
```

难点不只是接入 MQ，而是要明确任务状态机、失败恢复、重复消费防护和前端体验。

### 9. 数据库状态和代码定义需要持续同步

项目已经经历了多次结构调整：本地文档字段、query plan metadata 简化、eval tasks 表、状态枚举变更等。  
这类系统如果没有迁移意识，很容易出现代码以为字段存在、数据库实际没有的情况。

当前项目通过 SQL migrations 管理这些变化，并已确认数据库和当前定义同步。

## 可讲述的技术价值

这个项目的价值不只是“接一个大模型问答”，而是搭建了一套比较完整的 RAG 工程闭环：

1. 文档进入系统时，尽量保留结构和语义。
2. 检索阶段用 child chunk 提高召回精度。
3. 生成阶段回到 parent chunk 保证上下文完整。
4. 多跳问题通过 planning 和 DAG 执行拆解。
5. 引用、步骤、上下文对用户可解释。
6. 评测系统能量化检索和生成质量。
7. MQ 任务化让长任务和 API 解耦。

如果后续继续推进，最值得投入的方向是：

- 文档入库任务 MQ 化。
- 聊天问答任务 MQ 化或 SSE 流式化。
- 评测结果入库，支持历史对比。
- 更细的检索诊断面板，展示 query、child hit、parent context 和最终引用之间的链路。
- 对不同文档类型建立更稳定的 Markdown 转换和结构恢复策略。

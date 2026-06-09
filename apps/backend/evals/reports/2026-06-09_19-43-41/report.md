# Agentic RAG Eval Report

Generated At: 2026-06-09 19:43:41

Total Cases: 6

## Summary

| Metric                |  Score |
| --------------------- | -----: |
| parentRecall@8        | 100.0% |
| answerCorrectnessAvg  |  95.0% |
| answerFaithfulnessAvg | 100.0% |
| answerCompletenessAvg |  96.7% |

## Failure Counts

| Reason               | Count |
| -------------------- | ----: |
| pass                 |     5 |
| retrieval_failure    |     0 |
| faithfulness_failure |     0 |
| generation_failure   |     1 |
| incomplete_answer    |     0 |

## Cases

### case_01

Question: AI智能成片资源分配初版为什么要做？目标是什么？

Likely Cause: pass

Metrics:

- parentRecall@8: 100.0%
- answerCorrectness: 100.0%
- answerFaithfulness: 100.0%
- answerCompleteness: 100.0%

Retrieved Parent IDs:

- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_6_5
- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_4_3
- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_0_260324-AI-PRD-AI---202603--Meego-P0-AI-Bits-http
- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_1_1
- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_5_4
- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_2_2-1
- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_3_2-2

Missing Answer Points:

- 无

Unsupported Claims:

- 无

Answer:

### AI智能成片资源分配初版的开发原因

当前AI智能成片使用量持续上涨，日均生成视频量约3.5万条，已触达资源瓶颈。资源不足导致高峰期生成排队现象频发，排队时长可达数小时，生成耗时显著高于产品早期预估，这会影响商家的使用体验与成片发布率。[资料 4]

### AI智能成片资源分配初版的目标

1. **优化资源分配，保障核心用户体验**：通过“用户分级+双队列并发控制”的方式，在资源有限的前提下优先保障核心用户的使用体验。[资料 4]
2. **升级预估耗时展示，提升用户预期清晰度**：对前台“生成中”状态的预估耗时表达进行同步升级，基于后端计算的预计耗时生成更精准的分段展示文案，让商家对生成时长的预期更明确、可解释。[资料 4]
3. **兼容现有逻辑，保证服务稳定性**：确保队列相关字段仅在实验组生效时，对照组（单队列）返回值可兼容，当接口字段缺失或异常时，按兜底策略回退，维持现有展示能力。[资料 1][资料 2][资料 5]

### case_02

Question: 这次前端改造覆盖哪些生成中预计耗时展示场景？

Likely Cause: generation_failure

Metrics:

- parentRecall@8: 100.0%
- answerCorrectness: 70.0%
- answerFaithfulness: 100.0%
- answerCompleteness: 80.0%

Retrieved Parent IDs:

- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_6_5
- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_4_3
- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_0_260324-AI-PRD-AI---202603--Meego-P0-AI-Bits-http
- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_1_1
- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_5_4
- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_2_2-1
- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_3_2-2

Missing Answer Points:

- 大于一小时在建议稍后查看类文案旁新增提示 icon

Unsupported Claims:

- 无

Answer:

这次前端改造覆盖的生成中预计耗时展示场景如下：

### 1. PC端生成记录批次标题

入口页面：`apps/creative/web/src/pages/ai-generate-video-v1`右侧「生成结果」区域，对应`BatchAIVideoList`的批次标题（`useBatchVideoTitle`）。改造后基于接口返回的`estimatedSeconds`生成分段文案，替代原有的静态配置文案。[资料 6]

### 2. PC&移动端视频管理列表「生成中」状态描述

入口：`ai-generate-video-v1`内「视频管理」抽屉（PCWeb），状态列下方描述信息（`VideoStatusMap[Generating].desc`），PC和移动端逻辑统一。改造为基于`estimatedSeconds`计算的分段文案。[资料 6]

### 3. 移动端视频生成Sheet弹窗「生成中」状态描述

入口：`AIGeneratedVideo/components/VideoGeneratingSheets`内「VideoGeneratingSheets」弹窗。改造为基于`estimatedSeconds`计算的分段文案。[资料 6]

以上场景均只针对「生成中」状态的预计耗时展示进行文案与交互升级，不涉及高优/低优队列的身份或权益展示。[资料 6]

### case_03

Question: AI智能成片资源分配初版明确不做什么？

Likely Cause: pass

Metrics:

- parentRecall@8: 100.0%
- answerCorrectness: 100.0%
- answerFaithfulness: 100.0%
- answerCompleteness: 100.0%

Retrieved Parent IDs:

- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_1_1
- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_4_3
- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_0_260324-AI-PRD-AI---202603--Meego-P0-AI-Bits-http
- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_6_5
- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_3_2-2
- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_2_2-1
- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_5_4

Missing Answer Points:

- 无

Unsupported Claims:

- 无

Answer:

AI智能成片资源分配初版明确不做的内容有：

1. 不新增入口/权益展示，仅改造既有“生成中”预计耗时表达。[资料 5]
2. 不新增或外化“高优/低优队列”身份/权益展示；队列分级与权益策略对商家不可控且可能动态调整，因此前台不展示分级。[资料 6]

### case_04

Question: 接口没有返回 estimatedSeconds 或返回异常时，预计耗时文案怎么兜底？

Likely Cause: pass

Metrics:

- parentRecall@8: 100.0%
- answerCorrectness: 100.0%
- answerFaithfulness: 100.0%
- answerCompleteness: 100.0%

Retrieved Parent IDs:

- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_4_3
- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_5_4
- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_2_2-1
- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_6_5
- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_0_260324-AI-PRD-AI---202603--Meego-P0-AI-Bits-http
- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_1_1
- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_3_2-2

Missing Answer Points:

- 无

Unsupported Claims:

- 无

Answer:

当接口没有返回estimatedSeconds或返回异常时，预计耗时文案的兜底处理遵循以下两级策略：

1. **优先回退至现有文案**
   优先使用已有的`taskStyleConfig.estimatedGenerateTime`文案，保持当前线上已有的展示能力。[资料 1][资料 2]

2. **统一兜底文案**
   如果`taskStyleConfig.estimatedGenerateTime`也为空，则统一使用兜底文案：**预计需要10分钟**。[资料 1]

### case_05

Question: 前端展示预计耗时依赖哪个接口字段？落地时需要同步什么类型定义？

Likely Cause: pass

Metrics:

- parentRecall@8: 100.0%
- answerCorrectness: 100.0%
- answerFaithfulness: 100.0%
- answerCompleteness: 100.0%

Retrieved Parent IDs:

- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_6_5
- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_4_3
- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_0_260324-AI-PRD-AI---202603--Meego-P0-AI-Bits-http
- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_1_1
- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_5_4
- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_2_2-1
- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_3_2-2

Missing Answer Points:

- 无

Unsupported Claims:

- 无

Answer:

前端展示预计耗时依赖与类型定义同步说明如下：

**一、依赖的接口字段**
前端展示预计耗时依赖`/api/content/ai/video/get_shop_aivideo_list`接口返回的`AIVideo`中的`estimatedSeconds`字段，该字段由后端根据队列/资源模型计算，单位为秒。[资料 2][资料 5][资料 6]
当该字段缺失或返回异常时，会按兜底策略回退使用`taskStyleConfig.estimatedGenerateTime`的文案。[资料 2][资料 5]

**二、落地时需要同步的类型定义**
实现落地时需要同步更新`@ecom/bam-types`或本仓库`packages/bam`生成的`AIVideo`类型定义，将`estimatedSeconds`字段包含进去。[资料 5]

### case_06

Question: 如果队列相关字段只在实验组生效，兼容性上要注意什么？

Likely Cause: pass

Metrics:

- parentRecall@8: 100.0%
- answerCorrectness: 100.0%
- answerFaithfulness: 100.0%
- answerCompleteness: 100.0%

Retrieved Parent IDs:

- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_1_1
- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_4_3
- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_0_260324-AI-PRD-AI---202603--Meego-P0-AI-Bits-http
- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_6_5
- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_5_4
- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_3_2-2
- local_c2faaa06e4cef3ef3b55460980fe39573571f301756d2cfe4063a878df83e9cd_p_2_2-1

Missing Answer Points:

- 无

Unsupported Claims:

- 无

Answer:

如果队列相关字段只在实验组生效，兼容性上需要注意以下事项：

1. **接口交互兼容性**
   需保证对照组（单队列）返回值兼容，当队列相关字段缺失时，前端要按兜底策略回退。具体为优先使用现有`taskStyleConfig.estimatedGenerateTime`文案展示，若该文案也为空，则统一显示“预计需要10分钟”[资料 2][资料 4][资料 5]。同时，要同步更新AIVideo的类型定义，将新增的estimatedSeconds字段包含在内[资料 5]。
2. **上下游依赖兼容性**
   前端依赖后端接口`/api/content/ai/video/get_shop_aivideo_list`返回的`estimatedSeconds`字段进行展示，后端负责该字段的计算，需确保实验组该字段正常返回，对照组无该字段时前端能触发兜底逻辑[资料 5]。同时不新增与队列分级相关的入口或权益展示，避免对上下游系统产生额外依赖[资料 6][资料 7]。
3. **数据存储读取兼容性**
   当前资料未提及数据存储与读取相关的具体兼容性规则，暂无法明确该场景下的注意事项。

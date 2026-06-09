# Agentic RAG Eval Report

Generated At: 2026-06-09 19:50:39

Total Cases: 6

## Summary

| Metric                |  Score |
| --------------------- | -----: |
| parentRecall@8        | 100.0% |
| answerCorrectnessAvg  | 100.0% |
| answerFaithfulnessAvg | 100.0% |
| answerCompletenessAvg | 100.0% |

## Failure Counts

| Reason               | Count |
| -------------------- | ----: |
| pass                 |     6 |
| retrieval_failure    |     0 |
| faithfulness_failure |     0 |
| generation_failure   |     0 |
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

### 一、AI智能成片资源分配初版的立项原因

AI智能成片使用量持续上涨，日均生成视频量约3.5万条，已触达当前资源瓶颈。资源不足导致高峰期生成排队（可达数小时）频发，生成耗时显著高于产品早期预估，影响商家使用体验与成片发布率。[资料 4]

### 二、AI智能成片资源分配初版的目标

1. **资源优化分配**：通过“用户分级+双队列并发控制”的方式，在资源有限前提下保障核心用户体验。[资料 4]
2. **升级耗时展示**：对前台的“生成中”状态的预估耗时表达做同步升级，使商家对生成时长预期更明确、可解释。具体包括：
   - 生成记录（PC）批次标题预计耗时文案升级；
   - 视频管理列表（PC/Mobile同逻辑）「生成中」状态描述预计耗时文案升级；
   - 视频生成Sheet（Mobile）「生成中」状态描述预计耗时文案升级。[资料 4][资料 6]
3. **兼容性保障**：确保队列相关字段在实验组生效时，对照组（单队列）返回值兼容，字段缺失时按兜底策略回退。[资料 1]

### case_02

Question: 这次前端改造覆盖哪些生成中预计耗时展示场景？

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

这次前端改造覆盖的生成中预计耗时展示场景如下：

### 1. PC端生成记录页面的批次标题

入口页面：`apps/creative/web/src/pages/ai-generate-video-v1`右侧「生成结果」区域，具体展示位置为`BatchAIVideoList`的批次标题（`useBatchVideoTitle`）。
改造内容：将原有的基于视频类型配置的静态预计耗时文案，升级为基于接口返回的`estimatedSeconds`生成的分段文案；若预计耗时大于一小时，在文案旁新增提示icon，hover时显示固定提醒文案。[资料 6]

### 2. 多端视频管理列表的「生成中」状态描述

入口：PCWeb端`ai-generate-video-v1`内的「视频管理」抽屉，移动端对应页面的状态列下方描述信息（`VideoStatusMap[Generating].desc`）。
改造内容：将原有的`预计需要{estimatedGenerateTime}`静态文案，改为基于接口返回的`estimatedSeconds`计算出的分段文案；若预计耗时大于一小时，新增提示icon并显示固定hover提醒文案。[资料 6]

### 3. 移动端视频生成Sheet弹窗的「生成中」状态描述

入口：`AIGeneratedVideo/components/VideoGeneratingSheets`内的「VideoGeneratingSheets」弹窗。
改造内容：将原有的`预计需要{estimatedGenerateTime}`静态文案，改为基于接口返回的`estimatedSeconds`计算出的分段文案；若预计耗时大于一小时，新增提示icon并显示固定hover提醒文案。[资料 6]

本次改造仅覆盖以上「生成中」场景的预计耗时展示（文案与交互）升级，不新增或外化“高优/低优队列”相关的身份或权益展示。[资料 6]

### case_03

Question: AI智能成片资源分配初版明确不做什么？

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

AI智能成片资源分配初版明确不做的内容如下：

1. 不新增或外化“高优/低优队列”身份/权益展示，队列分级与权益策略对商家不可控且可能动态调整，因此前台不展示分级。[资料 6]
2. 不新增入口/权益展示，仅改造既有“生成中”预计耗时表达。[资料 7]

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

当接口没有返回estimatedSeconds或返回异常时，预计耗时文案需按以下两级兜底策略处理：

1. **优先回退**：使用现有`taskStyleConfig.estimatedGenerateTime`文案，保持当前线上已有的展示能力。[资料 1][资料 2]
2. **终极兜底**：如果`taskStyleConfig.estimatedGenerateTime`也为空，则统一使用文案：**预计需要10分钟**。[资料 1]

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

### 前端展示预计耗时依赖的接口字段：

依赖接口`/api/content/ai/video/get_shop_aivideo_list`返回的`AIVideo`对象中的`estimatedSeconds`字段（单位为秒，由后端根据队列/资源模型计算得出）。当该字段缺失或返回异常时，会按兜底策略回退使用`taskStyleConfig.estimatedGenerateTime`。[资料 2][资料 5][资料 6]

### 落地时需要同步的类型定义：

需要同步更新`@ecom/bam-types`或本仓库`packages/bam`生成的`AIVideo`类型定义，将`estimatedSeconds`字段包含其中。[资料 5]

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

如果队列相关字段只在实验组生效，兼容性上需要注意以下两点：

1. **接口返回值兼容处理**
   需保证对照组（单队列）返回值兼容，当队列相关字段（如`estimatedSeconds`）缺失或返回异常时，前端要执行兜底策略：优先回退为现有`taskStyleConfig.estimatedGenerateTime`文案，若该文案仍为空，则统一使用“预计需要10分钟”作为兜底内容。[资料 4][资料 2][资料 5]

2. **类型定义同步更新**
   实现落地时要同步更新AIVideo的类型定义（`@ecom/bam-types`/本仓库`packages/bam`生成的AIVideo类型），使其包含新增的队列相关字段（如`estimatedSeconds`）。[资料 5]

另外，在业务逻辑上需注意：无论实验组还是对照组，前台均不展示“高优/低优队列”的身份或权益相关内容，仅做“生成中”场景的预计耗时表达改造。[资料 7]

当前资料未提及数据存储读取层面的兼容性注意事项，无法提供相关内容。

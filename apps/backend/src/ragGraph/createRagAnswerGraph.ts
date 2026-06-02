import { END, START, StateGraph } from '@langchain/langgraph';
import RetrievalService from '../services/retrievalService';
import { createBuildContextNode } from './nodes/buildContextNode';
import { createGenerateAnswerNode } from './nodes/generateAnswerNode';
import { createPlanQueryNode } from './nodes/planQueryNode';
import { createRetrieveNode } from './nodes/retrieveNode';
import { createRewriteQueryNode } from './nodes/rewriteQueryNode';
import { RagGraphState } from './ragGraphState';

const NODE = {
  RewriteQuery: 'rewrite_query',
  PlanQuery: 'plan_query',
  Retrieve: 'retrieve',
  BuildContext: 'build_context',
  GenerateAnswer: 'generate_answer',
} as const;

export function createRagAnswerGraph({ retrievalService }: { retrievalService: RetrievalService }) {
  return new StateGraph(RagGraphState)
    .addNode(NODE.RewriteQuery, createRewriteQueryNode())
    .addNode(NODE.PlanQuery, createPlanQueryNode())
    .addNode(NODE.Retrieve, createRetrieveNode(retrievalService))
    .addNode(NODE.BuildContext, createBuildContextNode())
    .addNode(NODE.GenerateAnswer, createGenerateAnswerNode())
    .addEdge(START, NODE.RewriteQuery)
    .addEdge(NODE.RewriteQuery, NODE.PlanQuery)
    .addEdge(NODE.PlanQuery, NODE.Retrieve)
    .addEdge(NODE.Retrieve, NODE.BuildContext)
    .addEdge(NODE.BuildContext, NODE.GenerateAnswer)
    .addEdge(NODE.GenerateAnswer, END)
    .compile();
}

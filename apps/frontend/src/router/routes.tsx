import {
  CommentOutlined,
  FileTextOutlined,
  HistoryOutlined,
  SyncOutlined,
} from '@ant-design/icons';
import type { ReactNode } from 'react';
import ChatPage from '../pages/ChatPage';
import DocumentsPage from '../pages/DocumentsPage';
import QaLogsPage from '../pages/QaLogsPage';
import SyncJobsPage from '../pages/SyncJobsPage';

/**
 * 应用导航分组 key，仅用于 sider 中分组展示。
 */
export type RouteGroup = '工作台' | '知识管理' | '系统日志';

export interface AppRoute {
  /** 导航 key，路径首段，唯一标识 */
  key: string;
  /** 路由路径 */
  path: string;
  /** 导航与 header 显示文案 */
  label: string;
  /** 一句话描述，header 副标题与导航 tooltip 共用 */
  description: string;
  /** 导航图标 */
  icon: ReactNode;
  /** 所属导航分组 */
  group: RouteGroup;
  /** 路由 element */
  element: ReactNode;
}

/**
 * 全应用路由 / 导航 SSOT。
 * 新增页面只需在此追加一项。
 */
export const ROUTES: AppRoute[] = [
  {
    key: 'chat',
    path: '/chat',
    label: '研发问答',
    description: '基于 PRD/TRD 的决策追溯问答',
    icon: <CommentOutlined />,
    group: '工作台',
    element: <ChatPage />,
  },
  {
    key: 'documents',
    path: '/documents',
    label: 'PRD / TRD 文档',
    description: '查看与导入研发知识文档',
    icon: <FileTextOutlined />,
    group: '知识管理',
    element: <DocumentsPage />,
  },
  {
    key: 'sync',
    path: '/sync',
    label: '同步任务',
    description: '飞书云文档同步状态',
    icon: <SyncOutlined />,
    group: '知识管理',
    element: <SyncJobsPage />,
  },
  {
    key: 'logs',
    path: '/logs',
    label: '问答日志',
    description: '历史问答与引用追溯',
    icon: <HistoryOutlined />,
    group: '系统日志',
    element: <QaLogsPage />,
  },
];

/** 默认首页路径 */
export const DEFAULT_ROUTE_PATH = '/chat';

import { ApiOutlined, DatabaseOutlined, LogoutOutlined } from '@ant-design/icons';
import { Avatar, Button, Layout, Menu, Space, Spin, Tag, Typography, message } from 'antd';
import type { AuthUser } from '@rag/shared';
import useRequest from 'ahooks/es/useRequest';
import { BrowserRouter, Link, useLocation } from 'react-router-dom';
import { getCurrentUser, getFeishuLoginUrl, logout } from './services/authService';
import AppRoutes from './router/AppRoutes';
import { NAV_GROUPS, ROUTES, findRouteByKey } from './router';

const { Header, Content, Sider } = Layout;

async function redirectToFeishuLogin() {
  window.location.href = await getFeishuLoginUrl();
}

function UserMenu({ user }: { user: AuthUser }) {
  const logoutRequest = useRequest(logout, {
    manual: true,
    onSuccess: () => {
      message.success('已退出登录');
      void redirectToFeishuLogin();
    },
    onError: (error) => {
      message.error(error.message || '退出登录失败');
    },
  });

  return (
    <Space size={12}>
      <Avatar src={user.avatarUrl}>{user.name.slice(0, 1)}</Avatar>
      <Typography.Text strong>{user.name}</Typography.Text>
      <Button
        icon={<LogoutOutlined />}
        loading={logoutRequest.loading}
        onClick={() => logoutRequest.run()}
      >
        退出
      </Button>
    </Space>
  );
}

function AuthGate({ children }: { children: (user: AuthUser) => React.ReactNode }) {
  const currentUserRequest = useRequest(getCurrentUser, {
    onError: () => {
      void redirectToFeishuLogin();
    },
  });

  if (currentUserRequest.loading || !currentUserRequest.data?.user) {
    return (
      <div className="app-auth-loading">
        <Spin />
        <Typography.Text type="secondary">正在检查飞书登录状态...</Typography.Text>
      </div>
    );
  }

  return children(currentUserRequest.data.user);
}

function AppShell({ user }: { user: AuthUser }) {
  const location = useLocation();
  const selectedKey = location.pathname.split('/')[1] || ROUTES[0].key;
  const current = findRouteByKey(selectedKey) ?? ROUTES[0];

  return (
    <Layout className="app-layout">
      <Sider width={244} theme="light" className="app-sider">
        <div className="app-brand">
          <span className="app-brand__icon">
            <DatabaseOutlined />
          </span>
          <span className="app-brand__text">
            <span className="app-brand__title">研发知识库</span>
            <span className="app-brand__subtitle">RAG · 决策追溯</span>
          </span>
        </div>

        {NAV_GROUPS.map((group) => (
          <div key={group.title}>
            <div className="app-nav-section">{group.title}</div>
            <Menu
              mode="inline"
              selectedKeys={[selectedKey]}
              items={group.items.map((item) => ({
                key: item.key,
                icon: item.icon,
                label: <Link to={item.path}>{item.label}</Link>,
              }))}
              style={{ borderInlineEnd: 'none', background: 'transparent' }}
            />
          </div>
        ))}

        <div className="app-sider-footer">
          <span className="app-sider-footer__dot" aria-hidden />
          <span>服务运行中 · v0.1.0</span>
        </div>
      </Sider>

      <Layout>
        <Header className="app-header">
          <div>
            <Typography.Title level={4} className="app-header__title">
              {current.label}
            </Typography.Title>
            <div className="app-header__subtitle">{current.description}</div>
          </div>
          <div className="app-header__actions">
            <Tag color="blue" bordered={false}>
              <ApiOutlined style={{ marginRight: 4 }} />
              Fornax · LangGraph
            </Tag>
            <UserMenu user={user} />
          </div>
        </Header>
        <Content className="app-content">
          <AppRoutes />
        </Content>
      </Layout>
    </Layout>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthGate>{(user) => <AppShell user={user} />}</AuthGate>
    </BrowserRouter>
  );
}

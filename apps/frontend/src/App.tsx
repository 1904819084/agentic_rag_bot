import { ApiOutlined, DatabaseOutlined } from '@ant-design/icons';
import { Layout, Menu, Tag, Typography } from 'antd';
import { BrowserRouter, Link, useLocation } from 'react-router-dom';
import AppRoutes from './router/AppRoutes';
import { NAV_GROUPS, ROUTES, findRouteByKey } from './router';

const { Header, Content, Sider } = Layout;

function AppShell() {
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
      <AppShell />
    </BrowserRouter>
  );
}

import { ConfigProvider, theme as antdTheme } from 'antd';
import zhCN from 'antd/locale/zh_CN';
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './global.less';

const fontFamily =
  "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, " +
  "'Helvetica Neue', Arial, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif";

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <ConfigProvider
      locale={zhCN}
      theme={{
        algorithm: antdTheme.defaultAlgorithm,
        token: {
          colorPrimary: '#2563EB',
          colorInfo: '#2563EB',
          colorSuccess: '#10B981',
          colorWarning: '#F59E0B',
          colorError: '#EF4444',
          colorTextBase: '#1E293B',
          colorBgLayout: '#F8FAFC',
          colorBgContainer: '#FFFFFF',
          colorBorder: '#E2E8F0',
          colorBorderSecondary: '#EDF2F7',
          borderRadius: 10,
          borderRadiusLG: 14,
          borderRadiusSM: 6,
          fontFamily,
          fontSize: 14,
          controlHeight: 36,
          wireframe: false,
          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.04)',
          boxShadowSecondary: '0 6px 20px rgba(15, 23, 42, 0.06)',
        },
        components: {
          Layout: {
            headerBg: '#FFFFFF',
            siderBg: '#FFFFFF',
            bodyBg: '#F8FAFC',
            headerHeight: 64,
          },
          Menu: {
            itemBg: 'transparent',
            itemSelectedBg: '#EFF6FF',
            itemSelectedColor: '#2563EB',
            itemHoverBg: '#F1F5F9',
            itemHoverColor: '#0F172A',
            itemBorderRadius: 8,
            itemMarginInline: 8,
            itemHeight: 40,
            iconSize: 16,
          },
          Card: {
            borderRadiusLG: 14,
            paddingLG: 24,
            headerBg: 'transparent',
            headerFontSize: 16,
          },
          Button: {
            controlHeight: 36,
            fontWeight: 500,
            primaryShadow: 'none',
          },
          Table: {
            headerBg: '#F8FAFC',
            headerColor: '#475569',
            rowHoverBg: '#F8FAFC',
            cellPaddingBlock: 14,
          },
          Input: {
            activeShadow: '0 0 0 3px rgba(37, 99, 235, 0.12)',
          },
          Tag: {
            defaultBg: '#F1F5F9',
            defaultColor: '#475569',
          },
        },
      }}
    >
      <App />
    </ConfigProvider>
  </React.StrictMode>,
);

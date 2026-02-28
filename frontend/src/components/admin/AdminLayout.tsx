import React, { useState } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Breadcrumb, theme } from 'antd';
import {
  DashboardOutlined,
  AppstoreOutlined,
  ShoppingOutlined,
  ShoppingCartOutlined,
  TeamOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  LogoutOutlined,
  BellOutlined,
  SettingOutlined,
  RocketOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const { Header, Sider, Content } = Layout;

const menuItems = [
  {
    key: '/admin',
    icon: <DashboardOutlined />,
    label: 'Dashboard',
  },
  {
    key: '/admin/categories',
    icon: <AppstoreOutlined />,
    label: 'Danh mục',
  },
  {
    key: '/admin/products',
    icon: <ShoppingOutlined />,
    label: 'Sản phẩm',
  },
  {
    key: '/admin/orders',
    icon: <ShoppingCartOutlined />,
    label: 'Đơn hàng',
  },
  {
    key: '/admin/users',
    icon: <TeamOutlined />,
    label: 'Người dùng',
  },
];

const breadcrumbMap: Record<string, string> = {
  '/admin': 'Dashboard',
  '/admin/categories': 'Danh mục',
  '/admin/products': 'Sản phẩm',
  '/admin/orders': 'Đơn hàng',
  '/admin/users': 'Người dùng',
};

const AdminLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, isLoading } = useAuth();
  const { token } = theme.useToken();

  // Wait for localStorage hydration before protecting route
  if (isLoading) {
    return (
      <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f5f5f5' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: 'linear-gradient(135deg,#0d6efd,#084298)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <RocketOutlined style={{ color: '#fff', fontSize: 22 }} />
          </div>
          <div style={{ color: '#0d6efd', fontWeight: 600, fontSize: 15 }}>SpaceLink Admin</div>
          <div style={{ color: '#adb5bd', fontSize: 13, marginTop: 4 }}>Đang tải...</div>
        </div>
      </div>
    );
  }

  // Protect admin route
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;

  const currentLabel = breadcrumbMap[location.pathname] || 'Admin';


  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Hồ sơ',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Cài đặt',
    },
    { type: 'divider' as const },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Đăng xuất',
      danger: true,
    },
  ];

  const handleUserMenu = ({ key }: { key: string }) => {
    if (key === 'logout') logout();
    if (key === 'profile') navigate('/');
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* ===== SIDEBAR ===== */}
      <Sider
        trigger={null}
        collapsible
        collapsed={collapsed}
        width={240}
        style={{
          background: 'linear-gradient(180deg, #001529 0%, #002140 100%)',
          boxShadow: '2px 0 12px rgba(0,0,0,0.3)',
          position: 'fixed',
          height: '100vh',
          left: 0,
          top: 0,
          bottom: 0,
          zIndex: 100,
        }}
      >
        {/* Logo */}
        <div
          style={{
            height: 64,
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            padding: collapsed ? '0' : '0 20px',
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            background: 'rgba(13,110,253,0.12)',
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #0d6efd, #084298)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 15px rgba(13,110,253,0.4)',
              flexShrink: 0,
            }}
          >
            <RocketOutlined style={{ color: '#fff', fontSize: 18 }} />
          </div>
          {!collapsed && (
            <div style={{ marginLeft: 12 }}>
              <div style={{ color: '#fff', fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>
                SpaceLink
              </div>
              <div style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11 }}>
                Admin Panel
              </div>
            </div>
          )}
        </div>

        {/* Menu */}
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[location.pathname]}
          onClick={({ key }) => navigate(key)}
          items={menuItems}
          style={{
            background: 'transparent',
            border: 'none',
            padding: '12px 0',
          }}
        />

        {/* Bottom divider */}
        {!collapsed && (
          <div
            style={{
              position: 'absolute',
              bottom: 16,
              left: 16,
              right: 16,
              padding: '10px 12px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.08)',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <Avatar
              src={user.avatar || undefined}
              icon={!user.avatar ? <UserOutlined /> : undefined}
              size={32}
              style={{ border: '2px solid #0d6efd', flexShrink: 0 }}
            />
            <div style={{ overflow: 'hidden' }}>
              <div style={{ color: '#fff', fontSize: 13, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {user.fullname || user.email}
              </div>
              <div style={{ color: '#ffc107', fontSize: 11 }}>Administrator</div>
            </div>
          </div>
        )}
      </Sider>

      {/* ===== MAIN CONTENT AREA ===== */}
      <Layout style={{ marginLeft: collapsed ? 80 : 240, transition: 'margin-left 0.2s' }}>
        {/* Header */}
        <Header
          style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 8px rgba(0,0,0,0.08)',
            position: 'sticky',
            top: 0,
            zIndex: 99,
            height: 64,
          }}
        >
          {/* Left: Toggle + Breadcrumb */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: 16,
                width: 40,
                height: 40,
                color: '#495057',
              }}
            />
            <Breadcrumb
              items={[
                { title: <span style={{ color: '#adb5bd' }}>Admin</span> },
                { title: <span style={{ color: '#0d6efd', fontWeight: 600 }}>{currentLabel}</span> },
              ]}
            />
          </div>

          {/* Right: actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Button
              type="text"
              icon={<BellOutlined />}
              style={{ width: 40, height: 40, color: '#495057' }}
            />
            <Button
              type="text"
              shape="default"
              style={{
                height: 36,
                padding: '0 12px',
                fontSize: 13,
                color: '#0d6efd',
                border: '1px solid #0d6efd',
                borderRadius: 8,
                marginRight: 4,
              }}
              onClick={() => navigate('/')}
            >
              Xem website
            </Button>
            <Dropdown
              menu={{ items: userMenuItems, onClick: handleUserMenu }}
              placement="bottomRight"
              trigger={['click']}
            >
              <Avatar
                src={user.avatar || undefined}
                icon={!user.avatar ? <UserOutlined /> : undefined}
                size={36}
                style={{
                  cursor: 'pointer',
                  border: '2px solid #0d6efd',
                  background: '#0d6efd',
                }}
              />
            </Dropdown>
          </div>
        </Header>

        {/* Page Content */}
        <Content
          style={{
            margin: 24,
            minHeight: 'calc(100vh - 112px)',
          }}
        >
          <div
            style={{
              background: token.colorBgContainer,
              borderRadius: token.borderRadiusLG,
            }}
          >
            <Outlet />
          </div>
        </Content>
      </Layout>
    </Layout>
  );
};

export default AdminLayout;

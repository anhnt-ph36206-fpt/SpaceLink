import React, { useState } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Breadcrumb, theme, Badge } from 'antd';
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
    TagsOutlined,
    RocketOutlined,
    ShopOutlined,
    PictureOutlined,
    FileTextOutlined,
    CommentOutlined,
    GiftOutlined,
    CheckOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation, Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ToastContainer } from "react-toastify";
import { useAdminNotifications } from '../../hooks/useAdminNotifications';

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
        key: '/admin/brands',
        icon: <ShopOutlined />,
        label: 'Thương hiệu',
    },
    {
        key: '/admin/products',
        icon: <ShoppingOutlined />,
        label: 'Sản phẩm',
    },
    {
        key: '/admin/attribute-groups',
        icon: <TagsOutlined />,
        label: 'Nhóm biến thể',
    },
    {
        key: '/admin/banners',
        icon: <PictureOutlined />,
        label: 'Banners',
    },
    {
        key: '/admin/news',
        icon: <FileTextOutlined />,
        label: 'Tin tức',
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
    {
        key: '/admin/reviews',
        icon: <CommentOutlined />,
        label: 'Đánh giá',
    },
    {
        key: '/admin/vouchers',
        icon: <GiftOutlined />,
        label: 'Mã giảm giá',
    },
];

const breadcrumbMap: Record<string, string> = {
    '/admin': 'Dashboard',
    '/admin/categories': 'Danh mục',
    '/admin/brands': 'Thương hiệu',
    '/admin/products': 'Sản phẩm',
    '/admin/attribute-groups': 'Nhóm biến thể',
    '/admin/banners': 'Banners',
    '/admin/news': 'Tin tức',
    '/admin/orders': 'Đơn hàng',
    '/admin/users': 'Người dùng',
    '/admin/reviews': 'Đánh giá',
    '/admin/vouchers': 'Mã giảm giá',
};

const AdminLayout: React.FC = () => {
    const [collapsed, setCollapsed] = useState(false);
    const [notifOpen, setNotifOpen] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const { user, logout, isLoading } = useAuth();
    const { token } = theme.useToken();
    const { notifications, unreadCount, markAllRead, markRead } = useAdminNotifications();

    // Wait for localStorage hydration before protecting route
    if (isLoading) {
        return (
            <div style={{
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#f5f5f5'
            }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: 48,
                        height: 48,
                        borderRadius: 12,
                        background: 'linear-gradient(135deg,#0d6efd,#084298)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px'
                    }}>
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
                            <div style={{
                                color: '#fff',
                                fontSize: 13,
                                fontWeight: 600,
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
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
                        {/* Notification Bell */}
                        <Dropdown
                            open={notifOpen}
                            onOpenChange={setNotifOpen}
                            trigger={['click']}
                            placement="bottomRight"
                            dropdownRender={() => (
                                <div style={{
                                    width: 360, background: '#fff', borderRadius: 12,
                                    boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
                                    border: '1px solid #f0f0f0', overflow: 'hidden',
                                }}>
                                    {/* Header */}
                                    <div style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                        padding: '14px 16px', borderBottom: '1px solid #f5f5f5',
                                        background: '#fafafa',
                                    }}>
                                        <span style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>
                                            🔔 Thông báo
                                            {unreadCount > 0 && (
                                                <span style={{
                                                    marginLeft: 8, background: '#ff4d4f', color: '#fff',
                                                    borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700,
                                                }}>{unreadCount}</span>
                                            )}
                                        </span>
                                        {unreadCount > 0 && (
                                            <button
                                                onClick={markAllRead}
                                                style={{
                                                    background: 'none', border: 'none', cursor: 'pointer',
                                                    color: '#0d6efd', fontSize: 12, fontWeight: 600, padding: '4px 8px',
                                                    borderRadius: 6, transition: 'background 0.2s',
                                                }}
                                            >
                                                <CheckOutlined /> Đánh dấu tất cả
                                            </button>
                                        )}
                                    </div>
                                    {/* List */}
                                    <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                                        {notifications.length === 0 ? (
                                            <div style={{ padding: '32px 16px', textAlign: 'center', color: '#adb5bd' }}>
                                                <BellOutlined style={{ fontSize: 32, marginBottom: 8, display: 'block' }} />
                                                Chưa có thông báo nào
                                            </div>
                                        ) : notifications.map(n => {
                                            const typeColor: Record<string, string> = {
                                                new_order: '#0d6efd',
                                                order_cancelled: '#dc3545',
                                                cancel_request: '#fd7e14',
                                                return_request: '#6f42c1',
                                                complaint: '#198754',
                                            };
                                            const color = typeColor[n.type] ?? '#495057';
                                            return (
                                                <div
                                                    key={n.id}
                                                    onClick={() => {
                                                        if (!n.is_read) markRead(n.id);
                                                        if (n.order_id) navigate(`/admin/orders/${n.order_id}`);
                                                        setNotifOpen(false);
                                                    }}
                                                    style={{
                                                        display: 'flex', gap: 10, padding: '12px 16px',
                                                        background: n.is_read ? '#fff' : '#f0f6ff',
                                                        borderBottom: '1px solid #f5f5f5',
                                                        cursor: n.order_id ? 'pointer' : 'default',
                                                        transition: 'background 0.15s',
                                                    }}
                                                >
                                                    <div style={{
                                                        width: 8, minWidth: 8, height: 8, borderRadius: '50%',
                                                        background: n.is_read ? 'transparent' : color,
                                                        marginTop: 6, flexShrink: 0,
                                                    }} />
                                                    <div style={{ flex: 1 }}>
                                                        <div style={{ fontWeight: n.is_read ? 500 : 700, fontSize: 13, color: '#1a1a2e' }}>
                                                            {n.title}
                                                        </div>
                                                        <div style={{ fontSize: 12, color: '#6c757d', marginTop: 2, lineHeight: 1.4 }}>
                                                            {n.body}
                                                        </div>
                                                        <div style={{ fontSize: 11, color: '#adb5bd', marginTop: 4 }}>
                                                            {new Date(n.created_at).toLocaleString('vi-VN')}
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        >
                            <Badge count={unreadCount} size="small" offset={[-2, 2]}>
                                <Button
                                    type="text"
                                    icon={<BellOutlined />}
                                    style={{ width: 40, height: 40, color: unreadCount > 0 ? '#0d6efd' : '#495057' }}
                                />
                            </Badge>
                        </Dropdown>
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
                        <ToastContainer
                            position="top-right"
                            autoClose={5000}
                            hideProgressBar={false}
                            newestOnTop={false}
                            closeOnClick={false}
                            rtl={false}
                            pauseOnFocusLoss
                            draggable
                            pauseOnHover
                            theme="light"
                        />
                    </div>
                </Content>
            </Layout>
        </Layout>
    );
};

export default AdminLayout;

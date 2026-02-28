import React, { useEffect, useState } from 'react';
import {
  Row, Col, Card, Table, Tag, Typography,
  Progress, Spin
} from 'antd';
import {
  ShoppingOutlined, AppstoreOutlined, ShoppingCartOutlined,
  TeamOutlined, RiseOutlined, ArrowUpOutlined,
} from '@ant-design/icons';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { Product, Category, Order } from '../../types/index';
import type { User } from '../../types/user';

const { Title, Text } = Typography;

const revenueData = [
  { month: 'T1', revenue: 12000000 },
  { month: 'T2', revenue: 19000000 },
  { month: 'T3', revenue: 15000000 },
  { month: 'T4', revenue: 25000000 },
  { month: 'T5', revenue: 22000000 },
  { month: 'T6', revenue: 30000000 },
  { month: 'T7', revenue: 28000000 },
];

const mockOrders: Order[] = [
  { id: 'ORD001', userId: '2', customerName: 'User Test', customerEmail: 'user@gmail.com', items: [], totalAmount: 34990000, status: 'delivered', createdAt: '2026-02-25T10:00:00Z' },
  { id: 'ORD002', userId: '17c2', customerName: 'Anh Thanh Niên', customerEmail: 'abc@gmail.com', items: [], totalAmount: 31990000, status: 'shipping', createdAt: '2026-02-26T11:30:00Z' },
  { id: 'ORD003', userId: '3ddb', customerName: 'Nguyễn Duy Mạnh', customerEmail: '123@gmail.com', items: [], totalAmount: 29990000, status: 'pending', createdAt: '2026-02-28T08:00:00Z' },
  { id: 'ORD004', userId: 'VtKwh8e', customerName: 'Doãn Chí Bình', customerEmail: 'duybinh123@gmail.com', items: [], totalAmount: 5990000, status: 'confirmed', createdAt: '2026-02-27T14:00:00Z' },
];

const statusConfig: Record<string, { color: string; label: string }> = {
  pending: { color: 'orange', label: 'Chờ xác nhận' },
  confirmed: { color: 'blue', label: 'Đã xác nhận' },
  shipping: { color: 'geekblue', label: 'Đang giao' },
  delivered: { color: 'green', label: 'Đã giao' },
  cancelled: { color: 'red', label: 'Đã hủy' },
};

const formatVND = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

const StatCard: React.FC<{
  title: string; value: number | string; icon: React.ReactNode;
  gradient: string; suffix?: string; percent?: number;
}> = ({ title, value, icon, gradient, suffix, percent }) => (
  <Card
    style={{
      borderRadius: 16,
      border: 'none',
      background: gradient,
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
    }}
    bodyStyle={{ padding: 24 }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{title}</Text>
        <div style={{ color: '#fff', fontSize: 32, fontWeight: 700, marginTop: 4, lineHeight: 1.2 }}>
          {value}
        </div>
        {suffix && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            <ArrowUpOutlined style={{ color: '#ffc107', fontSize: 12 }} />
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>{suffix}</Text>
          </div>
        )}
      </div>
      <div
        style={{
          width: 52, height: 52, borderRadius: 14,
          background: 'rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, color: '#fff',
        }}
      >
        {icon}
      </div>
    </div>
    {percent !== undefined && (
      <Progress
        percent={percent}
        showInfo={false}
        strokeColor="#ffc107"
        trailColor="rgba(255,255,255,0.2)"
        style={{ marginTop: 16 }}
        size="small"
      />
    )}
  </Card>
);

const AdminDashboardPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const [pRes, cRes, uRes] = await Promise.all([
          fetch('http://localhost:3000/products'),
          fetch('http://localhost:3000/categories'),
          fetch('http://localhost:3000/users'),
        ]);
        setProducts(await pRes.json());
        setCategories(await cRes.json());
        setUsers(await uRes.json());
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  const recentOrderColumns = [
    { title: 'Mã đơn', dataIndex: 'id', key: 'id', render: (v: string) => <Text code>{v}</Text> },
    { title: 'Khách hàng', dataIndex: 'customerName', key: 'customerName' },
    {
      title: 'Giá trị', dataIndex: 'totalAmount', key: 'totalAmount',
      render: (v: number) => <Text strong style={{ color: '#0d6efd' }}>{formatVND(v)}</Text>,
    },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status',
      render: (v: string) => {
        const cfg = statusConfig[v] || { color: 'default', label: v };
        return <Tag color={cfg.color} style={{ borderRadius: 20, padding: '2px 10px' }}>{cfg.label}</Tag>;
      },
    },
    {
      title: 'Ngày tạo', dataIndex: 'createdAt', key: 'createdAt',
      render: (v: string) => new Date(v).toLocaleDateString('vi-VN'),
    },
  ];

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;

  return (
    <div style={{ padding: 24 }}>
      {/* Page Title */}
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0, color: '#1a1a2e' }}>Tổng quan hệ thống</Title>
        <Text type="secondary" style={{ fontSize: 13 }}>Chào mừng trở lại! Đây là tóm tắt hôm nay.</Text>
      </div>

      {/* Stat Cards */}
      <Row gutter={[20, 20]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="Tổng sản phẩm"
            value={products.length}
            icon={<ShoppingOutlined />}
            gradient="linear-gradient(135deg, #0d6efd 0%, #084298 100%)"
            suffix="+2 sản phẩm mới"
            percent={72}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="Danh mục"
            value={categories.length}
            icon={<AppstoreOutlined />}
            gradient="linear-gradient(135deg, #6f42c1 0%, #4a2d80 100%)"
            suffix="Đang hoạt động"
            percent={100}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="Đơn hàng"
            value={mockOrders.length}
            icon={<ShoppingCartOutlined />}
            gradient="linear-gradient(135deg, #fd7e14 0%, #c35a00 100%)"
            suffix="1 đơn hàng mới"
            percent={58}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="Người dùng"
            value={users.length}
            icon={<TeamOutlined />}
            gradient="linear-gradient(135deg, #198754 0%, #0d5c35 100%)"
            suffix="+3 người dùng mới"
            percent={44}
          />
        </Col>
      </Row>

      {/* Charts + Table */}
      <Row gutter={[20, 20]}>
        {/* Revenue Chart */}
        <Col xs={24} lg={14}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <RiseOutlined style={{ color: '#0d6efd' }} />
                <span style={{ fontWeight: 600 }}>Doanh thu tháng</span>
              </div>
            }
            style={{ borderRadius: 16, border: '1px solid #f0f0f0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
            bodyStyle={{ padding: '8px 16px 16px' }}
          >
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d6efd" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0d6efd" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#868e96' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#868e96' }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v) => `${(v / 1000000).toFixed(0)}M`}
                />
                <Tooltip
                  formatter={(value) => [formatVND((value as number) ?? 0), 'Doanh thu']}
                  contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}
                />
                <Area
                  type="monotone" dataKey="revenue"
                  stroke="#0d6efd" strokeWidth={2.5}
                  fill="url(#colorRevenue)"
                  dot={{ fill: '#0d6efd', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </Card>
        </Col>

        {/* Top Products */}
        <Col xs={24} lg={10}>
          <Card
            title={<span style={{ fontWeight: 600 }}>Sản phẩm bán chạy</span>}
            style={{ borderRadius: 16, border: '1px solid #f0f0f0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', height: '100%' }}
            bodyStyle={{ padding: '8px 16px 16px' }}
          >
            {products.slice(0, 5).map((p, idx) => (
              <div
                key={p.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0',
                  borderBottom: idx < products.length - 1 && idx < 4 ? '1px solid #f5f5f5' : 'none',
                }}
              >
                <div
                  style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: 'linear-gradient(135deg,#0d6efd,#084298)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0,
                  }}
                >
                  {idx + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.name}
                  </div>
                  <div style={{ color: '#868e96', fontSize: 12 }}>{p.category}</div>
                </div>
                <Text strong style={{ color: '#0d6efd', fontSize: 13, flexShrink: 0 }}>
                  {formatVND(p.price)}
                </Text>
              </div>
            ))}
          </Card>
        </Col>

        {/* Recent Orders */}
        <Col xs={24}>
          <Card
            title={<span style={{ fontWeight: 600 }}>Đơn hàng gần đây</span>}
            style={{ borderRadius: 16, border: '1px solid #f0f0f0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
            bodyStyle={{ padding: 0 }}
          >
            <Table
              columns={recentOrderColumns}
              dataSource={mockOrders}
              rowKey="id"
              pagination={false}
              size="middle"
              style={{ borderRadius: 16, overflow: 'hidden' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdminDashboardPage;

import React, { useEffect, useState } from 'react';
import {
  Row, Col, Card, Table, Tag, Typography,
  Progress, Spin, Statistic
} from 'antd';
import {
  ShoppingOutlined, AppstoreOutlined, ShoppingCartOutlined,
  TeamOutlined, RiseOutlined, ArrowUpOutlined, CheckCircleOutlined,
  ClockCircleOutlined, DollarOutlined,
} from '@ant-design/icons';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from 'recharts';
import { axiosInstance } from '../../api/axios';

const { Title, Text } = Typography;

// ─── Types ──────────────────────────────────────────────────────────────────
interface DashboardStats {
  total_revenue: number;
  total_orders: number;
  pending_orders: number;
  completed_orders: number;
  incomplete_orders: number;
  total_products: number;
  total_customers: number;
  pending_contacts: number;
  recent_orders: RecentOrder[];
}

interface RecentOrder {
  id: number;
  code: string;
  customer_name: string;
  customer_email: string;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
}

interface RevenueMonth {
  month: number;
  label: string;
  total: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatVND = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

const formatVNDShort = (value: number) => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}M`;
  return `${(value / 1_000).toFixed(0)}K`;
};

const statusConfig: Record<string, { color: string; label: string }> = {
  pending:   { color: 'orange',   label: 'Chờ xác nhận' },
  confirmed: { color: 'blue',     label: 'Đã xác nhận'  },
  shipping:  { color: 'geekblue', label: 'Đang giao'    },
  delivered: { color: 'green',    label: 'Đã giao'      },
  completed: { color: 'cyan',     label: 'Hoàn thành'   },
  cancelled: { color: 'red',      label: 'Đã hủy'       },
};

// ─── StatCard Component ───────────────────────────────────────────────────────
const StatCard: React.FC<{
  title: string;
  value: number | string;
  icon: React.ReactNode;
  gradient: string;
  suffix?: string;
  percent?: number;
  valueStyle?: React.CSSProperties;
}> = ({ title, value, icon, gradient, suffix, percent, valueStyle }) => (
  <Card
    style={{
      borderRadius: 16, border: 'none', background: gradient,
      overflow: 'hidden', boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
    }}
    bodyStyle={{ padding: 24 }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>{title}</Text>
        <div style={{ color: '#fff', fontSize: 28, fontWeight: 700, marginTop: 4, lineHeight: 1.2, ...valueStyle }}>
          {value}
        </div>
        {suffix && (
          <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 4 }}>
            <ArrowUpOutlined style={{ color: '#ffc107', fontSize: 12 }} />
            <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12 }}>{suffix}</Text>
          </div>
        )}
      </div>
      <div style={{
        width: 52, height: 52, borderRadius: 14,
        background: 'rgba(255,255,255,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, color: '#fff', flexShrink: 0,
      }}>
        {icon}
      </div>
    </div>
    {percent !== undefined && (
      <Progress
        percent={percent} showInfo={false}
        strokeColor="#ffc107" trailColor="rgba(255,255,255,0.2)"
        style={{ marginTop: 16 }} size="small"
      />
    )}
  </Card>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueMonth[]>([]);
  const [topProducts, setTopProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [statsRes, revenueRes, productsRes] = await Promise.all([
          axiosInstance.get('/admin/dashboard/stats'),
          axiosInstance.get('/admin/dashboard/revenue'),
          axiosInstance.get('/admin/products', { params: { per_page: 5, sort: 'newest' } }),
        ]);
        setStats(statsRes.data.data);
        setRevenueData(revenueRes.data.data);
        setTopProducts(productsRes.data.data ?? []);
      } catch (e) {
        console.error('Dashboard fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // ── Columns cho bảng đơn hàng gần đây ─────────────────────────────────────
  const orderColumns = [
    {
      title: 'Mã đơn',
      dataIndex: 'code',
      key: 'code',
      render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_: any, r: RecentOrder) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{r.customer_name}</div>
          <div style={{ color: '#868e96', fontSize: 12 }}>{r.customer_email}</div>
        </div>
      ),
    },
    {
      title: 'Giá trị',
      dataIndex: 'total_amount',
      key: 'total_amount',
      render: (v: number) => <Text strong style={{ color: '#0d6efd' }}>{formatVND(v)}</Text>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (v: string) => {
        const cfg = statusConfig[v] || { color: 'default', label: v };
        return <Tag color={cfg.color} style={{ borderRadius: 20, padding: '2px 10px' }}>{cfg.label}</Tag>;
      },
    },
    {
      title: 'Thanh toán',
      dataIndex: 'payment_status',
      key: 'payment_status',
      render: (v: string) => (
        <Tag color={v === 'paid' ? 'green' : v === 'failed' ? 'red' : 'orange'} style={{ borderRadius: 20 }}>
          {v === 'paid' ? 'Đã thanh toán' : v === 'failed' ? 'Thất bại' : 'Chờ TT'}
        </Tag>
      ),
    },
    {
      title: 'Ngày đặt',
      dataIndex: 'created_at',
      key: 'created_at',
      render: (v: string) => new Date(v).toLocaleDateString('vi-VN'),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 80 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, color: '#868e96' }}>Đang tải dữ liệu...</div>
      </div>
    );
  }

  if (!stats) return null;

  const completedPercent = stats.total_orders > 0
    ? Math.round((stats.completed_orders / stats.total_orders) * 100)
    : 0;

  return (
    <div style={{ padding: 24 }}>
      {/* Page Title */}
      <div style={{ marginBottom: 24 }}>
        <Title level={4} style={{ margin: 0, color: '#1a1a2e' }}>Tổng quan hệ thống</Title>
        <Text type="secondary" style={{ fontSize: 13 }}>
          Dữ liệu thực tế — cập nhật lúc {new Date().toLocaleTimeString('vi-VN')}
        </Text>
      </div>

      {/* ── Row 1: Stat Cards ────────────────────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="Doanh thu (đã TT)"
            value={formatVNDShort(stats.total_revenue)}
            icon={<DollarOutlined />}
            gradient="linear-gradient(135deg, #0d6efd 0%, #084298 100%)"
            suffix={formatVND(stats.total_revenue)}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="Tổng đơn hàng"
            value={stats.total_orders}
            icon={<ShoppingCartOutlined />}
            gradient="linear-gradient(135deg, #fd7e14 0%, #c35a00 100%)"
            suffix={`${stats.pending_orders} đơn đang chờ`}
            percent={completedPercent}
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="Tổng sản phẩm"
            value={stats.total_products}
            icon={<ShoppingOutlined />}
            gradient="linear-gradient(135deg, #6f42c1 0%, #4a2d80 100%)"
          />
        </Col>
        <Col xs={24} sm={12} xl={6}>
          <StatCard
            title="Người dùng"
            value={stats.total_customers}
            icon={<TeamOutlined />}
            gradient="linear-gradient(135deg, #198754 0%, #0d5c35 100%)"
          />
        </Col>
      </Row>

      {/* ── Row 2: Order Status Cards ─────────────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card
            style={{ borderRadius: 14, border: '1px solid #f0f0f0', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}
            bodyStyle={{ padding: '20px 24px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: 'linear-gradient(135deg,#198754,#0d5c35)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20
              }}>
                <CheckCircleOutlined />
              </div>
              <div>
                <div style={{ color: '#868e96', fontSize: 12, marginBottom: 2 }}>Đơn hoàn thành</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#198754', lineHeight: 1 }}>
                  {stats.completed_orders}
                </div>
              </div>
            </div>
            <Progress
              percent={completedPercent} showInfo strokeColor="#198754"
              trailColor="#e9ecef" style={{ marginTop: 14 }} size="small"
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card
            style={{ borderRadius: 14, border: '1px solid #f0f0f0', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}
            bodyStyle={{ padding: '20px 24px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: 'linear-gradient(135deg,#fd7e14,#c35a00)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20
              }}>
                <ClockCircleOutlined />
              </div>
              <div>
                <div style={{ color: '#868e96', fontSize: 12, marginBottom: 2 }}>Đơn chưa hoàn thành</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#fd7e14', lineHeight: 1 }}>
                  {stats.incomplete_orders}
                </div>
              </div>
            </div>
            <Progress
              percent={stats.total_orders > 0 ? Math.round((stats.incomplete_orders / stats.total_orders) * 100) : 0}
              showInfo strokeColor="#fd7e14" trailColor="#e9ecef"
              style={{ marginTop: 14 }} size="small"
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card
            style={{ borderRadius: 14, border: '1px solid #f0f0f0', boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}
            bodyStyle={{ padding: '20px 24px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: 'linear-gradient(135deg,#ffc107,#c79100)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 20
              }}>
                <AppstoreOutlined />
              </div>
              <div>
                <div style={{ color: '#868e96', fontSize: 12, marginBottom: 2 }}>Đơn chờ xác nhận</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#c79100', lineHeight: 1 }}>
                  {stats.pending_orders}
                </div>
              </div>
            </div>
            <Progress
              percent={stats.total_orders > 0 ? Math.round((stats.pending_orders / stats.total_orders) * 100) : 0}
              showInfo strokeColor="#ffc107" trailColor="#e9ecef"
              style={{ marginTop: 14 }} size="small"
            />
          </Card>
        </Col>
      </Row>

      {/* ── Row 3: Biểu đồ + Top sản phẩm ───────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {/* Revenue Chart */}
        <Col xs={24} lg={15}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <RiseOutlined style={{ color: '#0d6efd' }} />
                <span style={{ fontWeight: 600 }}>Doanh thu theo tháng ({new Date().getFullYear()})</span>
              </div>
            }
            style={{ borderRadius: 16, border: '1px solid #f0f0f0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
            bodyStyle={{ padding: '8px 16px 16px' }}
          >
            <ResponsiveContainer width="100%" height={260}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#0d6efd" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0d6efd" stopOpacity={0}    />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12, fill: '#868e96' }}
                  axisLine={false} tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#868e96' }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v) => formatVNDShort(v)}
                />
                <Tooltip
                  formatter={(value) => [formatVND(value as number), 'Doanh thu']}
                  contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}
                />
                <Area
                  type="monotone" dataKey="total"
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
        <Col xs={24} lg={9}>
          <Card
            title={<span style={{ fontWeight: 600 }}>Sản phẩm mới nhất</span>}
            style={{ borderRadius: 16, border: '1px solid #f0f0f0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', height: '100%' }}
            bodyStyle={{ padding: '8px 16px 16px' }}
          >
            {topProducts.slice(0, 5).map((p: any, idx: number) => (
              <div
                key={p.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 0',
                  borderBottom: idx < 4 ? '1px solid #f5f5f5' : 'none',
                }}
              >
                {/* Rank badge */}
                <div style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: idx === 0
                    ? 'linear-gradient(135deg,#ffc107,#c79100)'
                    : 'linear-gradient(135deg,#0d6efd,#084298)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 12, fontWeight: 700, flexShrink: 0,
                }}>
                  {idx + 1}
                </div>
                {/* Image */}
                {p.image && (
                  <img
                    src={p.image}
                    alt={p.name}
                    style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 8, border: '1px solid #eee', flexShrink: 0 }}
                  />
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.name}
                  </div>
                  <div style={{ color: '#868e96', fontSize: 11 }}>
                    {typeof p.category === 'object' ? p.category?.name : (p.category || '—')}
                  </div>
                </div>
                <Text strong style={{ color: '#0d6efd', fontSize: 12, flexShrink: 0 }}>
                  {formatVND(p.sale_price || p.price)}
                </Text>
              </div>
            ))}
            {topProducts.length === 0 && (
              <div style={{ textAlign: 'center', color: '#868e96', padding: '20px 0' }}>Không có dữ liệu</div>
            )}
          </Card>
        </Col>
      </Row>

      {/* ── Row 4: Bảng đơn hàng gần đây ────────────────────────────── */}
      <Row>
        <Col xs={24}>
          <Card
            title={<span style={{ fontWeight: 600 }}>Đơn hàng gần đây</span>}
            extra={<a href="/admin/orders" style={{ fontSize: 13 }}>Xem tất cả →</a>}
            style={{ borderRadius: 16, border: '1px solid #f0f0f0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
            bodyStyle={{ padding: 0 }}
          >
            <Table
              columns={orderColumns}
              dataSource={stats.recent_orders}
              rowKey="id"
              pagination={false}
              size="middle"
              style={{ borderRadius: 16, overflow: 'hidden' }}
              locale={{ emptyText: 'Chưa có đơn hàng nào' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdminDashboardPage;

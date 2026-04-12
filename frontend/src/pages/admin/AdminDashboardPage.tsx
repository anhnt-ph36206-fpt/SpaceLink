import React, { useEffect, useState } from 'react';
import {
  Row, Col, Card, Table, Tag, Typography,
  Progress, Spin, Segmented, Empty, Tooltip as AntTooltip,
} from 'antd';
import {
  ShoppingOutlined, ShoppingCartOutlined,
  TeamOutlined, RiseOutlined, ArrowUpOutlined, CheckCircleOutlined,
  ClockCircleOutlined, DollarOutlined, CalendarOutlined,
  WarningOutlined, SafetyCertificateOutlined, FireOutlined,
  PieChartOutlined,
} from '@ant-design/icons';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ComposedChart, Bar, Legend, PieChart, Pie, Cell,
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
  today_revenue: number;
  today_orders: number;
  payment_sync: {
    delivered_unpaid: number;
    cod_delivered_paid: number;
    vnpay_paid: number;
  };
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
  payment_method: string;
  created_at: string;
}

interface RevenueDataPoint {
  label: string;
  total: number;
  orders_count: number;
}

interface CategorySales {
  category_id: number;
  category_name: string;
  total_revenue: number;
  total_quantity: number;
  order_count: number;
}

interface TopProduct {
  product_id: number;
  product_name: string;
  product_slug: string;
  product_image: string | null;
  category_name: string;
  total_quantity_sold: number;
  total_revenue: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const formatVND = (value: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

const formatVNDShort = (value: number) => {
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}B`;
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K`;
  return `${value}`;
};

const statusConfig: Record<string, { color: string; label: string }> = {
  pending:   { color: 'orange',   label: 'Chờ xác nhận' },
  confirmed: { color: 'blue',     label: 'Đã xác nhận'  },
  shipping:  { color: 'geekblue', label: 'Đang giao'    },
  delivered: { color: 'green',    label: 'Đã giao'      },
  completed: { color: 'cyan',     label: 'Hoàn thành'   },
  cancelled: { color: 'red',      label: 'Đã hủy'       },
};

const PIE_COLORS = [
  '#0d6efd', '#6f42c1', '#198754', '#fd7e14', '#dc3545',
  '#0dcaf0', '#ffc107', '#6610f2', '#d63384', '#20c997',
];

const StatCard: React.FC<{
  title: string;
  value: number | string;
  icon: React.ReactNode;
  iconColor: string;
  suffix?: string;
  percent?: number;
  valueStyle?: React.CSSProperties;
}> = ({ title, value, icon, iconColor, suffix, percent, valueStyle }) => (
  <Card
    className="dashboard-stat-card"
    style={{
      borderRadius: 12, border: '1px solid rgba(0,0,0,0.06)', background: '#fff',
      overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease',
      height: '100%', minHeight: 165, display: 'flex', flexDirection: 'column',
    }}
    styles={{ body: { padding: 24, display: 'flex', flexDirection: 'column', flex: 1 } }}
    hoverable
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <Text style={{ color: '#6c757d', fontSize: 13, fontWeight: 500, lineHeight: 1.3, display: 'block', textTransform: 'uppercase' }}>{title}</Text>
        <div style={{ color: '#484848', fontSize: 26, fontWeight: 700, marginTop: 8, lineHeight: 1.2, ...valueStyle }}>
          {value}
        </div>
      </div>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: `${iconColor}15`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, color: iconColor, flexShrink: 0,
      }}>
        {icon}
      </div>
    </div>
    
    <div style={{ marginTop: 'auto', paddingTop: 16 }}>
      {suffix && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: percent !== undefined ? 10 : 0 }}>
          <ArrowUpOutlined style={{ color: iconColor, fontSize: 13 }} />
          <Text style={{ color: '#919191', fontSize: 13, fontWeight: 500 }}>{suffix}</Text>
        </div>
      )}
      {percent !== undefined && (
        <Progress
          percent={percent} showInfo={false}
          strokeColor={iconColor} trailColor="#f5f5f5"
          size="small"
          style={{ margin: 0, display: 'block' }}
        />
      )}
    </div>
  </Card>
);

// Custom tooltip cho biểu đồ ComposedChart
const RevenueChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: '#fff', borderRadius: 12, padding: '12px 16px',
      boxShadow: '0 8px 30px rgba(0,0,0,0.15)', border: 'none',
      minWidth: 180,
    }}>
      <div style={{ fontWeight: 700, marginBottom: 8, color: '#1a1a2e', fontSize: 13 }}>{label}</div>
      {payload.map((entry: any, idx: number) => (
        <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
          <span style={{ color: entry.color, fontSize: 12, fontWeight: 600 }}>
            {entry.name === 'total' ? '💰 Doanh thu' : '📦 Số đơn'}
          </span>
          <span style={{ fontWeight: 700, fontSize: 12, color: '#333' }}>
            {entry.name === 'total' ? formatVND(entry.value) : entry.value}
          </span>
        </div>
      ))}
    </div>
  );
};

// Custom label cho PieChart
const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={12} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const AdminDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);
  const [revenueMode, setRevenueMode] = useState<'monthly' | 'daily'>('monthly');
  const [categorySales, setCategorySales] = useState<CategorySales[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topProductsWeek, setTopProductsWeek] = useState({ from: '', to: '' });
  const [loading, setLoading] = useState(true);

  // Fetch stats + category + top products (only once)
  useEffect(() => {
    const fetchCore = async () => {
      setLoading(true);
      try {
        const [statsRes, categoryRes, topRes] = await Promise.all([
          axiosInstance.get('/admin/dashboard/stats'),
          axiosInstance.get('/admin/dashboard/sales-by-category'),
          axiosInstance.get('/admin/dashboard/top-products'),
        ]);
        setStats(statsRes.data.data);
        setCategorySales(categoryRes.data.data ?? []);
        setTopProducts(topRes.data.data ?? []);
        setTopProductsWeek(topRes.data.week ?? { from: '', to: '' });
      } catch (e) {
        console.error('Dashboard fetch error:', e);
      } finally {
        setLoading(false);
      }
    };
    fetchCore();
  }, []);

  // Fetch revenue when mode changes
  useEffect(() => {
    const fetchRevenue = async () => {
      try {
        const res = await axiosInstance.get('/admin/dashboard/revenue', {
          params: { mode: revenueMode },
        });
        setRevenueData(res.data.data ?? []);
      } catch (e) {
        console.error('Revenue fetch error:', e);
      }
    };
    fetchRevenue();
  }, [revenueMode]);

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
      key: 'payment_info',
      render: (_: any, r: RecentOrder) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Tag color={r.payment_status === 'paid' ? 'green' : r.payment_status === 'failed' ? 'red' : 'orange'} style={{ borderRadius: 20 }}>
            {r.payment_status === 'paid' ? 'Đã TT' : r.payment_status === 'failed' ? 'Thất bại' : 'Chờ TT'}
          </Tag>
          <span style={{ fontSize: 11, color: '#868e96' }}>
            {r.payment_method === 'vnpay' ? 'VNPAY' : 'COD'}
          </span>
        </div>
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

  const totalCategoryRevenue = categorySales.reduce((s, c) => s + c.total_revenue, 0);

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto' }}>
      {/* Page Title */}
      <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: '#1a1a2e' }}>📊 Tổng quan hệ thống</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Dữ liệu thực tế — cập nhật lúc {new Date().toLocaleTimeString('vi-VN')}
          </Text>
        </div>
      </div>

      {/* ── Row 1: Stat Cards (6 cards) ────────────────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }} align="stretch">
        <Col xs={24} sm={12} xl={4}>
          <StatCard
            title="Doanh thu (đã TT)"
            value={formatVNDShort(stats.total_revenue)}
            icon={<DollarOutlined />}
            iconColor="#F28B00"
            suffix={formatVND(stats.total_revenue)}
          />
        </Col>
        <Col xs={24} sm={12} xl={4}>
          <StatCard
            title="Doanh thu hôm nay"
            value={formatVNDShort(stats.today_revenue)}
            icon={<CalendarOutlined />}
            iconColor="#F28B00"
            suffix={formatVND(stats.today_revenue)}
          />
        </Col>
        <Col xs={24} sm={12} xl={4}>
          <StatCard
            title="Tổng đơn hàng"
            value={stats.total_orders}
            icon={<ShoppingCartOutlined />}
            iconColor="#F28B00"
            suffix={`${stats.pending_orders} đơn đang chờ`}
            percent={completedPercent}
          />
        </Col>
        <Col xs={24} sm={12} xl={4}>
          <StatCard
            title="Đơn hôm nay"
            value={stats.today_orders}
            icon={<RiseOutlined />}
            iconColor="#F28B00"
          />
        </Col>
        <Col xs={24} sm={12} xl={4}>
          <StatCard
            title="Tổng sản phẩm"
            value={stats.total_products}
            icon={<ShoppingOutlined />}
            iconColor="#F28B00"
          />
        </Col>
        <Col xs={24} sm={12} xl={4}>
          <StatCard
            title="Người dùng"
            value={stats.total_customers}
            icon={<TeamOutlined />}
            iconColor="#F28B00"
          />
        </Col>
      </Row>

      {/* ── Row 2: Order Status Cards + Payment Sync ─────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }} align="stretch">
        <Col xs={24} sm={12} lg={6}>
          <Card
            style={{ borderRadius: 14, border: '1px solid #f0f0f0', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', height: '100%' }}
            bodyStyle={{ padding: '20px 24px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: '#19875415',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#198754', fontSize: 24
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
        <Col xs={24} sm={12} lg={6}>
          <Card
            style={{ borderRadius: 14, border: '1px solid #f0f0f0', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', height: '100%' }}
            bodyStyle={{ padding: '20px 24px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: '#fd7e1415',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fd7e14', fontSize: 24
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
        <Col xs={24} sm={12} lg={6}>
          <Card
            style={{ borderRadius: 14, border: '1px solid #f0f0f0', boxShadow: '0 2px 10px rgba(0,0,0,0.06)', height: '100%' }}
            bodyStyle={{ padding: '20px 24px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: '#ffc10715',
                display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffb300', fontSize: 24
              }}>
                <SafetyCertificateOutlined />
              </div>
              <div>
                <div style={{ color: '#868e96', fontSize: 12, marginBottom: 2 }}>Đồng bộ thanh toán</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                  <AntTooltip title="COD đã thanh toán">
                    <Tag color="green" style={{ borderRadius: 16, fontSize: 11 }}>COD: {stats.payment_sync.cod_delivered_paid}</Tag>
                  </AntTooltip>
                  <AntTooltip title="VNPAY đã thanh toán">
                    <Tag color="blue" style={{ borderRadius: 16, fontSize: 11 }}>VNPAY: {stats.payment_sync.vnpay_paid}</Tag>
                  </AntTooltip>
                </div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card
            style={{
              borderRadius: 14,
              border: stats.payment_sync.delivered_unpaid > 0 ? '1px solid #ffccc7' : '1px solid #f0f0f0',
              boxShadow: stats.payment_sync.delivered_unpaid > 0
                ? '0 2px 10px rgba(220,53,69,0.12)'
                : '0 2px 10px rgba(0,0,0,0.06)',
              height: '100%',
              background: stats.payment_sync.delivered_unpaid > 0
                ? '#fff5f5'
                : '#fff',
            }}
            bodyStyle={{ padding: '20px 24px' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 48, height: 48, borderRadius: 12,
                background: stats.payment_sync.delivered_unpaid > 0
                  ? '#dc354515'
                  : '#19875415',
                display: 'flex', alignItems: 'center', justifyContent: 'center', 
                color: stats.payment_sync.delivered_unpaid > 0 ? '#dc3545' : '#198754', 
                fontSize: 24
              }}>
                {stats.payment_sync.delivered_unpaid > 0 ? <WarningOutlined /> : <CheckCircleOutlined />}
              </div>
              <div>
                <div style={{ color: '#868e96', fontSize: 12, marginBottom: 2 }}>
                  {stats.payment_sync.delivered_unpaid > 0 ? 'Cảnh báo bất thường' : 'TT đồng bộ tốt'}
                </div>
                <div style={{
                  fontSize: stats.payment_sync.delivered_unpaid > 0 ? 24 : 20,
                  fontWeight: 700,
                  color: stats.payment_sync.delivered_unpaid > 0 ? '#dc3545' : '#198754',
                  lineHeight: 1,
                }}>
                  {stats.payment_sync.delivered_unpaid > 0
                    ? `${stats.payment_sync.delivered_unpaid} đơn`
                    : '✓ OK'}
                </div>
                {stats.payment_sync.delivered_unpaid > 0 && (
                  <div style={{ fontSize: 11, color: '#dc3545', marginTop: 4 }}>
                    Đã giao nhưng chưa thanh toán
                  </div>
                )}
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* ── Row 3: Biểu đồ doanh thu & đơn hàng ──────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <RiseOutlined style={{ color: '#0d6efd' }} />
                  <span style={{ fontWeight: 600, fontSize: 15 }}>
                    Doanh thu & Đơn hàng {revenueMode === 'monthly' ? `năm ${new Date().getFullYear()}` : '(30 ngày gần nhất)'}
                  </span>
                </div>
                <Segmented
                  value={revenueMode}
                  onChange={(v) => setRevenueMode(v as 'monthly' | 'daily')}
                  options={[
                    { label: '📅 Theo tháng', value: 'monthly' },
                    { label: '📆 Theo ngày', value: 'daily' },
                  ]}
                  style={{ borderRadius: 20 }}
                />
              </div>
            }
            style={{ borderRadius: 16, border: '1px solid #f0f0f0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
            bodyStyle={{ padding: '8px 16px 16px' }}
          >
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d6efd" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0d6efd" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11, fill: '#868e96' }}
                  axisLine={false} tickLine={false}
                  interval={revenueMode === 'daily' ? 2 : 0}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: '#868e96' }}
                  axisLine={false} tickLine={false}
                  tickFormatter={(v) => formatVNDShort(v)}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: '#868e96' }}
                  axisLine={false} tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip content={<RevenueChartTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: 12 }}
                  formatter={(value: string) => (
                    <span style={{ color: '#555', fontSize: 12, fontWeight: 500 }}>
                      {value === 'total' ? 'Doanh thu' : 'Số đơn hàng'}
                    </span>
                  )}
                />
                <Area
                  yAxisId="left"
                  type="monotone" dataKey="total"
                  stroke="#0d6efd" strokeWidth={2.5}
                  fill="url(#colorRevenue)"
                  dot={{ fill: '#0d6efd', strokeWidth: 2, r: 3 }}
                  activeDot={{ r: 6 }}
                  name="total"
                />
                <Bar
                  yAxisId="right"
                  dataKey="orders_count"
                  fill="#6f42c1"
                  opacity={0.7}
                  radius={[4, 4, 0, 0]}
                  barSize={revenueMode === 'daily' ? 8 : 20}
                  name="orders_count"
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      {/* ── Row 4: Báo cáo bán hàng — PieChart + Top sản phẩm tuần ───────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {/* Pie Chart — Doanh thu theo danh mục */}
        <Col xs={24} lg={10}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PieChartOutlined style={{ color: '#6f42c1' }} />
                <span style={{ fontWeight: 600 }}>Doanh thu theo danh mục</span>
              </div>
            }
            style={{ borderRadius: 16, border: '1px solid #f0f0f0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', height: '100%' }}
            bodyStyle={{ padding: '8px 16px 16px' }}
          >
            {categorySales.length === 0 ? (
              <Empty description="Chưa có dữ liệu" style={{ padding: '40px 0' }} />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={categorySales}
                      dataKey="total_revenue"
                      nameKey="category_name"
                      cx="50%" cy="50%"
                      innerRadius={50} outerRadius={95}
                      labelLine={false}
                      label={renderPieLabel}
                      strokeWidth={2}
                      stroke="#fff"
                    >
                      {categorySales.map((_entry, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number, name: string) => [formatVND(value), name]}
                      contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.12)' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Legend thủ công */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8, justifyContent: 'center' }}>
                  {categorySales.slice(0, 8).map((cat, idx) => (
                    <AntTooltip key={cat.category_id} title={`${formatVND(cat.total_revenue)} — ${cat.total_quantity} SP — ${cat.order_count} đơn`}>
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '4px 10px', borderRadius: 20,
                        background: '#f8f9fa', fontSize: 11, cursor: 'pointer',
                        transition: 'background 0.2s',
                      }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[idx % PIE_COLORS.length] }} />
                        <span style={{ fontWeight: 500, color: '#555' }}>{cat.category_name}</span>
                        <span style={{ color: '#adb5bd' }}>
                          {totalCategoryRevenue > 0 ? `${((cat.total_revenue / totalCategoryRevenue) * 100).toFixed(1)}%` : '0%'}
                        </span>
                      </div>
                    </AntTooltip>
                  ))}
                </div>
              </>
            )}
          </Card>
        </Col>

        {/* Top 5 sản phẩm bán chạy tuần */}
        <Col xs={24} lg={14}>
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <FireOutlined style={{ color: '#fd7e14' }} />
                <span style={{ fontWeight: 600 }}>Top 5 bán chạy tuần</span>
                <Tag color="orange" style={{ borderRadius: 20, marginLeft: 4, fontSize: 11 }}>
                  {topProductsWeek.from} — {topProductsWeek.to}
                </Tag>
              </div>
            }
            style={{ borderRadius: 16, border: '1px solid #f0f0f0', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', height: '100%' }}
            bodyStyle={{ padding: '0' }}
          >
            {topProducts.length === 0 ? (
              <Empty description="Tuần này chưa có đơn nào" style={{ padding: '60px 0' }} />
            ) : (
              <Table
                dataSource={topProducts}
                rowKey="product_id"
                pagination={false}
                size="middle"
                style={{ borderRadius: 16, overflow: 'hidden' }}
                columns={[
                  {
                    title: '#',
                    key: 'rank',
                    width: 50,
                    align: 'center' as const,
                    render: (_: any, __: any, idx: number) => (
                      <div style={{
                        width: 28, height: 28, borderRadius: 8,
                        background: idx === 0
                          ? 'linear-gradient(135deg,#ffc107,#c79100)'
                          : idx === 1
                            ? 'linear-gradient(135deg,#adb5bd,#868e96)'
                            : idx === 2
                              ? 'linear-gradient(135deg,#c68642,#8B5E3C)'
                              : 'linear-gradient(135deg,#0d6efd,#084298)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 700, fontSize: 12, margin: '0 auto',
                      }}>
                        {idx + 1}
                      </div>
                    ),
                  },
                  {
                    title: 'Sản phẩm',
                    key: 'product',
                    render: (_: any, r: TopProduct) => (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {r.product_image ? (
                          <img
                            src={r.product_image}
                            alt={r.product_name}
                            style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 8, border: '1px solid #eee', flexShrink: 0 }}
                          />
                        ) : (
                          <div style={{
                            width: 40, height: 40, borderRadius: 8, background: '#f0f0f0',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#ccc', fontSize: 16, flexShrink: 0,
                          }}>
                            <ShoppingOutlined />
                          </div>
                        )}
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 220 }}>
                            {r.product_name}
                          </div>
                          <div style={{ color: '#868e96', fontSize: 11 }}>{r.category_name}</div>
                        </div>
                      </div>
                    ),
                  },
                  {
                    title: 'Đã bán',
                    dataIndex: 'total_quantity_sold',
                    key: 'total_quantity_sold',
                    width: 90,
                    align: 'center' as const,
                    render: (v: number) => (
                      <span style={{ fontWeight: 700, color: '#fd7e14', fontSize: 16 }}>{v}</span>
                    ),
                  },
                  {
                    title: 'Doanh thu',
                    dataIndex: 'total_revenue',
                    key: 'total_revenue',
                    width: 140,
                    align: 'right' as const,
                    render: (v: number) => (
                      <Text strong style={{ color: '#0d6efd', fontSize: 13 }}>{formatVND(v)}</Text>
                    ),
                  },
                ]}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* ── Row 5: Bảng đơn hàng gần đây ────────────────────────────── */}
      <Row>
        <Col xs={24}>
          <Card
            title={<span style={{ fontWeight: 600 }}>🛒 Đơn hàng gần đây</span>}
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

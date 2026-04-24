import React, { useEffect, useState, useCallback } from 'react';
import {
  Row, Col, Card, Table, Tag, Typography,
  Spin, Empty, Segmented, Avatar, Select,
} from 'antd';
import {
  ShoppingOutlined, ShoppingCartOutlined,
  TeamOutlined, ArrowUpOutlined, ArrowDownOutlined,
  CheckCircleOutlined, DollarOutlined,
  WarningOutlined, SafetyCertificateOutlined, FireOutlined,
  PieChartOutlined, UserOutlined, BarChartOutlined, LineChartOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ComposedChart, Bar, Legend, PieChart, Pie, Cell,
  BarChart,
} from 'recharts';
import { axiosInstance } from '../../api/axios';
import { useAuth } from '../../context/AuthContext';

const { Title, Text } = Typography;
const { Option } = Select;

// ─── Types ───────────────────────────────────────────────────────────────────
type Period = 'today' | 'week' | 'month' | 'year';

interface DashboardStats {
  total_revenue: number;
  total_orders: number;
  pending_orders: number;
  completed_orders: number;
  incomplete_orders: number;
  total_products: number;
  total_customers: number;
  pending_contacts: number;
  pending_complaints: number;
  pending_returns: number;
  total_discount: number;
  today_revenue: number;
  today_orders: number;
  period: string;
  period_revenue: number;
  period_orders: number;
  period_new_customers: number;
  period_completed_orders: number;
  revenue_change: number | null;
  orders_change: number | null;
  customers_change: number | null;
  payment_sync: { delivered_unpaid: number; cod_delivered_paid: number; vnpay_paid: number };
  recent_orders: RecentOrder[];
  top_vouchers: TopVoucher[];
}

interface TopVoucher {
  id: number;
  code: string;
  name: string;
  discount_type: 'percent' | 'fixed';
  discount_value: number;
  used_count: number;
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

interface RevenueDataPoint { label: string; total: number; orders_count: number; }
interface CategorySales { category_id: number; category_name: string; total_revenue: number; total_quantity: number; order_count: number; }
interface TopProduct { product_id: number; product_name: string; product_slug: string; product_image: string | null; category_name: string; total_quantity_sold: number; total_revenue: number; }

interface OrdersStats {
  total: number;
  breakdown: Record<string, number>;
  trend: { label: string; count: number }[];
  completion_rate: number;
  cancellation_rate: number;
}

interface CustomersStats {
  new_customers: number;
  active_customers: number;
  trend: { label: string; new: number }[];
  top_customers: { id: number; name: string; email: string; avatar: string | null; order_count: number; total_spent: number }[];
}

interface LowStockProduct {
  id: number;
  name: string;
  slug: string;
  quantity: number;
  image: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const formatVND = (v: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

const formatVNDShort = (v: number) => {
  if (v >= 1_000_000_000) return `${(v / 1_000_000_000).toFixed(1)}B`;
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(0)}M`;
  if (v >= 1_000) return `${(v / 1_000).toFixed(0)}K`;
  return `${v}`;
};

const PIE_COLORS = ['#0d6efd', '#6f42c1', '#198754', '#fd7e14', '#dc3545', '#0dcaf0', '#ffc107', '#6610f2', '#d63384', '#20c997'];

const STATUS_CONFIG: Record<string, { color: string; label: string; hex: string }> = {
  pending:   { color: 'orange',   label: 'Chờ xác nhận', hex: '#fd7e14' },
  confirmed: { color: 'blue',     label: 'Đã xác nhận',  hex: '#0d6efd' },
  shipping:  { color: 'geekblue', label: 'Đang giao',    hex: '#5272d4' },
  delivered: { color: 'green',    label: 'Đã giao',      hex: '#198754' },
  completed: { color: 'cyan',     label: 'Hoàn thành',   hex: '#0dcaf0' },
  cancelled: { color: 'red',      label: 'Đã hủy',       hex: '#dc3545' },
  returned:  { color: 'volcano',  label: 'Hoàn trả',     hex: '#fa541c' },
};

const PERIOD_LABELS: Record<Period, string> = {
  today: 'Hôm nay',
  week: 'Tuần này',
  month: 'Tháng này',
  year: 'Năm nay',
};

// ─── Sub-components ─────────────────────────────────────────────────────────

const ChangeTag: React.FC<{ change: number | null; suffix?: string }> = ({ change, suffix = 'kỳ trước' }) => {
  if (change === null) return <Text style={{ color: '#adb5bd', fontSize: 12 }}>—</Text>;
  const isUp = change >= 0;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 3,
        color: isUp ? '#198754' : '#dc3545',
        background: isUp ? '#d1fae5' : '#fee2e2',
        borderRadius: 20, padding: '2px 8px', fontSize: 12, fontWeight: 600,
      }}>
        {isUp ? <ArrowUpOutlined /> : <ArrowDownOutlined />}
        {Math.abs(change)}%
      </span>
      <Text style={{ color: '#adb5bd', fontSize: 11 }}>vs {suffix}</Text>
    </div>
  );
};

const KpiCard: React.FC<{
  title: string; value: string | number; icon: React.ReactNode;
  color: string; change?: number | null; subtitle?: string;
}> = ({ title, value, icon, color, change, subtitle }) => (
  <Card
    hoverable
    style={{ borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', height: '100%', overflow: 'hidden' }}
    styles={{ body: { padding: 20 } }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
      <div style={{
        width: 44, height: 44, borderRadius: 12,
        background: `${color}20`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, color,
      }}>{icon}</div>
      {change !== undefined && <ChangeTag change={change ?? null} />}
    </div>
    <div style={{ fontSize: 26, fontWeight: 800, color: '#1a1a2e', lineHeight: 1.1, marginBottom: 4 }}>{value}</div>
    <div style={{ color: '#6c757d', fontSize: 12, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{title}</div>
    {subtitle && <div style={{ color: '#9ca3af', fontSize: 11, marginTop: 4 }}>{subtitle}</div>}
  </Card>
);

const ChartTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number | string; color: string }[]; label?: string; }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: '10px 14px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', minWidth: 160 }}>
      <div style={{ fontWeight: 700, marginBottom: 6, color: '#1a1a2e', fontSize: 13 }}>{label}</div>
      {payload.map((e, i: number) => (
        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 3 }}>
          <span style={{ color: e.color, fontSize: 12, fontWeight: 600 }}>
            {e.name === 'total' ? '💰 Doanh thu' : e.name === 'orders_count' ? '📦 Đơn hàng' : e.name === 'count' ? '📦 Đơn hàng' : '👤 Khách mới'}
          </span>
          <span style={{ fontWeight: 700, fontSize: 12, color: '#333' }}>
            {e.name === 'total' ? formatVND(e.value) : e.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const renderPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: { cx: number; cy: number; midAngle: number; innerRadius: number; outerRadius: number; percent: number }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const r = innerRadius + (outerRadius - innerRadius) * 0.5;
  return (
    <text x={cx + r * Math.cos(-midAngle * RADIAN)} y={cy + r * Math.sin(-midAngle * RADIAN)}
      fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const AdminDashboardPage: React.FC = () => {
  const { isAdmin } = useAuth();
  const [period, setPeriod] = useState<Period>('month');
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);
  const [revenueMode, setRevenueMode] = useState<'monthly' | 'daily'>('monthly');
  const [categorySales, setCategorySales] = useState<CategorySales[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topProductsPeriod, setTopProductsPeriod] = useState<'week' | 'month' | 'year' | 'all'>('month');
  const [topProductsSort, setTopProductsSort] = useState<'quantity' | 'revenue'>('revenue');
  const [ordersStats, setOrdersStats] = useState<OrdersStats | null>(null);
  const [customersStats, setCustomersStats] = useState<CustomersStats | null>(null);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Fetch khi period thay đổi ──────────────────────────────────────────────
  const fetchAll = useCallback(async (p: Period) => {
    setLoading(true);
    try {
      // Stats cơ bản — cả Admin + Staff đều được gọi
      const statsRes = await axiosInstance.get('/admin/dashboard/stats', { params: { period: p } });
      setStats(statsRes.data.data);

      const lowStockRes = await axiosInstance.get('/admin/dashboard/low-stock', { params: { limit: 10 } });
      setLowStockProducts(lowStockRes.data.data ?? []);

      // Các API nâng cao — chỉ Admin mới có quyền
      if (isAdmin) {
        const [categoryRes, ordersRes, customersRes] = await Promise.all([
          axiosInstance.get('/admin/dashboard/sales-by-category', { params: { period: p } }),
          axiosInstance.get('/admin/dashboard/orders-stats', { params: { period: p } }),
          axiosInstance.get('/admin/dashboard/customers-stats', { params: { period: p } }),
        ]);
        setCategorySales(categoryRes.data.data ?? []);
        setOrdersStats(ordersRes.data.data);
        setCustomersStats(customersRes.data.data);
      }
    } catch (e) {
      console.error('Dashboard fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { fetchAll(period); }, [period, fetchAll]);

  // ── Fetch revenue ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAdmin) return;
    axiosInstance.get('/admin/dashboard/revenue', { params: { mode: revenueMode } })
      .then(r => setRevenueData(r.data.data ?? []))
      .catch(console.error);
  }, [revenueMode, isAdmin]);

  // ── Fetch top products ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAdmin) return;
    axiosInstance.get('/admin/dashboard/top-products', {
      params: { period: topProductsPeriod, sort: topProductsSort, limit: 10 }
    })
      .then(r => setTopProducts(r.data.data ?? []))
      .catch(console.error);
  }, [topProductsPeriod, topProductsSort, isAdmin]);

  // ── Order columns ──────────────────────────────────────────────────────────
  const orderColumns = [
    {
      title: 'Mã đơn', dataIndex: 'code', key: 'code',
      render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: 'Khách hàng', key: 'customer',
      render: (_: unknown, r: RecentOrder) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 13 }}>{r.customer_name}</div>
          <div style={{ color: '#868e96', fontSize: 12 }}>{r.customer_email}</div>
        </div>
      ),
    },
    {
      title: 'Giá trị', dataIndex: 'total_amount', key: 'total_amount',
      render: (v: number) => <Text strong style={{ color: '#0d6efd' }}>{formatVND(v)}</Text>,
    },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status',
      render: (v: string) => {
        const c = STATUS_CONFIG[v] || { color: 'default', label: v, hex: '#999' };
        return <Tag color={c.color} style={{ borderRadius: 20, padding: '2px 10px' }}>{c.label}</Tag>;
      },
    },
    {
      title: 'Thanh toán', key: 'payment',
      render: (_: unknown, r: RecentOrder) => (
        <div>
          <Tag color={r.payment_status === 'paid' ? 'green' : r.payment_status === 'failed' ? 'red' : 'orange'} style={{ borderRadius: 20, fontSize: 11 }}>
            {r.payment_status === 'paid' ? 'Đã TT' : r.payment_status === 'failed' ? 'Thất bại' : 'Chờ TT'}
          </Tag>
          <div style={{ fontSize: 11, color: '#868e96' }}>{r.payment_method === 'vnpay' ? 'VNPAY' : 'COD'}</div>
        </div>
      ),
    },
    {
      title: 'Ngày đặt', dataIndex: 'created_at', key: 'created_at',
      render: (v: string) => new Date(v).toLocaleDateString('vi-VN'),
    },
  ];

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 100 }}>
        <Spin size="large" />
        <div style={{ marginTop: 16, color: '#868e96', fontSize: 14 }}>Đang tải dữ liệu...</div>
      </div>
    );
  }

  if (!stats) return null;

  const totalCatRevenue = categorySales.reduce((s, c) => s + c.total_revenue, 0);
  const orderBreakdownForPie = ordersStats
    ? Object.entries(ordersStats.breakdown)
        .filter(([, v]) => v > 0)
        .map(([k, v]) => ({ name: STATUS_CONFIG[k]?.label ?? k, value: v, hex: STATUS_CONFIG[k]?.hex ?? '#999' }))
    : [];

  return (
    <div style={{ padding: '16px 24px 40px', maxWidth: 1440, margin: '0 auto', background: '#f8f9fc', minHeight: '100vh' }}>

      {/* ── Header + Period Filter ─────────────────────────────────────────── */}
      <div style={{
        marginBottom: 24, display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', flexWrap: 'wrap', gap: 12,
      }}>
        <div>
          <Title level={4} style={{ margin: 0, color: '#1a1a2e', fontWeight: 800 }}>📊 Dashboard Analytics</Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Dữ liệu cập nhật lúc {new Date().toLocaleTimeString('vi-VN')}
          </Text>
        </div>
        <Segmented
          value={period}
          onChange={v => setPeriod(v as Period)}
          options={[
            { label: '📅 Hôm nay', value: 'today' },
            { label: '📆 Tuần này', value: 'week' },
            { label: '🗓️ Tháng này', value: 'month' },
            { label: '📊 Năm nay', value: 'year' },
          ]}
          style={{ borderRadius: 24, fontWeight: 600 }}
        />
      </div>

      {/* ── Section 1: KPI Cards ──────────────────────────────────────────── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {isAdmin && (
          <Col xs={24} sm={12} lg={6}>
            <KpiCard
              title={`Doanh thu ${PERIOD_LABELS[period]}`}
              value={formatVNDShort(stats.period_revenue)}
              icon={<DollarOutlined />}
              color="#F28B00"
              change={stats.revenue_change}
              subtitle={formatVND(stats.period_revenue)}
            />
          </Col>
        )}
        <Col xs={24} sm={12} lg={isAdmin ? 6 : 12}>
          <KpiCard
            title={`Đơn hàng ${PERIOD_LABELS[period]}`}
            value={stats.period_orders}
            icon={<ShoppingCartOutlined />}
            color="#0d6efd"
            change={stats.orders_change}
            subtitle={`${stats.pending_orders} đơn đang chờ`}
          />
        </Col>
        {isAdmin && (
          <Col xs={24} sm={12} lg={6}>
            <KpiCard
              title={`Khách mới ${PERIOD_LABELS[period]}`}
              value={stats.period_new_customers}
              icon={<TeamOutlined />}
              color="#198754"
              change={stats.customers_change}
              subtitle={`Tổng: ${stats.total_customers} khách hàng`}
            />
          </Col>
        )}
        {isAdmin && (
          <Col xs={24} sm={12} lg={6}>
            <KpiCard
              title="Tỉ lệ hoàn thành"
              value={`${ordersStats?.completion_rate ?? 0}%`}
              icon={<CheckCircleOutlined />}
              color="#6f42c1"
              subtitle={`Hủy: ${ordersStats?.cancellation_rate ?? 0}%`}
            />
          </Col>
        )}
        {!isAdmin && (
          <Col xs={24} sm={12} lg={12}>
            <KpiCard
              title="Tổng sản phẩm"
              value={stats.total_products}
              icon={<ShoppingOutlined />}
              color="#6f42c1"
            />
          </Col>
        )}
      </Row>

      {/* ── Row: All-time stat mini-cards ────────────────────────────────── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {[
          { label: 'Tổng doanh thu', value: formatVNDShort(stats.total_revenue), sub: 'All-time', color: '#F28B00' },
          { label: 'Tổng giảm giá', value: formatVNDShort(stats.total_discount), sub: 'Khuyến mãi / Voucher', color: '#e83e8c' },
          { label: 'Tổng đơn hàng', value: stats.total_orders, sub: `${stats.completed_orders} hoàn thành`, color: '#0d6efd' },
          { label: 'Doanh thu hôm nay', value: formatVNDShort(stats.today_revenue), sub: `${stats.today_orders} đơn`, color: '#198754' },
          { label: 'Đơn chờ xử lý', value: stats.pending_orders, sub: '', color: '#fd7e14' },
          { label: 'Hoàn trả chờ duyệt', value: stats.pending_returns, sub: '', color: '#dc3545' },
          { label: 'Khiếu nại chờ xử lý', value: stats.pending_complaints, sub: '', color: '#dc3545' },
          { label: 'Tổng sản phẩm', value: stats.total_products, sub: '', color: '#6f42c1' },
          { label: 'Liên hệ chờ', value: stats.pending_contacts, sub: '', color: '#dc3545' },
        ].map((item, i) => (
          <Col xs={12} sm={8} lg={3} key={i}>
            <Card
              style={{ borderRadius: 12, border: item.value > 0 && item.label.includes('chờ') ? '1px solid #fca5a5' : '1px solid #e9ecef', background: item.value > 0 && item.label.includes('chờ') ? '#fff5f5' : '#fff', textAlign: 'center', height: '100%' }}
              styles={{ body: { padding: '14px 6px' } }}
            >
              <div style={{ fontSize: 18, fontWeight: 800, color: item.color }}>{item.value}</div>
              <div style={{ fontSize: 11, color: '#555', fontWeight: 600, marginTop: 2 }}>{item.label}</div>
              {item.sub && <div style={{ fontSize: 10, color: '#adb5bd', marginTop: 2 }}>{item.sub}</div>}
            </Card>
          </Col>
        ))}
      </Row>

      {/* ── Section 2: Revenue Chart (Admin only) ──────────────────────────── */}
      {isAdmin && (
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24}>
          <Card
            style={{ borderRadius: 16, border: '1px solid #e9ecef', boxShadow: '0 2px 12px rgba(0,0,0,0.05)' }}
            styles={{ body: { padding: '8px 16px 16px' } }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <LineChartOutlined style={{ color: '#0d6efd' }} />
                  <span style={{ fontWeight: 700, fontSize: 15 }}>
                    Doanh thu & Đơn hàng {revenueMode === 'monthly' ? `năm ${new Date().getFullYear()}` : '(30 ngày gần nhất)'}
                  </span>
                </div>
                <Segmented
                  value={revenueMode}
                  onChange={v => setRevenueMode(v as 'monthly' | 'daily')}
                  options={[
                    { label: '📅 Theo tháng', value: 'monthly' },
                    { label: '📆 Theo ngày', value: 'daily' },
                  ]}
                  style={{ borderRadius: 20 }}
                />
              </div>
            }
          >
            <ResponsiveContainer width="100%" height={300}>
              <ComposedChart data={revenueData}>
                <defs>
                  <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d6efd" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#0d6efd" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} interval={revenueMode === 'daily' ? 2 : 0} />
                <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} tickFormatter={formatVNDShort} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend wrapperStyle={{ paddingTop: 12 }} formatter={(v: string) => (
                  <span style={{ color: '#555', fontSize: 12, fontWeight: 500 }}>{v === 'total' ? 'Doanh thu' : 'Số đơn hàng'}</span>
                )} />
                <Area yAxisId="left" type="monotone" dataKey="total" stroke="#0d6efd" strokeWidth={2.5} fill="url(#gradRevenue)" dot={{ fill: '#0d6efd', r: 3 }} activeDot={{ r: 6 }} name="total" />
                <Bar yAxisId="right" dataKey="orders_count" fill="#6f42c1" opacity={0.65} radius={[4, 4, 0, 0]} barSize={revenueMode === 'daily' ? 6 : 18} name="orders_count" />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
      )}

      {/* ── Section 3: Order Stats (Admin only) ────────────────────────────── */}
      {isAdmin && (
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {/* Donut Chart - Status Breakdown */}
        <Col xs={24} lg={9}>
          <Card
            style={{ borderRadius: 16, border: '1px solid #e9ecef', height: '100%' }}
            styles={{ body: { padding: '8px 16px 16px' } }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PieChartOutlined style={{ color: '#6f42c1' }} />
                <span style={{ fontWeight: 700 }}>Phân bổ đơn hàng</span>
                <Tag color="purple" style={{ borderRadius: 20, fontSize: 11 }}>{PERIOD_LABELS[period]}</Tag>
              </div>
            }
          >
            {!ordersStats || ordersStats.total === 0 ? (
              <Empty description="Không có đơn hàng trong kỳ" style={{ padding: '40px 0' }} />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={orderBreakdownForPie}
                      dataKey="value" nameKey="name"
                      cx="50%" cy="50%"
                      innerRadius={55} outerRadius={95}
                      labelLine={false} label={renderPieLabel}
                      strokeWidth={2} stroke="#fff"
                    >
                      {orderBreakdownForPie.map((e, i) => <Cell key={i} fill={e.hex} />)}
                    </Pie>
                    <Tooltip formatter={(v: number, n: string) => [v + ' đơn', n]} contentStyle={{ borderRadius: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center' }}>
                  {orderBreakdownForPie.map((e, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 20, background: '#f8f9fa', fontSize: 11 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: e.hex }} />
                      <span style={{ fontWeight: 500, color: '#555' }}>{e.name}</span>
                      <span style={{ fontWeight: 700, color: '#333' }}>{e.value}</span>
                    </div>
                  ))}
                </div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 20, marginTop: 12 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#198754' }}>{ordersStats.completion_rate}%</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>Tỉ lệ hoàn thành</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#dc3545' }}>{ordersStats.cancellation_rate}%</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>Tỉ lệ hủy đơn</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontWeight: 800, color: '#0d6efd' }}>{ordersStats.total}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>Tổng đơn kỳ này</div>
                  </div>
                </div>
              </>
            )}
          </Card>
        </Col>

        {/* Bar Chart - Order Trend */}
        <Col xs={24} lg={15}>
          <Card
            style={{ borderRadius: 16, border: '1px solid #e9ecef', height: '100%' }}
            styles={{ body: { padding: '8px 16px 16px' } }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BarChartOutlined style={{ color: '#0d6efd' }} />
                <span style={{ fontWeight: 700 }}>Xu hướng đơn hàng — {PERIOD_LABELS[period]}</span>
              </div>
            }
          >
            {!ordersStats || ordersStats.trend.length === 0 ? (
              <Empty description="Không có dữ liệu" style={{ padding: '60px 0' }} />
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={ordersStats.trend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                    interval={ordersStats.trend.length > 20 ? 2 : 0} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="count" fill="#0d6efd" radius={[6, 6, 0, 0]} name="count"
                    barSize={ordersStats.trend.length > 20 ? 8 : 20} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>
      </Row>
      )}

      {/* ── Section 4: Category Sales + Top Products (Admin only) ─────────── */}
      {isAdmin && (
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {/* Pie - Category Revenue */}
        <Col xs={24} lg={9}>
          <Card
            style={{ borderRadius: 16, border: '1px solid #e9ecef', height: '100%' }}
            styles={{ body: { padding: '8px 16px 16px' } }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <PieChartOutlined style={{ color: '#fd7e14' }} />
                <span style={{ fontWeight: 700 }}>Doanh thu theo danh mục</span>
              </div>
            }
          >
            {categorySales.length === 0 ? (
              <Empty description="Chưa có dữ liệu" style={{ padding: '40px 0' }} />
            ) : (
              <>
                <ResponsiveContainer width="100%" height={210}>
                  <PieChart>
                    <Pie data={categorySales} dataKey="total_revenue" nameKey="category_name"
                      cx="50%" cy="50%" innerRadius={45} outerRadius={88}
                      labelLine={false} label={renderPieLabel} strokeWidth={2} stroke="#fff">
                      {categorySales.map((_e, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number, n: string) => [formatVND(v), n]} contentStyle={{ borderRadius: 10 }} />
                  </PieChart>
                </ResponsiveContainer>
                <div style={{ marginTop: 8 }}>
                  {categorySales.slice(0, 6).map((cat, i) => (
                    <div key={cat.category_id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: i < 5 ? '1px solid #f5f5f5' : 'none' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 10, height: 10, borderRadius: 3, background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#555' }}>{cat.category_name}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#1a1a2e' }}>{formatVNDShort(cat.total_revenue)}</div>
                        <div style={{ fontSize: 10, color: '#adb5bd' }}>
                          {totalCatRevenue > 0 ? `${((cat.total_revenue / totalCatRevenue) * 100).toFixed(1)}%` : '0%'}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </Col>

        {/* Top Products */}
        <Col xs={24} lg={15}>
          <Card
            style={{ borderRadius: 16, border: '1px solid #e9ecef', height: '100%' }}
            styles={{ body: { padding: 0 } }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FireOutlined style={{ color: '#fd7e14' }} />
                  <span style={{ fontWeight: 700 }}>Top sản phẩm bán chạy</span>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <Select size="small" value={topProductsPeriod} onChange={setTopProductsPeriod} style={{ width: 110 }}>
                    <Option value="week">Tuần này</Option>
                    <Option value="month">Tháng này</Option>
                    <Option value="year">Năm nay</Option>
                    <Option value="all">Tất cả</Option>
                  </Select>
                  <Select size="small" value={topProductsSort} onChange={setTopProductsSort} style={{ width: 110 }}>
                    <Option value="revenue">Doanh thu</Option>
                    <Option value="quantity">Số lượng</Option>
                  </Select>
                </div>
              </div>
            }
          >
            {topProducts.length === 0 ? (
              <Empty description="Không có dữ liệu" style={{ padding: '60px 0' }} />
            ) : (
              <Table
                dataSource={topProducts}
                rowKey="product_id"
                pagination={false}
                size="small"
                style={{ borderRadius: 16, overflow: 'hidden' }}
                columns={[
                  {
                    title: '#', key: 'rank', width: 44, align: 'center' as const,
                    render: (_: unknown, __: unknown, idx: number) => (
                      <div style={{
                        width: 26, height: 26, borderRadius: 8, margin: '0 auto',
                        background: idx === 0 ? 'linear-gradient(135deg,#ffc107,#c79100)'
                          : idx === 1 ? 'linear-gradient(135deg,#adb5bd,#868e96)'
                          : idx === 2 ? 'linear-gradient(135deg,#c68642,#8B5E3C)'
                          : 'linear-gradient(135deg,#0d6efd,#084298)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#fff', fontWeight: 700, fontSize: 11,
                      }}>{idx + 1}</div>
                    ),
                  },
                  {
                    title: 'Sản phẩm', key: 'product',
                    render: (_: unknown, r: TopProduct) => (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {r.product_image
                          ? <img src={r.product_image} alt={r.product_name} style={{ width: 36, height: 36, objectFit: 'contain', borderRadius: 8, border: '1px solid #eee', flexShrink: 0 }} />
                          : <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', flexShrink: 0 }}><ShoppingOutlined /></div>
                        }
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>{r.product_name}</div>
                          <div style={{ color: '#868e96', fontSize: 10 }}>{r.category_name}</div>
                        </div>
                      </div>
                    ),
                  },
                  {
                    title: 'Đã bán', dataIndex: 'total_quantity_sold', key: 'qty', width: 70, align: 'center' as const,
                    render: (v: number) => <span style={{ fontWeight: 700, color: '#fd7e14', fontSize: 15 }}>{v}</span>,
                  },
                  {
                    title: 'Doanh thu', dataIndex: 'total_revenue', key: 'rev', width: 130, align: 'right' as const,
                    render: (v: number) => <Text strong style={{ color: '#0d6efd', fontSize: 12 }}>{formatVND(v)}</Text>,
                  },
                ]}
              />
            )}
          </Card>
        </Col>
      </Row>
      )}

      {/* ── Section: Low Stock Products ────────────────────────────── */}
      <Row style={{ marginBottom: 20 }}>
        <Col xs={24}>
          <Card
            title={<span style={{ fontWeight: 700 }}><WarningOutlined style={{ color: '#dc3545', marginRight: 8 }} /> Cảnh báo sắp hết hàng</span>}
            extra={<a href="/admin/products" style={{ fontSize: 13, color: '#0d6efd' }}>Quản lý kho →</a>}
            style={{ borderRadius: 16, border: '1px solid #fca5a5', boxShadow: '0 4px 12px rgba(220,53,69,0.05)' }}
            styles={{ body: { padding: 0 } }}
          >
            {lowStockProducts.length === 0 ? (
              <Empty description="Kho hàng ổn định" style={{ padding: '30px 0' }} />
            ) : (
              <Table
                dataSource={lowStockProducts}
                rowKey="id"
                pagination={false}
                size="middle"
                style={{ borderRadius: 16, overflow: 'hidden' }}
                columns={[
                  {
                    title: 'Sản phẩm', key: 'product',
                    render: (_: unknown, r: LowStockProduct) => (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {r.image
                          ? <img src={r.image} alt={r.name} style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 8, border: '1px solid #eee', flexShrink: 0 }} />
                          : <div style={{ width: 40, height: 40, borderRadius: 8, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', flexShrink: 0 }}><ShoppingOutlined /></div>
                        }
                        <span style={{ fontWeight: 600, fontSize: 13 }}>{r.name}</span>
                      </div>
                    ),
                  },
                  {
                    title: 'Mã (ID)', dataIndex: 'id', key: 'id', width: 100, align: 'center',
                    render: (v: number) => <Text code>{v}</Text>,
                  },
                  {
                    title: 'Tồn kho hiện tại', dataIndex: 'quantity', key: 'qty', width: 150, align: 'center',
                    render: (v: number) => (
                      <Tag color={v === 0 ? 'red' : 'volcano'} style={{ fontWeight: 700, padding: '2px 10px', borderRadius: 20 }}>
                        {v === 0 ? 'Hết hàng' : `Chỉ còn ${v}`}
                      </Tag>
                    ),
                  },
                ]}
              />
            )}
          </Card>
        </Col>
      </Row>

      {/* ── Section 5: Customer Analytics (Admin only) ────────────────────── */}
      {isAdmin && (
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {/* New Customer Trend */}
        <Col xs={24} lg={14}>
          <Card
            style={{ borderRadius: 16, border: '1px solid #e9ecef', height: '100%' }}
            styles={{ body: { padding: '8px 16px 16px' } }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <LineChartOutlined style={{ color: '#198754' }} />
                <span style={{ fontWeight: 700 }}>Khách hàng mới — {PERIOD_LABELS[period]}</span>
                {customersStats && (
                  <Tag color="green" style={{ borderRadius: 20, fontSize: 11 }}>
                    {customersStats.new_customers} khách mới | {customersStats.active_customers} active
                  </Tag>
                )}
              </div>
            }
          >
            {!customersStats || customersStats.trend.length === 0 ? (
              <Empty description="Không có dữ liệu" style={{ padding: '60px 0' }} />
            ) : (
              <ResponsiveContainer width="100%" height={270}>
                <AreaChart data={customersStats.trend}>
                  <defs>
                    <linearGradient id="gradCustomer" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#198754" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#198754" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                    interval={customersStats.trend.length > 20 ? 2 : 0} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="new" stroke="#198754" strokeWidth={2.5} fill="url(#gradCustomer)"
                    dot={{ fill: '#198754', r: 3 }} activeDot={{ r: 6 }} name="new" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </Card>
        </Col>

        {/* Top Customers */}
        <Col xs={24} lg={10}>
          <Card
            style={{ borderRadius: 16, border: '1px solid #e9ecef', height: '100%' }}
            styles={{ body: { padding: '8px 0 16px' } }}
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TrophyOutlined style={{ color: '#ffc107' }} />
                <span style={{ fontWeight: 700 }}>Top khách hàng chi tiêu</span>
              </div>
            }
          >
            {!customersStats || customersStats.top_customers.length === 0 ? (
              <Empty description="Chưa có dữ liệu" style={{ padding: '40px 0' }} />
            ) : (
              <div style={{ padding: '0 4px' }}>
                {customersStats.top_customers.map((c, i) => (
                  <div key={c.id} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '8px 12px', borderRadius: 10,
                    background: i === 0 ? '#fffbeb' : i % 2 === 0 ? '#fafafa' : '#fff',
                    marginBottom: 2,
                  }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: 6, flexShrink: 0,
                      background: i === 0 ? 'linear-gradient(135deg,#ffc107,#c79100)'
                        : i === 1 ? 'linear-gradient(135deg,#adb5bd,#868e96)'
                        : i === 2 ? 'linear-gradient(135deg,#c68642,#8B5E3C)'
                        : '#e9ecef',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: i < 3 ? '#fff' : '#999', fontWeight: 700, fontSize: 10,
                    }}>{i + 1}</div>
                    <Avatar
                      src={c.avatar || undefined}
                      icon={<UserOutlined />}
                      size={32}
                      style={{ flexShrink: 0, background: c.avatar ? 'transparent' : '#e9ecef' }}
                      onError={() => true}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.name}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 12, color: '#0d6efd' }}>{formatVNDShort(c.total_spent)}</div>
                      <div style={{ fontSize: 10, color: '#9ca3af' }}>{c.order_count} đơn</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>
      )}

      {/* ── Section 6: Payment Sync Status ────────────────────────────────── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 12, border: '1px solid #e9ecef', background: '#f0fdf4' }} styles={{ body: { padding: '14px 18px' } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#19875420', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#198754', fontSize: 20 }}><SafetyCertificateOutlined /></div>
              <div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>COD đã thanh toán</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#198754' }}>{stats.payment_sync.cod_delivered_paid}</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ borderRadius: 12, border: '1px solid #e9ecef', background: '#eff6ff' }} styles={{ body: { padding: '14px 18px' } }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#0d6efd20', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#0d6efd', fontSize: 20 }}><DollarOutlined /></div>
              <div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>VNPAY đã thanh toán</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#0d6efd' }}>{stats.payment_sync.vnpay_paid}</div>
              </div>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card
            style={{ borderRadius: 12, border: stats.payment_sync.delivered_unpaid > 0 ? '1px solid #fca5a5' : '1px solid #e9ecef', background: stats.payment_sync.delivered_unpaid > 0 ? '#fff5f5' : '#f0fdf4' }}
            styles={{ body: { padding: '14px 18px' } }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: stats.payment_sync.delivered_unpaid > 0 ? '#dc354520' : '#19875420', display: 'flex', alignItems: 'center', justifyContent: 'center', color: stats.payment_sync.delivered_unpaid > 0 ? '#dc3545' : '#198754', fontSize: 20 }}>
                {stats.payment_sync.delivered_unpaid > 0 ? <WarningOutlined /> : <CheckCircleOutlined />}
              </div>
              <div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>Đã giao chưa TT</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: stats.payment_sync.delivered_unpaid > 0 ? '#dc3545' : '#198754' }}>
                  {stats.payment_sync.delivered_unpaid > 0 ? stats.payment_sync.delivered_unpaid : '✓ OK'}
                </div>
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* ── Section 7: Recent Orders & Vouchers ──────────────────────────── */}
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={16}>
          <Card
            title={<span style={{ fontWeight: 700 }}>🛒 Đơn hàng gần đây</span>}
            extra={<a href="/admin/orders" style={{ fontSize: 13, color: '#0d6efd' }}>Xem tất cả →</a>}
            style={{ borderRadius: 16, border: '1px solid #e9ecef', boxShadow: '0 2px 12px rgba(0,0,0,0.04)', height: '100%' }}
            styles={{ body: { padding: 0 } }}
          >
            <div style={{ overflowX: 'auto' }}>
              <Table
                columns={orderColumns}
                dataSource={stats.recent_orders}
                rowKey="id"
                pagination={false}
                size="middle"
                style={{ borderRadius: 16, minWidth: 600 }}
                locale={{ emptyText: 'Chưa có đơn hàng nào' }}
              />
            </div>
          </Card>
        </Col>
        <Col xs={24} lg={8}>
          <Card
            title={<span style={{ fontWeight: 700 }}>🎟️ Top Khuyến Mãi</span>}
            extra={<a href="/admin/vouchers" style={{ fontSize: 13, color: '#e83e8c' }}>Tất cả →</a>}
            style={{ borderRadius: 16, border: '1px solid #f8d7da', boxShadow: '0 2px 12px rgba(232,62,140,0.05)', height: '100%' }}
            styles={{ body: { padding: '8px 16px' } }}
          >
            {!stats.top_vouchers || stats.top_vouchers.length === 0 ? (
              <Empty description="Chưa có mã giảm giá nào được dùng" style={{ padding: '60px 0' }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {stats.top_vouchers.map((v, i) => (
                  <div key={v.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: i === 0 ? '#fff0f3' : '#f8f9fa', borderRadius: 12, border: i === 0 ? '1px solid #ffb3c6' : '1px solid transparent' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#e83e8c', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {v.code}
                        {i === 0 && <FireOutlined style={{ color: '#fd7e14' }} />}
                      </div>
                      <div style={{ fontSize: 11, color: '#6c757d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.name}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>
                        {v.discount_type === 'percent' ? `${v.discount_value}%` : formatVND(v.discount_value)}
                      </div>
                      <div style={{ fontSize: 11, color: '#198754', fontWeight: 600 }}>Tần suất: {v.used_count} lần</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default AdminDashboardPage;

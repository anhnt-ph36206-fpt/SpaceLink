import React, { useEffect, useState, useCallback } from 'react';
import {
  Table, Button, Modal, Space, Tag, Typography, message, Card,
  Row, Col, Select, Input, Descriptions, Badge, Tooltip, Form,
  Divider, Timeline, DatePicker, Drawer, Spin, Image,
} from 'antd';
import {
  SearchOutlined, ShoppingCartOutlined, EyeOutlined, ReloadOutlined,
  CheckCircleOutlined, ClockCircleOutlined, CarOutlined, CloseCircleOutlined,
  DollarOutlined, FilterOutlined, HistoryOutlined, SendOutlined,
  SyncOutlined, GiftOutlined, RollbackOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { axiosInstance } from '../../api/axios';


const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// ============================================================
// Types
// ============================================================
interface OrderItem {
  id: number;
  product_id: number;
  variant_id?: number;
  product_name: string;
  product_image?: string;
  product_sku?: string;
  variant_info?: Record<string, string>;
  price: number;
  quantity: number;
  total: number;
}

interface StatusHistory {
  from: string;
  to: string;
  note?: string;
  changed_by?: number;
  created_at: string;
}

interface ShippingInfo {
  fullname?: string;
  phone?: string;
  email?: string;
  province?: string;
  district?: string;
  ward?: string;
  address?: string;
}

interface OrderUser {
  id: number;
  fullname?: string;
  email?: string;
  phone?: string;
}

interface Order {
  id: number;
  order_code: string;
  user?: OrderUser;
  shipping: ShippingInfo;
  subtotal: number;
  discount_amount: number;
  shipping_fee: number;
  total_amount: number;
  status: string;
  payment_status: string;
  payment_method?: string;
  voucher_code?: string;
  voucher_discount?: number;
  note?: string;
  admin_note?: string;
  cancelled_reason?: string;
  cancelled_at?: string;
  tracking_code?: string;
  shipping_partner?: string;
  estimated_delivery?: string;
  confirmed_at?: string;
  shipped_at?: string;
  delivered_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at?: string;
  items?: OrderItem[];
  status_history?: StatusHistory[];
}

interface PaginationMeta {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

// ============================================================
// Config
// ============================================================
const ORDER_STATUS_CONFIG: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  pending:    { color: 'orange',   label: 'Chờ xác nhận',   icon: <ClockCircleOutlined /> },
  confirmed:  { color: 'blue',     label: 'Đã xác nhận',    icon: <CheckCircleOutlined /> },
  processing: { color: 'purple',   label: 'Đang xử lí',     icon: <SyncOutlined spin /> },
  shipping:   { color: 'geekblue', label: 'Đang giao hàng', icon: <CarOutlined /> },
  delivered:  { color: 'cyan',     label: 'Đã giao hàng',   icon: <CheckCircleOutlined /> },
  completed:  { color: 'success',  label: 'Hoàn thành',     icon: <CheckCircleOutlined /> },
  cancelled:  { color: 'error',    label: 'Đã hủy',         icon: <CloseCircleOutlined /> },
  returned:   { color: 'default',  label: 'Hoàn trả',       icon: <RollbackOutlined /> },
};

const PAYMENT_STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  pending:  { color: 'orange',  label: 'Chưa thanh toán' },
  paid:     { color: 'success', label: 'Đã thanh toán' },
  failed:   { color: 'error',   label: 'Thất bại' },
  refunded: { color: 'default', label: 'Đã hoàn tiền' },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod:     'COD',
  vnpay:   'VNPay',
  banking: 'Chuyển khoản',
};

const formatVND = (v: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

const API_BASE = '/admin/orders';

// ============================================================
// Status Tag helper
// ============================================================
const StatusTag: React.FC<{ status: string; config: Record<string, { color: string; label: string; icon?: React.ReactNode }> }> = ({
  status, config,
}) => {
  const cfg = config[status] ?? { color: 'default', label: status };
  return (
    <Tag color={cfg.color} icon={cfg.icon} style={{ borderRadius: 20, margin: 0 }}>
      {cfg.label}
    </Tag>
  );
};

// ============================================================
// Main Component
// ============================================================
const AdminOrderPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<PaginationMeta>({ total: 0, per_page: 15, current_page: 1, last_page: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  // Detail drawer
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // Status update modal
  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [updatingOrder, setUpdatingOrder] = useState<Order | null>(null);
  const [statusForm] = Form.useForm();
  const [savingStatus, setSavingStatus] = useState(false);

  // Payment status modal
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentForm] = Form.useForm();
  const [savingPayment, setSavingPayment] = useState(false);

  // --------------------------------------------------------
  // Fetch orders list
  // --------------------------------------------------------
  const fetchOrders = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { per_page: 15, page };
      if (search)               params.search         = search;
      if (statusFilter)         params.status         = statusFilter;
      if (paymentStatusFilter)  params.payment_status = paymentStatusFilter;
      if (paymentMethodFilter)  params.payment_method = paymentMethodFilter;
      if (dateRange) {
        params.date_from = dateRange[0];
        params.date_to   = dateRange[1];
      }

      const res = await axiosInstance.get(API_BASE, { params });
      const payload = res.data;

      // Laravel pagination: { data: [], meta: {}, links: {} } or { data: { data: [], ... } }
      const list: Order[] = payload?.data?.data ?? payload?.data ?? [];
      const m = payload?.data?.meta ?? payload?.meta ?? {};
      setOrders(list);
      setMeta({
        total:        m.total        ?? list.length,
        per_page:     m.per_page     ?? 15,
        current_page: m.current_page ?? page,
        last_page:    m.last_page    ?? 1,
      });
    } catch (err: any) {
      console.error(err);
      message.error(err?.response?.data?.message ?? 'Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, paymentStatusFilter, paymentMethodFilter, dateRange]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // --------------------------------------------------------
  // Fetch single order detail
  // --------------------------------------------------------
  const openDetail = async (order: Order) => {
    setDrawerOpen(true);
    setDetailOrder(order);
    setDetailLoading(true);
    try {
      const res = await axiosInstance.get(`${API_BASE}/${order.id}`);
      const d: Order = res.data?.data ?? res.data;
      setDetailOrder(d);
    } catch {
      // fallback: keep the list row data
    } finally {
      setDetailLoading(false);
    }
  };

  // --------------------------------------------------------
  // Update order status
  // --------------------------------------------------------
  const openStatusModal = (order: Order) => {
    setUpdatingOrder(order);
    statusForm.resetFields();
    statusForm.setFieldsValue({ status: order.status });
    setStatusModalOpen(true);
  };

  const handleStatusSave = async () => {
    if (!updatingOrder) return;
    try {
      const values = await statusForm.validateFields();
      setSavingStatus(true);
      await axiosInstance.patch(`${API_BASE}/${updatingOrder.id}/status`, values);
      message.success('Đã cập nhật trạng thái đơn hàng!');
      setStatusModalOpen(false);
      fetchOrders(meta.current_page);
      // Reload drawer if open
      if (drawerOpen && detailOrder?.id === updatingOrder.id) {
        openDetail(updatingOrder);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? err?.response?.data?.errors?.status?.[0] ?? 'Có lỗi xảy ra';
      message.error(msg);
    } finally {
      setSavingStatus(false);
    }
  };

  // --------------------------------------------------------
  // Update payment status
  // --------------------------------------------------------
  const openPaymentModal = (order: Order) => {
    setUpdatingOrder(order);
    paymentForm.resetFields();
    paymentForm.setFieldsValue({ payment_status: order.payment_status });
    setPaymentModalOpen(true);
  };

  const handlePaymentSave = async () => {
    if (!updatingOrder) return;
    try {
      const values = await paymentForm.validateFields();
      setSavingPayment(true);
      await axiosInstance.patch(`${API_BASE}/${updatingOrder.id}/payment-status`, values);
      message.success('Đã cập nhật trạng thái thanh toán!');
      setPaymentModalOpen(false);
      fetchOrders(meta.current_page);
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Có lỗi xảy ra';
      message.error(msg);
    } finally {
      setSavingPayment(false);
    }
  };

  // --------------------------------------------------------
  // Statistics (from current fetched page – for quick summary)
  // --------------------------------------------------------
  const stats = Object.keys(ORDER_STATUS_CONFIG).map((key) => ({
    key,
    ...ORDER_STATUS_CONFIG[key],
    count: orders.filter((o) => o.status === key).length,
  }));

  const deliveredRevenue = orders
    .filter((o) => o.status === 'delivered' || o.status === 'completed')
    .reduce((s, o) => s + o.total_amount, 0);

  // --------------------------------------------------------
  // Table columns
  // --------------------------------------------------------
  const columns: ColumnsType<Order> = [
    {
      title: 'Mã đơn hàng',
      dataIndex: 'order_code',
      key: 'order_code',
      width: 160,
      render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: 'Khách hàng',
      key: 'customer',
      render: (_: unknown, r: Order) => {
        const name = r.shipping?.fullname ?? r.user?.fullname ?? '—';
        const email = r.user?.email ?? r.shipping?.email ?? '—';
        const phone = r.shipping?.phone ?? r.user?.phone ?? '—';
        return (
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{email}</Text>
            <div><Text type="secondary" style={{ fontSize: 12 }}>{phone}</Text></div>
          </div>
        );
      },
    },
    {
      title: 'Thanh toán',
      key: 'payment',
      width: 140,
      render: (_: unknown, r: Order) => (
        <Space direction="vertical" size={4}>
          <Tag color={r.payment_method === 'vnpay' ? 'blue' : r.payment_method === 'banking' ? 'geekblue' : 'orange'}
            style={{ borderRadius: 20, margin: 0, fontSize: 11 }}>
            {PAYMENT_METHOD_LABELS[r.payment_method ?? ''] ?? r.payment_method ?? '—'}
          </Tag>
          <StatusTag status={r.payment_status} config={PAYMENT_STATUS_CONFIG} />
        </Space>
      ),
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 145,
      align: 'right',
      render: (v: number) => <Text strong style={{ color: '#0d6efd', fontSize: 14 }}>{formatVND(v)}</Text>,
      sorter: (a: Order, b: Order) => a.total_amount - b.total_amount,
    },
    {
      title: 'Trạng thái đơn',
      dataIndex: 'status',
      key: 'status',
      width: 170,
      render: (v: string, r: Order) => (
        <Tooltip title="Nhấn để cập nhật trạng thái">
          <div
            style={{ cursor: 'pointer' }}
            onClick={() => openStatusModal(r)}
          >
            <StatusTag status={v} config={ORDER_STATUS_CONFIG} />
          </div>
        </Tooltip>
      ),
    },
    {
      title: 'Ngày đặt',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 115,
      render: (v: string) => (
        <Text type="secondary" style={{ fontSize: 13 }}>{v ?? '—'}</Text>
      ),
    },
    {
      title: '',
      key: 'action',
      width: 90,
      align: 'center',
      render: (_: unknown, r: Order) => (
        <Space>
          <Tooltip title="Xem chi tiết">
            <Button
              type="text"
              icon={<EyeOutlined style={{ color: '#0d6efd' }} />}
              onClick={() => openDetail(r)}
            />
          </Tooltip>
          <Tooltip title="Cập nhật thanh toán">
            <Button
              type="text"
              icon={<DollarOutlined style={{ color: '#198754' }} />}
              onClick={() => openPaymentModal(r)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  // ============================================================
  // Render
  // ============================================================
  return (
    <div style={{ padding: 24 }}>
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: '#1a1a2e' }}>
            <ShoppingCartOutlined style={{ marginRight: 10, color: '#0d6efd' }} />
            Quản lí Đơn hàng
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Tổng cộng {meta.total} đơn hàng
          </Text>
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => fetchOrders(1)}
          style={{ borderRadius: 10, height: 40 }}
        >
          Làm mới
        </Button>
      </div>

      {/* ── Summary Cards ── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 20 }}>
        {stats.map((s) => (
          <Col key={s.key} xs={12} sm={8} md={6} lg={3}>
            <Card
              style={{
                borderRadius: 12,
                border: '1px solid #f0f0f0',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: statusFilter === s.key
                  ? '0 4px 16px rgba(13,110,253,0.2)'
                  : '0 2px 8px rgba(0,0,0,0.05)',
                borderColor: statusFilter === s.key ? '#0d6efd' : '#f0f0f0',
              }}
              styles={{ body: { padding: '12px 8px' } }}
              onClick={() => setStatusFilter(statusFilter === s.key ? '' : s.key)}
            >
              <Badge color={s.color} text="" />
              <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>{s.count}</div>
              <div style={{ fontSize: 11, color: '#868e96', marginTop: 2, lineHeight: 1.3 }}>{s.label}</div>
            </Card>
          </Col>
        ))}
        <Col xs={12} sm={8} md={6} lg={3}>
          <Card
            style={{ borderRadius: 12, border: '1px solid #f0f0f0', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
            styles={{ body: { padding: '12px 8px' } }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, color: '#198754' }}>
              {(deliveredRevenue / 1_000_000).toFixed(1)}M
            </div>
            <div style={{ fontSize: 11, color: '#868e96', marginTop: 2 }}>Doanh thu (trang)</div>
          </Card>
        </Col>
      </Row>

      {/* ── Filters ── */}
      <Card
        style={{ borderRadius: 14, border: '1px solid #f0f0f0', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
        styles={{ body: { padding: '14px 20px' } }}
      >
        <Row gutter={[12, 12]} align="middle">
          <Col xs={24} sm={10} md={8}>
            <Input
              placeholder="Tìm mã đơn, tên KH, SĐT, email..."
              prefix={<SearchOutlined style={{ color: '#adb5bd' }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onPressEnter={() => fetchOrders(1)}
              style={{ borderRadius: 10, height: 38 }}
              allowClear
            />
          </Col>
          <Col xs={12} sm={7} md={4}>
            <Select
              placeholder="Trạng thái đơn"
              style={{ width: '100%' }}
              allowClear
              value={statusFilter || undefined}
              onChange={(v) => { setStatusFilter(v || ''); }}
              options={Object.entries(ORDER_STATUS_CONFIG).map(([k, cfg]) => ({
                value: k,
                label: <Tag color={cfg.color} style={{ margin: 0, borderRadius: 20 }}>{cfg.label}</Tag>,
              }))}
            />
          </Col>
          <Col xs={12} sm={7} md={4}>
            <Select
              placeholder="Thanh toán"
              style={{ width: '100%' }}
              allowClear
              value={paymentStatusFilter || undefined}
              onChange={(v) => { setPaymentStatusFilter(v || ''); }}
              options={Object.entries(PAYMENT_STATUS_CONFIG).map(([k, cfg]) => ({
                value: k,
                label: <Tag color={cfg.color} style={{ margin: 0, borderRadius: 20 }}>{cfg.label}</Tag>,
              }))}
            />
          </Col>
          <Col xs={12} sm={7} md={4}>
            <Select
              placeholder="Phương thức"
              style={{ width: '100%' }}
              allowClear
              value={paymentMethodFilter || undefined}
              onChange={(v) => { setPaymentMethodFilter(v || ''); }}
              options={[
                { value: 'cod',     label: 'COD' },
                { value: 'vnpay',   label: 'VNPay' },
                { value: 'banking', label: 'Chuyển khoản' },
              ]}
            />
          </Col>
          <Col xs={12} sm={10} md={6}>
            <RangePicker
              style={{ width: '100%', borderRadius: 10 }}
              format="YYYY-MM-DD"
              onChange={(_, ds) => setDateRange(ds[0] && ds[1] ? [ds[0], ds[1]] : null)}
            />
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<FilterOutlined />}
              onClick={() => fetchOrders(1)}
              style={{ borderRadius: 10, height: 38, background: 'linear-gradient(135deg,#0d6efd,#084298)', border: 'none' }}
            >
              Lọc
            </Button>
          </Col>
        </Row>
      </Card>

      {/* ── Table ── */}
      <Card
        style={{ borderRadius: 14, border: '1px solid #f0f0f0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
        styles={{ body: { padding: 0 } }}
      >
        <Table
          columns={columns}
          dataSource={orders}
          rowKey="id"
          loading={loading}
          scroll={{ x: 980 }}
          pagination={{
            total: meta.total,
            pageSize: meta.per_page,
            current: meta.current_page,
            showSizeChanger: false,
            showTotal: (t) => `Tổng ${t} đơn hàng`,
            onChange: (page) => fetchOrders(page),
          }}
        />
      </Card>

      {/* ── Order Detail Drawer ── */}
      <Drawer
        title={
          <Space>
            <ShoppingCartOutlined style={{ color: '#0d6efd' }} />
            <span>
              Chi tiết đơn hàng –{' '}
              <Text code>{detailOrder?.order_code}</Text>
            </span>
          </Space>
        }
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={680}
        extra={
          detailOrder && (
            <Space>
              <Button
                size="small"
                icon={<SendOutlined />}
                onClick={() => { setDrawerOpen(false); openStatusModal(detailOrder); }}
                style={{ borderRadius: 8 }}
              >
                Đổi trạng thái
              </Button>
              <Button
                size="small"
                icon={<DollarOutlined />}
                onClick={() => { setDrawerOpen(false); openPaymentModal(detailOrder); }}
                style={{ borderRadius: 8 }}
              >
                Đổi thanh toán
              </Button>
            </Space>
          )
        }
      >
        {detailLoading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
        ) : detailOrder ? (
          <div>
            {/* Status badges */}
            <Space style={{ marginBottom: 16 }} wrap>
              <StatusTag status={detailOrder.status} config={ORDER_STATUS_CONFIG} />
              <StatusTag status={detailOrder.payment_status} config={PAYMENT_STATUS_CONFIG} />
              {detailOrder.payment_method && (
                <Tag color="blue" style={{ borderRadius: 20, margin: 0 }}>
                  {PAYMENT_METHOD_LABELS[detailOrder.payment_method] ?? detailOrder.payment_method}
                </Tag>
              )}
            </Space>

            {/* Customer & Shipping */}
            <Descriptions column={2} size="small" bordered style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Khách hàng" span={2}>
                <Text strong>{detailOrder.shipping?.fullname ?? detailOrder.user?.fullname ?? '—'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Email">
                {detailOrder.user?.email ?? detailOrder.shipping?.email ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="SĐT">
                {detailOrder.shipping?.phone ?? detailOrder.user?.phone ?? '—'}
              </Descriptions.Item>
              <Descriptions.Item label="Địa chỉ giao" span={2}>
                {[
                  detailOrder.shipping?.address,
                  detailOrder.shipping?.ward,
                  detailOrder.shipping?.district,
                  detailOrder.shipping?.province,
                ].filter(Boolean).join(', ') || '—'}
              </Descriptions.Item>
              {detailOrder.note && (
                <Descriptions.Item label="Ghi chú KH" span={2}>{detailOrder.note}</Descriptions.Item>
              )}
              {detailOrder.admin_note && (
                <Descriptions.Item label="Ghi chú admin" span={2}>
                  <Text type="warning">{detailOrder.admin_note}</Text>
                </Descriptions.Item>
              )}
              {detailOrder.tracking_code && (
                <Descriptions.Item label="Mã vận đơn">{detailOrder.tracking_code}</Descriptions.Item>
              )}
              {detailOrder.shipping_partner && (
                <Descriptions.Item label="Đơn vị giao">{detailOrder.shipping_partner}</Descriptions.Item>
              )}
              {detailOrder.cancelled_reason && (
                <Descriptions.Item label="Lý do hủy" span={2}>
                  <Text type="danger">{detailOrder.cancelled_reason}</Text>
                </Descriptions.Item>
              )}
            </Descriptions>

            {/* Items */}
            {detailOrder.items && detailOrder.items.length > 0 && (
              <>
                <Divider orientation="left" style={{ fontSize: 13, color: '#495057', margin: '12px 0' }}>
                  <GiftOutlined style={{ marginRight: 6 }} />Sản phẩm ({detailOrder.items.length})
                </Divider>
                <div style={{ marginBottom: 16 }}>
                  {detailOrder.items.map((item, i) => (
                    <div
                      key={item.id ?? i}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 0',
                        borderBottom: i < detailOrder.items!.length - 1 ? '1px solid #f0f0f0' : 'none',
                      }}
                    >
                      {item.product_image ? (
                        <Image
                          src={item.product_image}
                          width={54} height={54}
                          style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid #f0f0f0' }}
                          fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="
                        />
                      ) : (
                        <div style={{ width: 54, height: 54, borderRadius: 8, background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #f0f0f0' }}>
                          <ShoppingCartOutlined style={{ color: '#adb5bd', fontSize: 20 }} />
                        </div>
                      )}
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14 }}>{item.product_name}</div>
                        {item.product_sku && (
                          <Text type="secondary" style={{ fontSize: 12 }}>SKU: {item.product_sku}</Text>
                        )}
                        {item.variant_info && (() => {
                          const info = item.variant_info as any;
                          // Format mới: { sku, image, attrs: [{name, value}] }
                          if (Array.isArray(info.attrs)) {
                            return info.attrs.length > 0 ? (
                              <div style={{ marginTop: 2 }}>
                                {info.attrs.map((a: { name: string; value: string }, idx: number) => (
                                  <Tag key={idx} style={{ fontSize: 11, borderRadius: 12, margin: '0 4px 0 0' }}>
                                    {a.name}: {a.value}
                                  </Tag>
                                ))}
                              </div>
                            ) : null;
                          }
                          // Format cũ: Record<string, string> phẳng
                          const entries = Object.entries(info).filter(([, v]) => typeof v === 'string');
                          return entries.length > 0 ? (
                            <div style={{ marginTop: 2 }}>
                              {entries.map(([k, v]) => (
                                <Tag key={k} style={{ fontSize: 11, borderRadius: 12, margin: '0 4px 0 0' }}>
                                  {k}: {v as string}
                                </Tag>
                              ))}
                            </div>
                          ) : null;
                        })()}
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ color: '#6c757d', fontSize: 12 }}>
                          {formatVND(item.price)} × {item.quantity}
                        </div>
                        <Text strong style={{ color: '#0d6efd' }}>{formatVND(item.total)}</Text>
                      </div>
                    </div>
                  ))}

                  {/* Totals */}
                  <div style={{ background: '#f8f9fa', borderRadius: 10, padding: '12px 16px', marginTop: 12 }}>
                    {detailOrder.discount_amount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text type="secondary">Giảm giá</Text>
                        <Text type="success">– {formatVND(detailOrder.discount_amount)}</Text>
                      </div>
                    )}
                    {detailOrder.voucher_code && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text type="secondary">Voucher ({detailOrder.voucher_code})</Text>
                        <Text type="success">– {formatVND(detailOrder.voucher_discount ?? 0)}</Text>
                      </div>
                    )}
                    {detailOrder.shipping_fee > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <Text type="secondary">Phí giao hàng</Text>
                        <Text>{formatVND(detailOrder.shipping_fee)}</Text>
                      </div>
                    )}
                    <Divider style={{ margin: '8px 0' }} />
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text strong style={{ fontSize: 15 }}>Tổng cộng</Text>
                      <Text strong style={{ fontSize: 15, color: '#0d6efd' }}>{formatVND(detailOrder.total_amount)}</Text>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Status History */}
            {detailOrder.status_history && detailOrder.status_history.length > 0 && (
              <>
                <Divider orientation="left" style={{ fontSize: 13, color: '#495057', margin: '12px 0' }}>
                  <HistoryOutlined style={{ marginRight: 6 }} />Lịch sử trạng thái
                </Divider>
                <Timeline
                  items={detailOrder.status_history.map((h) => ({
                    color: ORDER_STATUS_CONFIG[h.to]?.color ?? 'gray',
                    children: (
                      <div>
                        <Space wrap>
                          <Tag color={ORDER_STATUS_CONFIG[h.from]?.color} style={{ borderRadius: 20, margin: 0, fontSize: 11 }}>
                            {ORDER_STATUS_CONFIG[h.from]?.label ?? h.from}
                          </Tag>
                          <span style={{ color: '#adb5bd' }}>→</span>
                          <Tag color={ORDER_STATUS_CONFIG[h.to]?.color} style={{ borderRadius: 20, margin: 0, fontSize: 11 }}>
                            {ORDER_STATUS_CONFIG[h.to]?.label ?? h.to}
                          </Tag>
                        </Space>
                        {h.note && <div style={{ color: '#6c757d', fontSize: 12, marginTop: 4 }}>{h.note}</div>}
                        <div style={{ color: '#adb5bd', fontSize: 11, marginTop: 2 }}>{h.created_at}</div>
                      </div>
                    ),
                  }))}
                />
              </>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: 60, color: '#adb5bd' }}>Không có dữ liệu</div>
        )}
      </Drawer>

      {/* ── Update Status Modal ── */}
      <Modal
        title={
          <Space>
            <SendOutlined style={{ color: '#0d6efd' }} />
            <span>Cập nhật trạng thái – <Text code>{updatingOrder?.order_code}</Text></span>
          </Space>
        }
        open={statusModalOpen}
        onOk={handleStatusSave}
        onCancel={() => setStatusModalOpen(false)}
        okText="Lưu thay đổi"
        cancelText="Hủy"
        confirmLoading={savingStatus}
        okButtonProps={{ style: { background: 'linear-gradient(135deg,#0d6efd,#084298)', border: 'none', borderRadius: 8 } }}
        cancelButtonProps={{ style: { borderRadius: 8 } }}
        width={480}
        style={{ top: 60 }}
      >
        <Form form={statusForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="status" label="Trạng thái đơn hàng" rules={[{ required: true, message: 'Chọn trạng thái' }]}>
            <Select
              options={Object.entries(ORDER_STATUS_CONFIG).map(([k, cfg]) => ({
                value: k,
                label: (
                  <Tag color={cfg.color} icon={cfg.icon} style={{ borderRadius: 20, margin: 0 }}>
                    {cfg.label}
                  </Tag>
                ),
              }))}
              style={{ borderRadius: 8 }}
            />
          </Form.Item>

          {/* Conditional fields */}
          <Form.Item shouldUpdate={(prev, cur) => prev.status !== cur.status} noStyle>
            {({ getFieldValue }) => {
              const st = getFieldValue('status');
              return (
                <>
                  {st === 'cancelled' && (
                    <Form.Item
                      name="cancelled_reason"
                      label="Lý do hủy"
                      rules={[{ required: true, message: 'Nhập lý do hủy đơn' }]}
                    >
                      <Input.TextArea rows={3} placeholder="Nhập lý do hủy đơn..." style={{ borderRadius: 8 }} />
                    </Form.Item>
                  )}
                  {st === 'shipping' && (
                    <Row gutter={12}>
                      <Col span={12}>
                        <Form.Item name="tracking_code" label="Mã vận đơn">
                          <Input placeholder="VD: GHN12345678" style={{ borderRadius: 8 }} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item name="shipping_partner" label="Đơn vị giao hàng">
                          <Input placeholder="VD: GHN, GHTK, Viettel Post" style={{ borderRadius: 8 }} />
                        </Form.Item>
                      </Col>
                    </Row>
                  )}
                </>
              );
            }}
          </Form.Item>

          <Form.Item name="note" label="Ghi chú nội bộ (tuỳ chọn)">
            <Input.TextArea rows={2} placeholder="Ghi chú cho admin..." style={{ borderRadius: 8 }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Update Payment Status Modal ── */}
      <Modal
        title={
          <Space>
            <DollarOutlined style={{ color: '#198754' }} />
            <span>Cập nhật thanh toán – <Text code>{updatingOrder?.order_code}</Text></span>
          </Space>
        }
        open={paymentModalOpen}
        onOk={handlePaymentSave}
        onCancel={() => setPaymentModalOpen(false)}
        okText="Lưu thay đổi"
        cancelText="Hủy"
        confirmLoading={savingPayment}
        okButtonProps={{ style: { background: 'linear-gradient(135deg,#198754,#0f5132)', border: 'none', borderRadius: 8 } }}
        cancelButtonProps={{ style: { borderRadius: 8 } }}
        width={420}
        style={{ top: 60 }}
      >
        <Form form={paymentForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="payment_status" label="Trạng thái thanh toán" rules={[{ required: true, message: 'Chọn trạng thái' }]}>
            <Select
              options={Object.entries(PAYMENT_STATUS_CONFIG).map(([k, cfg]) => ({
                value: k,
                label: <Tag color={cfg.color} style={{ borderRadius: 20, margin: 0 }}>{cfg.label}</Tag>,
              }))}
              style={{ borderRadius: 8 }}
            />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú (tuỳ chọn)">
            <Input.TextArea rows={2} placeholder="Ghi chú..." style={{ borderRadius: 8 }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminOrderPage;

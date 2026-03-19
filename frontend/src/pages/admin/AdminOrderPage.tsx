import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table, Button, Space, Tag, Typography, message, Card,
  Row, Col, Select, Input, Badge, Tooltip, DatePicker, Modal,
  Form, Statistic,
} from 'antd';
import {
  SearchOutlined, ShoppingCartOutlined, EyeOutlined, ReloadOutlined,
  CheckCircleOutlined, ClockCircleOutlined, CarOutlined, CloseCircleOutlined,
  DollarOutlined, FilterOutlined, SyncOutlined, RollbackOutlined,
  SendOutlined, RiseOutlined, ShoppingOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { axiosInstance } from '../../api/axios';

const { Title, Text } = Typography;
const { RangePicker } = DatePicker;

// ============================================================
// Types
// ============================================================
interface Order {
  id: number;
  order_code: string;
  user?: { id: number; fullname?: string; email?: string; phone?: string };
  shipping: { fullname?: string; phone?: string; email?: string };
  subtotal: number;
  discount_amount: number;
  shipping_fee: number;
  total_amount: number;
  status: string;
  payment_status: string;
  payment_method?: string;
  voucher_code?: string;
  note?: string;
  cancelled_reason?: string;
  tracking_code?: string;
  created_at: string;
  product_return?: {
    id?: number;
    status?: string;
    reason?: string | null;
    reason_for_refusal?: string | null;
    refund_amount?: number | null;
    transaction_code?: string | null;
    items?: number[] | null;
    created_at?: string;
  };
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
  pending: { color: 'orange', label: 'Chờ xác nhận', icon: <ClockCircleOutlined /> },
  confirmed: { color: 'blue', label: 'Đã xác nhận', icon: <CheckCircleOutlined /> },
  processing: { color: 'purple', label: 'Đang đóng gói', icon: <SyncOutlined spin /> },
  shipping: { color: 'geekblue', label: 'Đang vận chuyển', icon: <CarOutlined /> },
  delivered: { color: 'cyan', label: 'Đã giao hàng', icon: <CheckCircleOutlined /> },
  completed: { color: 'success', label: 'Đã nhận hàng', icon: <CheckCircleOutlined /> },
  cancelled: { color: 'error', label: 'Đã hủy', icon: <CloseCircleOutlined /> },
  returned: { color: 'default', label: 'Hoàn trả', icon: <RollbackOutlined /> },
};

const PAYMENT_STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  unpaid: { color: 'orange', label: 'Chưa thanh toán' },
  paid: { color: 'success', label: 'Đã thanh toán' },
  refunded: { color: 'default', label: 'Đã hoàn tiền' },
  partial_refund: { color: 'default', label: 'Hoàn một phần' },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: 'COD',
  vnpay: 'VNPay',
  banking: 'Chuyển khoản',
};

// Luồng Shopee-like: admin chỉ lên đến shipping, delivered admin xác nhận giao xong
// completed do khách hàng tự bấm "Đã nhận hàng"
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipping', 'cancelled'],
  shipping: ['delivered'],     // Admin cập nhật khi đơn vị VT giao xong
  delivered: [],
  completed: [],
  cancelled: [],
  returned: [],
};

const formatVND = (v: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

const API_BASE = '/admin/orders';

const StatusTag: React.FC<{
  status: string;
  config: Record<string, { color: string; label: string; icon?: React.ReactNode }>;
}> = ({ status, config }) => {
  const cfg = config[status] ?? { color: 'default', label: status };
  return (
    <Tag color={cfg.color} icon={cfg.icon} style={{ borderRadius: 20, margin: 0, fontWeight: 600 }}>
      {cfg.label}
    </Tag>
  );
};

// ============================================================
// Main Component
// ============================================================
const AdminOrderPage: React.FC = () => {
  const navigate = useNavigate();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [meta, setMeta] = useState<PaginationMeta>({ total: 0, per_page: 15, current_page: 1, last_page: 1 });

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [dateRange, setDateRange] = useState<[string, string] | null>(null);

  // Quick status update modal (inline trên list page)
  const [quickStatusOrder, setQuickStatusOrder] = useState<Order | null>(null);
  const [quickStatusModalOpen, setQuickStatusModalOpen] = useState(false);
  const [statusForm] = Form.useForm();
  const [savingStatus, setSavingStatus] = useState(false);

  // Quick payment status modal
  const [quickPaymentOrder, setQuickPaymentOrder] = useState<Order | null>(null);
  const [quickPaymentModalOpen, setQuickPaymentModalOpen] = useState(false);
  const [paymentForm] = Form.useForm();
  const [savingPayment, setSavingPayment] = useState(false);

  // --------------------------------------------------------
  // Fetch orders list
  // --------------------------------------------------------
  const fetchOrders = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params: Record<string, string | number> = { per_page: 15, page };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      if (paymentStatusFilter) params.payment_status = paymentStatusFilter;
      if (paymentMethodFilter) params.payment_method = paymentMethodFilter;
      if (dateRange) {
        params.date_from = dateRange[0];
        params.date_to = dateRange[1];
      }

      const res = await axiosInstance.get(API_BASE, { params });
      const payload = res.data;
      const list: Order[] = payload?.data?.data ?? payload?.data ?? [];
      const m = payload?.data?.meta ?? payload?.meta ?? {};
      setOrders(list);
      setMeta({
        total: m.total ?? list.length,
        per_page: m.per_page ?? 15,
        current_page: m.current_page ?? page,
        last_page: m.last_page ?? 1,
      });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message ?? 'Không thể tải danh sách đơn hàng');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, paymentStatusFilter, paymentMethodFilter, dateRange]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  // --------------------------------------------------------
  // Quick Status update
  // --------------------------------------------------------
  const openQuickStatus = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
    setQuickStatusOrder(order);
    statusForm.resetFields();
    statusForm.setFieldsValue({ status: order.status });
    setQuickStatusModalOpen(true);
  };

  const handleQuickStatusSave = async () => {
    if (!quickStatusOrder) return;
    try {
      const values = await statusForm.validateFields();
      setSavingStatus(true);
      await axiosInstance.patch(`${API_BASE}/${quickStatusOrder.id}/status`, values);
      message.success('Đã cập nhật trạng thái đơn hàng!');
      setQuickStatusModalOpen(false);
      fetchOrders(meta.current_page);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; errors?: { status?: string[] } } } };
      const msg = error?.response?.data?.message ?? error?.response?.data?.errors?.status?.[0] ?? 'Có lỗi xảy ra';
      message.error(msg);
    } finally {
      setSavingStatus(false);
    }
  };

  // --------------------------------------------------------
  // Quick Payment status update
  // --------------------------------------------------------
  const openQuickPayment = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();

    if (order.status === 'returned' && order.product_return?.status !== 'approved') {
      message.error('Chỉ có thể cập nhật hoàn tiền sau khi đã duyệt yêu cầu hoàn trả.');
      return;
    }

    setQuickPaymentOrder(order);
    paymentForm.resetFields();
    const initialPaymentStatus =
      order.status === 'returned'
        ? (['refunded', 'partial_refund'].includes(order.payment_status) ? order.payment_status : 'refunded')
        : order.payment_status;

    paymentForm.setFieldsValue({ payment_status: initialPaymentStatus });
    setQuickPaymentModalOpen(true);
  };

  const handleQuickPaymentSave = async () => {
    if (!quickPaymentOrder) return;
    try {
      const values = await paymentForm.validateFields();
      setSavingPayment(true);
      await axiosInstance.patch(`${API_BASE}/${quickPaymentOrder.id}/payment-status`, values);
      message.success('Đã cập nhật trạng thái thanh toán!');
      setQuickPaymentModalOpen(false);
      fetchOrders(meta.current_page);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message ?? 'Có lỗi xảy ra');
    } finally {
      setSavingPayment(false);
    }
  };

  // --------------------------------------------------------
  // Stats
  // --------------------------------------------------------
  const totalRevenue = orders
    .filter((o) => o.status === 'delivered' || o.status === 'completed')
    .reduce((s, o) => s + o.total_amount, 0);

  const pendingCount = orders.filter(o => o.status === 'pending').length;
  const shippingCount = orders.filter(o => o.status === 'shipping').length;

  // --------------------------------------------------------
  // Table columns
  // --------------------------------------------------------
  const columns: ColumnsType<Order> = [
    {
      title: 'Mã đơn hàng',
      dataIndex: 'order_code',
      key: 'order_code',
      width: 155,
      render: (v: string) => <Text code style={{ fontSize: 12, fontWeight: 700 }}>{v}</Text>,
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
      width: 145,
      render: (_: unknown, r: Order) => (
        <Space direction="vertical" size={4}>
          <Tag
            color={r.payment_method === 'vnpay' ? 'blue' : r.payment_method === 'banking' ? 'geekblue' : 'orange'}
            style={{ borderRadius: 20, margin: 0, fontSize: 11 }}
          >
            {PAYMENT_METHOD_LABELS[r.payment_method ?? ''] ?? r.payment_method ?? '—'}
          </Tag>
          <Tooltip title="Nhấn để cập nhật thanh toán">
            <div style={{ cursor: 'pointer' }} onClick={(e) => openQuickPayment(r, e)}>
              <StatusTag status={r.payment_status} config={PAYMENT_STATUS_CONFIG} />
            </div>
          </Tooltip>
        </Space>
      ),
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'total_amount',
      key: 'total_amount',
      width: 140,
      align: 'right',
      render: (v: number) => <Text strong style={{ color: '#0d6efd', fontSize: 14 }}>{formatVND(v)}</Text>,
      sorter: (a: Order, b: Order) => a.total_amount - b.total_amount,
    },
    {
      title: 'Trạng thái đơn',
      dataIndex: 'status',
      key: 'status',
      width: 165,
      render: (v: string, r: Order) => {
        const validNext = VALID_TRANSITIONS[r.status] ?? [];
        return (
          <Tooltip title={validNext.length > 0 ? 'Nhấn để cập nhật trạng thái' : 'Trạng thái cuối'}>
            <div
              style={{ cursor: validNext.length > 0 ? 'pointer' : 'default' }}
              onClick={(e) => validNext.length > 0 && openQuickStatus(r, e)}
            >
              <StatusTag status={v} config={ORDER_STATUS_CONFIG} />
            </div>
          </Tooltip>
        );
      },
    },
    {
      title: 'Ngày đặt',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 115,
      render: (v: string) => <Text type="secondary" style={{ fontSize: 12 }}>{v ?? '—'}</Text>,
    },
    {
      title: '',
      key: 'action',
      width: 100,
      align: 'center',
      render: (_: unknown, r: Order) => (
        <Space>
          <Tooltip title="Xem chi tiết đơn hàng">
            <Button
              type="primary"
              size="small"
              icon={<EyeOutlined />}
              onClick={(e) => { e.stopPropagation(); navigate(`/admin/orders/${r.id}`); }}
              style={{ borderRadius: 8, background: 'linear-gradient(135deg,#0d6efd,#084298)', border: 'none' }}
            />
          </Tooltip>
          <Tooltip title="Cập nhật thanh toán">
            <Button
              size="small"
              icon={<DollarOutlined style={{ color: '#198754' }} />}
              onClick={(e) => openQuickPayment(r, e)}
              style={{ borderRadius: 8, borderColor: '#198754' }}
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

      {/* ── Quick Stats ── */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {Object.entries(ORDER_STATUS_CONFIG).map(([key, cfg]) => {
          const count = orders.filter(o => o.status === key).length;
          return (
            <Col key={key} xs={12} sm={8} md={6} lg={3}>
              <Card
                style={{
                  borderRadius: 12,
                  border: '1px solid #f0f0f0',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: statusFilter === key
                    ? '0 4px 16px rgba(13,110,253,0.2)'
                    : '0 2px 8px rgba(0,0,0,0.05)',
                  borderColor: statusFilter === key ? '#0d6efd' : '#f0f0f0',
                  transform: statusFilter === key ? 'translateY(-2px)' : 'none',
                }}
                styles={{ body: { padding: '12px 8px' } }}
                onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
              >
                <Badge color={cfg.color} text="" />
                <div style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e' }}>{count}</div>
                <div style={{ fontSize: 10, color: '#868e96', marginTop: 2, lineHeight: 1.3 }}>{cfg.label}</div>
              </Card>
            </Col>
          );
        })}
        <Col xs={12} sm={8} md={6} lg={3}>
          <Card
            style={{ borderRadius: 12, border: '1px solid #f0f0f0', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
            styles={{ body: { padding: '12px 8px' } }}
          >
            <Statistic
              value={totalRevenue / 1_000_000}
              precision={1}
              suffix="M"
              valueStyle={{ fontSize: 16, fontWeight: 800, color: '#198754' }}
            />
            <div style={{ fontSize: 10, color: '#868e96', marginTop: 2 }}>Doanh thu trang</div>
          </Card>
        </Col>
      </Row>

      {/* ── Alert badges ── */}
      {(pendingCount > 0 || shippingCount > 0) && (
        <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
          {pendingCount > 0 && (
            <Col>
              <div style={{
                background: '#fff8e6', border: '1px solid #ffd666', borderRadius: 10,
                padding: '8px 14px', fontSize: 13, color: '#b45309',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <ClockCircleOutlined />
                <strong>{pendingCount}</strong> đơn đang chờ xác nhận
                <Button
                  type="link"
                  size="small"
                  style={{ padding: 0, color: '#b45309', fontWeight: 600, fontSize: 12 }}
                  onClick={() => setStatusFilter('pending')}
                >
                  Xem ngay →
                </Button>
              </div>
            </Col>
          )}
          {shippingCount > 0 && (
            <Col>
              <div style={{
                background: '#e6f4ff', border: '1px solid #91caff', borderRadius: 10,
                padding: '8px 14px', fontSize: 13, color: '#0369a1',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                <CarOutlined />
                <strong>{shippingCount}</strong> đơn đang giao
              </div>
            </Col>
          )}
        </Row>
      )}

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
              onChange={(v) => setStatusFilter(v || '')}
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
              onChange={(v) => setPaymentStatusFilter(v || '')}
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
              onChange={(v) => setPaymentMethodFilter(v || '')}
              options={[
                { value: 'cod', label: 'COD' },
                { value: 'vnpay', label: 'VNPay' },
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
          {(search || statusFilter || paymentStatusFilter || paymentMethodFilter || dateRange) && (
            <Col>
              <Button
                onClick={() => {
                  setSearch(''); setStatusFilter(''); setPaymentStatusFilter('');
                  setPaymentMethodFilter(''); setDateRange(null);
                }}
                style={{ borderRadius: 10, height: 38 }}
              >
                Xóa bộ lọc
              </Button>
            </Col>
          )}
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
          onRow={(record) => ({
            onClick: () => navigate(`/admin/orders/${record.id}`),
            style: { cursor: 'pointer' },
          })}
          rowHoverable
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

      {/* ── Quick Status Modal ── */}
      <Modal
        title={
          <Space>
            <SendOutlined style={{ color: '#0d6efd' }} />
            <span>Cập nhật trạng thái – <Text code>{quickStatusOrder?.order_code}</Text></span>
          </Space>
        }
        open={quickStatusModalOpen}
        onOk={handleQuickStatusSave}
        onCancel={() => setQuickStatusModalOpen(false)}
        okText="Lưu thay đổi"
        cancelText="Hủy"
        confirmLoading={savingStatus}
        okButtonProps={{ style: { background: 'linear-gradient(135deg,#0d6efd,#084298)', border: 'none', borderRadius: 8 } }}
        cancelButtonProps={{ style: { borderRadius: 8 } }}
        width={500}
        style={{ top: 80 }}
      >
        {quickStatusOrder && (
          <>
            <div style={{ background: '#f8f9fa', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#495057' }}>
              <strong>Trạng thái hiện tại:</strong>{' '}
              <StatusTag status={quickStatusOrder.status} config={ORDER_STATUS_CONFIG} />
              {VALID_TRANSITIONS[quickStatusOrder.status]?.length > 0 && (
                <div style={{ marginTop: 6, color: '#6c757d' }}>
                  → Có thể chuyển sang:{' '}
                  {VALID_TRANSITIONS[quickStatusOrder.status].map(s => ORDER_STATUS_CONFIG[s]?.label ?? s).join(', ')}
                </div>
              )}
            </div>

            <Form form={statusForm} layout="vertical">
              <Form.Item
                name="status"
                label="Trạng thái mới"
                rules={[{ required: true, message: 'Chọn trạng thái' }]}
              >
                <Select
                  options={Object.entries(ORDER_STATUS_CONFIG)
                    .filter(([k]) => VALID_TRANSITIONS[quickStatusOrder.status]?.includes(k))
                    .map(([k, cfg]) => ({
                      value: k,
                      label: (
                        <Tag color={cfg.color} icon={cfg.icon} style={{ borderRadius: 20, margin: 0 }}>
                          {cfg.label}
                        </Tag>
                      ),
                    }))}
                  placeholder="Chọn trạng thái mới"
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>

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
                              <Select
                                placeholder="Chọn đơn vị"
                                style={{ borderRadius: 8 }}
                                options={[
                                  { value: 'GHN', label: 'Giao Hàng Nhanh (GHN)' },
                                  { value: 'GHTK', label: 'Giao Hàng Tiết Kiệm (GHTK)' },
                                  { value: 'VTP', label: 'Viettel Post' },
                                  { value: 'VNPost', label: 'Vietnam Post' },
                                  { value: 'JTExpress', label: 'J&T Express' },
                                ]}
                                allowClear
                              />
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

            <div style={{ textAlign: 'right', marginTop: -8 }}>
              <Button
                type="link"
                icon={<RiseOutlined />}
                onClick={() => { setQuickStatusModalOpen(false); navigate(`/admin/orders/${quickStatusOrder.id}`); }}
                style={{ color: '#0d6efd', padding: 0, fontSize: 12 }}
              >
                Xem toàn bộ chi tiết đơn hàng →
              </Button>
            </div>
          </>
        )}
      </Modal>

      {/* ── Quick Payment Modal ── */}
      <Modal
        title={
          <Space>
            <DollarOutlined style={{ color: '#198754' }} />
            <span>Cập nhật thanh toán – <Text code>{quickPaymentOrder?.order_code}</Text></span>
          </Space>
        }
        open={quickPaymentModalOpen}
        onOk={handleQuickPaymentSave}
        onCancel={() => setQuickPaymentModalOpen(false)}
        okText="Lưu thay đổi"
        cancelText="Hủy"
        confirmLoading={savingPayment}
        okButtonProps={{ style: { background: 'linear-gradient(135deg,#198754,#0f5132)', border: 'none', borderRadius: 8 } }}
        cancelButtonProps={{ style: { borderRadius: 8 } }}
        width={420}
        style={{ top: 80 }}
      >
        <Form form={paymentForm} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item
            name="payment_status"
            label="Trạng thái thanh toán"
            rules={[{ required: true, message: 'Chọn trạng thái' }]}
          >
            <Select
              options={Object.entries(PAYMENT_STATUS_CONFIG)
                .filter(([k]) => {
                  if (quickPaymentOrder?.status === 'returned') return ['refunded', 'partial_refund'].includes(k);
                  return ['unpaid', 'paid'].includes(k);
                })
                .map(([k, cfg]) => ({
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

      {/* ── Info tip ── */}
      <div style={{ marginTop: 12, fontSize: 12, color: '#adb5bd', textAlign: 'center' }}>
        <ShoppingOutlined style={{ marginRight: 4 }} />
        Nhấn vào hàng để xem chi tiết đơn hàng đầy đủ
      </div>
    </div>
  );
};

export default AdminOrderPage;

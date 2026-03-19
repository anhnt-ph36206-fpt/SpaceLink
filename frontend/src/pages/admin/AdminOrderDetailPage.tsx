import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Button, Tag, Space, Typography, message, Card, Row, Col,
  Select, Descriptions, Tooltip, Form, Divider, Timeline,
  Spin, Image, Modal, Input, Badge, Steps,
} from 'antd';
import {
  ArrowLeftOutlined, ShoppingCartOutlined, CheckCircleOutlined,
  ClockCircleOutlined, CarOutlined, CloseCircleOutlined,
  DollarOutlined, HistoryOutlined, SendOutlined, SyncOutlined,
  GiftOutlined, RollbackOutlined, UserOutlined, PhoneOutlined,
  EnvironmentOutlined, CalendarOutlined, CopyOutlined,
  PrinterOutlined, EditOutlined, ReloadOutlined, InboxOutlined,
  WarningOutlined,
} from '@ant-design/icons';
import { axiosInstance } from '../../api/axios';

const { Title, Text } = Typography;

// ── Types ────────────────────────────────────────────────────
interface VariantAttr { name: string; value: string }
interface VariantInfo {
  sku?: string;
  image?: string;
  attrs?: VariantAttr[];
  [key: string]: unknown;
}
interface OrderItem {
  id: number;
  product_id: number;
  variant_id?: number;
  product_name: string;
  product_image?: string;
  product_sku?: string;
  variant_info?: VariantInfo | null;
  price: number;
  quantity: number;
  total: number;
}
interface StatusHistory {
  from: string; to: string;
  note?: string; changed_by?: number; created_at: string;
}
interface Order {
  id: number;
  order_code: string;
  user?: { id: number; fullname?: string; email?: string; phone?: string };
  shipping: { fullname?: string; phone?: string; email?: string; province?: string; district?: string; ward?: string; address?: string };
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
  product_return?: {
    id?: number;
    status?: string;
    reason?: string | null;
    reason_for_refusal?: string | null;
    refund_amount?: number | null;
    transaction_code?: string | null;
    items?: number[] | null;
    evidences?: Array<{
      id?: number;
      file_url?: string | null;
      file_type?: string | null;
      created_at?: string;
    }> | null;
    created_at?: string;
  };
}

// ── Status Config (orange primary, Shopee-like) ──────────────
const ORDER_STATUS_CONFIG: Record<string, { color: string; label: string; icon: React.ReactNode; step: number; adminNote?: string }> = {
  pending: { color: 'orange', label: 'Chờ xác nhận', icon: <ClockCircleOutlined />, step: 0 },
  confirmed: { color: 'blue', label: 'Đã xác nhận', icon: <CheckCircleOutlined />, step: 1 },
  processing: { color: 'purple', label: 'Đang đóng gói', icon: <SyncOutlined spin />, step: 2 },
  shipping: {
    color: 'geekblue', label: 'Đang vận chuyển', icon: <CarOutlined />, step: 3,
    adminNote: 'Hàng đã được giao cho đơn vị vận chuyển'
  },
  delivered: {
    color: 'cyan', label: 'Đã giao hàng', icon: <InboxOutlined />, step: 4,
    adminNote: 'Đơn vị VT xác nhận giao thành công. Khách sẽ bấm "Đã nhận hàng"'
  },
  completed: {
    color: 'success', label: 'Đã nhận hàng', icon: <CheckCircleOutlined />, step: 5,
    adminNote: 'Khách hàng đã xác nhận nhận hàng'
  },
  cancelled: { color: 'error', label: 'Đã hủy', icon: <CloseCircleOutlined />, step: -1 },
  returned: { color: 'default', label: 'Hoàn trả', icon: <RollbackOutlined />, step: -1 },
};

const PAYMENT_STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  unpaid: { color: 'orange', label: 'Chưa thanh toán' },
  paid: { color: 'success', label: 'Đã thanh toán' },
  refunded: { color: 'default', label: 'Đã hoàn tiền' },
  partial_refund: { color: 'default', label: 'Hoàn một phần' },
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: 'COD (Tiền mặt)',
  vnpay: 'VNPay',
  banking: 'Chuyển khoản',
};

const PRODUCT_RETURN_STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  pending: { color: '#b45309', label: 'Đang chờ duyệt' },
  approved: { color: '#0369a1', label: 'Đã duyệt hoàn trả' },
  rejected: { color: '#b91c1c', label: 'Từ chối hoàn trả' },
  refunded: { color: '#64748b', label: 'Đã hoàn tiền' },
};

/**
 * ── Luồng Shopee-like ──────────────────────────────────────────
 * Admin điều khiển: pending → confirmed → processing → shipping
 * Delivery confirmation: admin cập nhật sau khi đơn vị VT báo giao xong → delivered
 * Customer confirms: khách bấm "Đã nhận hàng" → completed  
 * Không cho admin set 'completed' trực tiếp (để khách chủ động)
 */
const VALID_TRANSITIONS: Record<string, string[]> = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipping', 'cancelled'],
  shipping: ['delivered'],     // Admin cập nhật khi đơn vị VT xác nhận giao xong
  delivered: [],
  completed: [],
  cancelled: [],
  returned: [],
};

const STATUS_TRANSITION_NOTES: Partial<Record<string, string>> = {
  confirmed: 'Shop đã xác nhận đơn hàng.',
  processing: 'Shop đang đóng gói hàng.',
  shipping: 'Hàng đã được giao cho đơn vị vận chuyển.',
  delivered: 'Đơn vị vận chuyển đã giao hàng thành công.',
  cancelled: '',
  returned: 'Đơn hàng được chấp nhận hoàn trả.',
};

const PROGRESS_STEPS = [
  { title: 'Đặt hàng', key: 'pending' },
  { title: 'Xác nhận', key: 'confirmed' },
  { title: 'Đóng gói', key: 'processing' },
  { title: 'Vận chuyển', key: 'shipping' },
  { title: 'Đã giao', key: 'delivered' },
  { title: 'Khách nhận', key: 'completed' },
];

const STEP_DATES: Record<string, keyof Order> = {
  pending: 'created_at',
  confirmed: 'confirmed_at',
  shipping: 'shipped_at',
  delivered: 'delivered_at',
  completed: 'completed_at',
};

const formatVND = (v: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

const API_BASE = '/admin/orders';
const ORANGE = '#ea580c';

// ── Variant helper ────────────────────────────────────────────
const parseVariantAttrs = (info: VariantInfo | null | undefined): VariantAttr[] => {
  if (!info || typeof info !== 'object') return [];
  if (Array.isArray(info.attrs)) return info.attrs.filter(a => a.name && a.value);
  const skip = ['sku', 'image', 'attrs'];
  return Object.entries(info)
    .filter(([k, v]) => !skip.includes(k) && typeof v === 'string' && v !== '')
    .map(([k, v]) => ({ name: k, value: v as string }));
};

// ── Status Tag ────────────────────────────────────────────────
const StatusTag: React.FC<{
  status: string;
  config: Record<string, { color: string; label: string; icon?: React.ReactNode }>;
}> = ({ status, config }) => {
  const cfg = config[status] ?? { color: 'default', label: status };
  return (
    <Tag
      color={cfg.color}
      icon={cfg.icon}
      style={{ borderRadius: 20, margin: 0, fontWeight: 600 }}
    >
      {cfg.label}
    </Tag>
  );
};

// ── Main Component ────────────────────────────────────────────
const AdminOrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);

  const [statusModalOpen, setStatusModalOpen] = useState(false);
  const [statusForm] = Form.useForm();
  const [savingStatus, setSavingStatus] = useState(false);

  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [paymentForm] = Form.useForm();
  const [savingPayment, setSavingPayment] = useState(false);

  const [returnApproveLoading, setReturnApproveLoading] = useState(false);
  const [returnRejectOpen, setReturnRejectOpen] = useState(false);
  const [returnRejectReason, setReturnRejectReason] = useState('');
  const [returnRejectLoading, setReturnRejectLoading] = useState(false);

  // ── Fetch ──────────────────────────────────────────────────
  const fetchOrder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await axiosInstance.get(`${API_BASE}/${id}`);
      setOrder(res.data?.data ?? res.data);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message ?? 'Không thể tải đơn hàng');
      navigate('/admin/orders');
    } finally {
      setLoading(false);
    }
  }, [id, navigate]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  // ── Update Status ──────────────────────────────────────────
  const openStatusModal = () => {
    if (!order) return;
    statusForm.resetFields();
    const nextStatuses = VALID_TRANSITIONS[order.status] ?? [];
    if (nextStatuses.length === 1) {
      statusForm.setFieldsValue({
        status: nextStatuses[0],
        note: STATUS_TRANSITION_NOTES[nextStatuses[0]] ?? '',
      });
    }
    setStatusModalOpen(true);
  };

  const handleStatusSave = async () => {
    if (!order) return;
    try {
      const values = await statusForm.validateFields();
      setSavingStatus(true);
      await axiosInstance.patch(`${API_BASE}/${order.id}/status`, values);
      message.success('Đã cập nhật trạng thái đơn hàng!');
      setStatusModalOpen(false);
      fetchOrder();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string; errors?: { status?: string[] } } } };
      const msg = error?.response?.data?.message ?? error?.response?.data?.errors?.status?.[0] ?? 'Có lỗi xảy ra';
      message.error(msg);
    } finally {
      setSavingStatus(false);
    }
  };

  // ── Update Payment ─────────────────────────────────────────
  const openPaymentModal = () => {
    if (!order) return;

    if (
      order.status === 'returned' &&
      order.product_return?.status !== 'approved'
    ) {
      message.error('Chỉ có thể cập nhật hoàn tiền sau khi đã duyệt yêu cầu hoàn trả.');
      return;
    }

    paymentForm.resetFields();
    const initialPaymentStatus =
      order.status === 'returned'
        ? (['refunded', 'partial_refund'].includes(order.payment_status) ? order.payment_status : 'refunded')
        : order.payment_status;

    paymentForm.setFieldsValue({ payment_status: initialPaymentStatus });
    setPaymentModalOpen(true);
  };

  const handlePaymentSave = async () => {
    if (!order) return;
    try {
      const values = await paymentForm.validateFields();
      setSavingPayment(true);
      await axiosInstance.patch(`${API_BASE}/${order.id}/payment-status`, values);
      message.success('Đã cập nhật trạng thái thanh toán!');
      setPaymentModalOpen(false);
      fetchOrder();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message ?? 'Có lỗi xảy ra');
    } finally {
      setSavingPayment(false);
    }
  };

  // ── Return Approval / Reject ─────────────────────────────
  const handleApproveReturn = async () => {
    if (!order) return;
    setReturnApproveLoading(true);
    try {
      await axiosInstance.post(`${API_BASE}/${order.id}/return/approve`, {
        admin_note: 'Chấp nhận yêu cầu hoàn trả.',
      });
      message.success('Đã duyệt hoàn trả!');
      fetchOrder();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message ?? 'Không thể duyệt hoàn trả');
    } finally {
      setReturnApproveLoading(false);
    }
  };

  const handleRejectReturn = async () => {
    if (!order) return;
    if (!returnRejectReason.trim()) {
      message.error('Vui lòng nhập lý do từ chối hoàn trả.');
      return;
    }

    setReturnRejectLoading(true);
    try {
      await axiosInstance.post(`${API_BASE}/${order.id}/return/reject`, {
        reason_for_refusal: returnRejectReason,
      });
      message.success('Đã từ chối hoàn trả.');
      setReturnRejectOpen(false);
      setReturnRejectReason('');
      fetchOrder();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      message.error(error?.response?.data?.message ?? 'Không thể từ chối hoàn trả');
    } finally {
      setReturnRejectLoading(false);
    }
  };

  const copy = (text: string) => { navigator.clipboard.writeText(text); message.success('Đã sao chép!'); };

  // ── Loading ─────────────────────────────────────────────────
  if (loading) return (
    <div style={{ textAlign: 'center', padding: '120px 0' }}>
      <Spin size="large" />
      <div style={{ marginTop: 16, color: '#8590a3' }}>Đang tải thông tin đơn hàng...</div>
    </div>
  );
  if (!order) return null;

  const statusCfg = ORDER_STATUS_CONFIG[order.status] ?? { color: 'default', label: order.status, step: 0 };
  const isCancelled = order.status === 'cancelled' || order.status === 'returned';
  const validNext = VALID_TRANSITIONS[order.status] ?? [];
  const currentStep = isCancelled ? -1 : statusCfg.step;

  const cardStyle = { borderRadius: 14, border: '1px solid #f0f0f0', marginBottom: 18, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' };
  const rowStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center' as const };

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, flexWrap: 'wrap', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/orders')} style={{ borderRadius: 10, height: 40 }}>
            Quay lại
          </Button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <Title level={4} style={{ margin: 0, color: '#1a1a2e' }}>
                <ShoppingCartOutlined style={{ marginRight: 8, color: ORANGE }} />
                Chi tiết đơn hàng
              </Title>
              <Text code style={{ fontSize: 14, fontWeight: 700 }}>{order.order_code}</Text>
              <Tooltip title="Sao chép mã đơn">
                <Button type="text" size="small" icon={<CopyOutlined style={{ color: ORANGE }} />} onClick={() => copy(order.order_code)} />
              </Tooltip>
            </div>
            <Text type="secondary" style={{ fontSize: 13 }}>
              <CalendarOutlined style={{ marginRight: 4 }} /> Đặt lúc: {order.created_at}
            </Text>
          </div>
        </div>

        <Space wrap>
          <Button icon={<ReloadOutlined />} onClick={fetchOrder} style={{ borderRadius: 10, height: 40 }}>Làm mới</Button>
          <Button icon={<PrinterOutlined />} onClick={() => window.print()} style={{ borderRadius: 10, height: 40 }}>In đơn</Button>
          {validNext.length > 0 && (
            <Button
              type="primary" icon={<SendOutlined />} onClick={openStatusModal}
              style={{ borderRadius: 10, height: 40, background: `linear-gradient(135deg,${ORANGE},#c2410c)`, border: 'none' }}
            >
              Cập nhật trạng thái
            </Button>
          )}
          <Button
            icon={<DollarOutlined />}
            onClick={openPaymentModal}
            disabled={order.status === 'returned' && order.product_return?.status !== 'approved'}
            style={{ borderRadius: 10, height: 40, borderColor: '#198754', color: '#198754' }}
          >
            Cập nhật thanh toán
          </Button>
        </Space>
      </div>

      {/* ── Shopee-like note ── */}
      {!isCancelled && statusCfg.adminNote && (
        <div style={{ background: '#fff7ed', border: '1.5px solid #fed7aa', borderRadius: 12, padding: '10px 16px', marginBottom: 18, color: '#c2410c', fontSize: 13, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <WarningOutlined style={{ marginTop: 2 }} />
          <div>
            <strong>Ghi chú:</strong> {statusCfg.adminNote}
            {order.status === 'delivered' && (
              <span style={{ marginLeft: 8, color: '#7c3aed' }}>— Đợi khách bấm "Đã nhận hàng" để tự động hoàn thành.</span>
            )}
          </div>
        </div>
      )}

      {/* ── Status Progress ── */}
      {!isCancelled && (
        <Card style={{ ...cardStyle }} styles={{ body: { padding: '20px 24px' } }}>
          <Steps
            current={currentStep}
            size="small"
            items={PROGRESS_STEPS.map((s) => {
              const dateKey = STEP_DATES[s.key];
              const dateVal = dateKey ? (order[dateKey] as string | undefined) : undefined;
              return {
                title: s.title,
                description: <span style={{ fontSize: 10 }}>{dateVal ?? ''}</span>,
              };
            })}
          />
        </Card>
      )}

      {/* ── Cancelled/Returned ── */}
      {isCancelled && (
        <Card
          style={{ ...cardStyle, border: `1.5px solid ${order.status === 'cancelled' ? '#fca5a5' : '#e2e8f0'}`, background: order.status === 'cancelled' ? '#fef2f2' : '#f8fafc' }}
          styles={{ body: { padding: '14px 20px' } }}
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Space>
              <StatusTag status={order.status} config={ORDER_STATUS_CONFIG} />
              {order.status === 'cancelled' && order.cancelled_reason && (
                <Text type="danger" style={{ fontSize: 13 }}>Lý do: {order.cancelled_reason}</Text>
              )}
              {order.status === 'cancelled' && order.cancelled_at && (
                <Text type="secondary" style={{ fontSize: 12 }}>{order.cancelled_at}</Text>
              )}
            </Space>

            {order.status === 'returned' && order.product_return && (
              <div style={{ marginTop: 10 }}>
                <Space wrap>
                  <Tag color={PRODUCT_RETURN_STATUS_CONFIG[order.product_return.status ?? 'pending']?.color ?? '#64748b'}>
                    {PRODUCT_RETURN_STATUS_CONFIG[order.product_return.status ?? 'pending']?.label ?? order.product_return.status ?? '—'}
                  </Tag>
                  {order.product_return.status === 'pending' && order.product_return.reason && (
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      Lý do: {order.product_return.reason}
                    </Text>
                  )}
                </Space>

                {order.product_return.evidences && order.product_return.evidences.length > 0 && (
                  <div style={{ marginTop: 10 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>Minh chứng ({order.product_return.evidences.length})</Text>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 8 }}>
                      {order.product_return.evidences.map((e) => (
                        e.file_url ? (
                          <Image
                            key={e.id ?? e.file_url}
                            src={e.file_url}
                            width={90}
                            height={90}
                            style={{ objectFit: 'cover', borderRadius: 10, border: '1px solid #f0f0f0' }}
                            preview={false}
                          />
                        ) : null
                      ))}
                    </div>
                  </div>
                )}

                {order.product_return.status === 'pending' && (
                  <Space style={{ marginTop: 12 }}>
                    <Button
                      type="primary"
                      icon={<CheckCircleOutlined />}
                      loading={returnApproveLoading}
                      onClick={handleApproveReturn}
                      style={{ borderRadius: 10, background: 'linear-gradient(135deg,#198754,#0f5132)', border: 'none' }}
                    >
                      Chấp nhận hoàn trả
                    </Button>
                    <Button
                      danger
                      icon={<CloseCircleOutlined />}
                      onClick={() => {
                        setReturnRejectReason('');
                        setReturnRejectOpen(true);
                      }}
                      style={{ borderRadius: 10 }}
                    >
                      Từ chối
                    </Button>
                  </Space>
                )}

                {order.product_return.status === 'approved' && (
                  <div style={{ marginTop: 10, color: '#0369a1', fontSize: 13 }}>
                    Đã duyệt hoàn trả. Tiếp theo cập nhật hoàn tiền ở mục “Cập nhật thanh toán”.
                  </div>
                )}
              </div>
            )}
          </Space>
        </Card>
      )}

      <Row gutter={[20, 20]}>
        {/* ── Left ── */}
        <Col xs={24} lg={16}>

          {/* Items */}
          <Card
            title={<span style={{ fontWeight: 700 }}><GiftOutlined style={{ marginRight: 8, color: ORANGE }} /> Sản phẩm ({order.items?.length ?? 0})</span>}
            style={cardStyle}
            styles={{ body: { padding: '0 20px' } }}
          >
            {(order.items ?? []).map((item, i) => {
              const attrs = parseVariantAttrs(item.variant_info);
              return (
                <div key={item.id ?? i} style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 0', borderBottom: i < (order.items?.length ?? 0) - 1 ? '1px solid #f0f0f0' : 'none' }}>
                  {item.product_image ? (
                    <Image src={item.product_image} width={64} height={64} style={{ objectFit: 'cover', borderRadius: 10, border: '1px solid #f0f0f0' }}
                      fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" />
                  ) : (
                    <div style={{ width: 64, height: 64, borderRadius: 10, background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid #f0f0f0', flexShrink: 0 }}>
                      <ShoppingCartOutlined style={{ color: '#adb5bd', fontSize: 22 }} />
                    </div>
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e', marginBottom: 4 }}>{item.product_name}</div>
                    {item.product_sku && <Text type="secondary" style={{ fontSize: 12 }}>SKU: {item.product_sku}</Text>}
                    {/* Variant attributes (properly parsed, no raw JSON) */}
                    {attrs.length > 0 && (
                      <div style={{ marginTop: 5, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                        {attrs.map((a, ai) => (
                          <Tag key={ai} style={{ fontSize: 11, borderRadius: 12, margin: 0, background: '#fff7ed', borderColor: '#fed7aa', color: '#c2410c' }}>
                            {a.name}: {a.value}
                          </Tag>
                        ))}
                      </div>
                    )}
                    <div style={{ color: '#8590a3', fontSize: 12, marginTop: 5 }}>{formatVND(item.price)} × {item.quantity}</div>
                  </div>
                  <Text strong style={{ color: ORANGE, fontSize: 15, whiteSpace: 'nowrap' }}>{formatVND(item.total)}</Text>
                </div>
              );
            })}

            {/* Totals */}
            <div style={{ background: '#fff7ed', borderRadius: 12, padding: '14px 16px', margin: '0 0 16px', border: '1px solid #fed7aa' }}>
              {[
                { label: 'Tạm tính', val: formatVND(order.subtotal) },
                order.discount_amount > 0 && { label: 'Giảm giá', val: `– ${formatVND(order.discount_amount)}`, color: '#16a34a' },
                order.voucher_code && { label: `Voucher (${order.voucher_code})`, val: `– ${formatVND(order.voucher_discount ?? 0)}`, color: '#16a34a' },
                { label: 'Phí vận chuyển', val: order.shipping_fee > 0 ? formatVND(order.shipping_fee) : 'Miễn phí' },
              ].filter(Boolean).map((row: unknown) => {
                const r = row as { label: string; val: string; color?: string };
                return (
                  <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 8 }}>
                    <Text type="secondary">{r.label}</Text>
                    <Text style={r.color ? { color: r.color, fontWeight: 600 } : {}}>{r.val}</Text>
                  </div>
                );
              })}
              <Divider style={{ margin: '10px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text strong style={{ fontSize: 16 }}>Tổng cộng</Text>
                <Text strong style={{ fontSize: 17, color: ORANGE }}>{formatVND(order.total_amount)}</Text>
              </div>
            </div>
          </Card>

          {/* Status History */}
          {order.status_history && order.status_history.length > 0 && (
            <Card
              title={<span style={{ fontWeight: 700 }}><HistoryOutlined style={{ marginRight: 8, color: ORANGE }} /> Lịch sử trạng thái</span>}
              style={cardStyle}
            >
              <Timeline
                items={order.status_history.map((h, i) => {
                  const toCfg = ORDER_STATUS_CONFIG[h.to];
                  const fromCfg = ORDER_STATUS_CONFIG[h.from];
                  return {
                    key: i,
                    color: toCfg?.color === 'success' ? 'green' : toCfg?.color === 'error' ? 'red' : toCfg?.color === 'blue' ? 'blue' : 'gray',
                    children: (
                      <div>
                        <Space wrap style={{ marginBottom: 4 }}>
                          <Tag color={fromCfg?.color} style={{ borderRadius: 20, margin: 0, fontSize: 11 }}>{fromCfg?.label ?? h.from}</Tag>
                          <span style={{ color: '#adb5bd' }}>→</span>
                          <Tag color={toCfg?.color} style={{ borderRadius: 20, margin: 0, fontSize: 11 }}>{toCfg?.label ?? h.to}</Tag>
                        </Space>
                        {h.note && <div style={{ color: '#6c757d', fontSize: 12, marginTop: 4, fontStyle: 'italic' }}>{h.note}</div>}
                        <div style={{ color: '#adb5bd', fontSize: 11, marginTop: 4 }}>{h.created_at}</div>
                      </div>
                    ),
                  };
                })}
              />
            </Card>
          )}
        </Col>

        {/* ── Right ── */}
        <Col xs={24} lg={8}>

          {/* Status card */}
          <Card
            title={<span style={{ fontWeight: 700 }}><Badge color={ORDER_STATUS_CONFIG[order.status]?.color === 'error' ? 'red' : ORDER_STATUS_CONFIG[order.status]?.color === 'success' ? 'green' : 'orange'} /> Trạng thái</span>}
            style={cardStyle}
            extra={validNext.length > 0 && <Button size="small" icon={<EditOutlined />} onClick={openStatusModal} style={{ borderRadius: 8 }}>Đổi</Button>}
          >
            <Space direction="vertical" style={{ width: '100%' }} size={12}>
              <div style={rowStyle}>
                <Text type="secondary" style={{ fontSize: 13 }}>Trạng thái đơn</Text>
                <StatusTag status={order.status} config={ORDER_STATUS_CONFIG} />
              </div>
              <div style={rowStyle}>
                <Text type="secondary" style={{ fontSize: 13 }}>Thanh toán</Text>
                <Space>
                  <StatusTag status={order.payment_status} config={PAYMENT_STATUS_CONFIG} />
                  <Button size="small" icon={<EditOutlined />} onClick={openPaymentModal} style={{ borderRadius: 6 }} />
                </Space>
              </div>
              <div style={rowStyle}>
                <Text type="secondary" style={{ fontSize: 13 }}>Phương thức TT</Text>
                <Tag color={order.payment_method === 'vnpay' ? 'blue' : order.payment_method === 'banking' ? 'geekblue' : 'orange'} style={{ borderRadius: 20, margin: 0 }}>
                  {PAYMENT_METHOD_LABELS[order.payment_method ?? ''] ?? order.payment_method ?? '—'}
                </Tag>
              </div>
              {order.tracking_code && (
                <div style={rowStyle}>
                  <Text type="secondary" style={{ fontSize: 13 }}>Mã vận đơn</Text>
                  <Space>
                    <Text code style={{ fontSize: 12 }}>{order.tracking_code}</Text>
                    <Button type="text" size="small" icon={<CopyOutlined />} onClick={() => copy(order.tracking_code!)} />
                  </Space>
                </div>
              )}
              {order.shipping_partner && (
                <div style={rowStyle}>
                  <Text type="secondary" style={{ fontSize: 13 }}>Đơn vị giao</Text>
                  <Text style={{ fontSize: 13 }}>{order.shipping_partner}</Text>
                </div>
              )}
              {order.estimated_delivery && (
                <div style={rowStyle}>
                  <Text type="secondary" style={{ fontSize: 13 }}>Dự kiến giao</Text>
                  <Text style={{ fontSize: 13 }}>{order.estimated_delivery}</Text>
                </div>
              )}
            </Space>
          </Card>

          {/* Customer */}
          <Card title={<span style={{ fontWeight: 700 }}><UserOutlined style={{ marginRight: 6, color: ORANGE }} /> Khách hàng</span>} style={cardStyle}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label={<span style={{ fontSize: 12 }}>Họ tên</span>}>
                <Text strong style={{ fontSize: 13 }}>{order.shipping?.fullname ?? order.user?.fullname ?? '—'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label={<span style={{ fontSize: 12 }}>Email</span>}>
                <Text style={{ fontSize: 13 }}>{order.user?.email ?? order.shipping?.email ?? '—'}</Text>
              </Descriptions.Item>
              <Descriptions.Item label={<span style={{ fontSize: 12 }}>SĐT</span>}>
                <Text style={{ fontSize: 13 }}>
                  <PhoneOutlined style={{ marginRight: 4, color: ORANGE }} />
                  {order.shipping?.phone ?? order.user?.phone ?? '—'}
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Shipping address */}
          <Card title={<span style={{ fontWeight: 700 }}><EnvironmentOutlined style={{ marginRight: 6, color: ORANGE }} /> Địa chỉ giao hàng</span>} style={cardStyle}>
            <div style={{ fontSize: 13, lineHeight: '1.8' }}>
              <div style={{ fontWeight: 600 }}>{order.shipping?.address ?? '—'}</div>
              <div style={{ color: '#6c757d' }}>
                {[order.shipping?.ward, order.shipping?.district, order.shipping?.province].filter(Boolean).join(', ') || '—'}
              </div>
            </div>
          </Card>

          {/* Notes */}
          {(order.note || order.admin_note) && (
            <Card title={<span style={{ fontWeight: 700 }}>Ghi chú</span>} style={cardStyle}>
              {order.note && (
                <div style={{ marginBottom: 10 }}>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Từ khách hàng:</Text>
                  <div style={{ background: '#f8f9fa', borderRadius: 8, padding: '8px 12px', fontSize: 13 }}>{order.note}</div>
                </div>
              )}
              {order.admin_note && (
                <div>
                  <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>Ghi chú nội bộ:</Text>
                  <div style={{ background: '#fff8e1', borderRadius: 8, padding: '8px 12px', fontSize: 13, border: '1px solid #ffe082' }}>{order.admin_note}</div>
                </div>
              )}
            </Card>
          )}

          {/* Timestamps */}
          <Card title={<span style={{ fontWeight: 700 }}>Thời gian</span>} style={{ ...cardStyle, marginBottom: 0 }}>
            <Space direction="vertical" style={{ width: '100%' }} size={8}>
              {[
                { label: 'Đặt hàng', value: order.created_at },
                { label: 'Xác nhận', value: order.confirmed_at },
                { label: 'Giao vận chuyển', value: order.shipped_at },
                { label: 'Đã giao HK', value: order.delivered_at },
                { label: 'Khách xác nhận', value: order.completed_at },
                { label: 'Hủy', value: order.cancelled_at },
              ].filter(t => t.value).map(t => (
                <div key={t.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary" style={{ fontSize: 12 }}>{t.label}</Text>
                  <Text style={{ fontSize: 12 }}>{t.value}</Text>
                </div>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>

      {/* ── Status Modal ── */}
      <Modal
        title={<Space><SendOutlined style={{ color: ORANGE }} /><span>Cập nhật trạng thái – <Text code>{order.order_code}</Text></span></Space>}
        open={statusModalOpen}
        onOk={handleStatusSave}
        onCancel={() => setStatusModalOpen(false)}
        okText="Lưu thay đổi"
        cancelText="Hủy"
        confirmLoading={savingStatus}
        okButtonProps={{ style: { background: `linear-gradient(135deg,${ORANGE},#c2410c)`, border: 'none', borderRadius: 8 } }}
        cancelButtonProps={{ style: { borderRadius: 8 } }}
        width={520}
        style={{ top: 80 }}
      >
        <div style={{ background: '#fff7ed', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 12, color: '#92400e', border: '1px solid #fed7aa' }}>
          <strong>Trạng thái hiện tại:</strong> {ORDER_STATUS_CONFIG[order.status]?.label ?? order.status}
          {validNext.length > 0 && (
            <span style={{ marginLeft: 8 }}>→ Chuyển sang: {validNext.map(s => ORDER_STATUS_CONFIG[s]?.label ?? s).join(' hoặc ')}</span>
          )}
          {order.status === 'delivered' && (
            <div style={{ marginTop: 6, color: '#7c3aed', fontStyle: 'italic' }}>
              ⚠ Trạng thái "Đã nhận hàng" do khách hàng tự xác nhận.
              Admin chỉ xử lý hoàn trả (returned) nếu cần.
            </div>
          )}
        </div>

        <Form form={statusForm} layout="vertical">
          <Form.Item name="status" label="Trạng thái mới" rules={[{ required: true, message: 'Chọn trạng thái' }]}>
            <Select
              placeholder="Chọn trạng thái mới"
              style={{ borderRadius: 8 }}
              options={Object.entries(ORDER_STATUS_CONFIG)
                .filter(([k]) => validNext.includes(k))
                .map(([k, cfg]) => ({
                  value: k,
                  label: <Tag color={cfg.color} icon={cfg.icon} style={{ borderRadius: 20, margin: 0 }}>{cfg.label}</Tag>,
                }))}
            />
          </Form.Item>

          <Form.Item shouldUpdate={(p, c) => p.status !== c.status} noStyle>
            {({ getFieldValue }) => {
              const st = getFieldValue('status');
              return (
                <>
                  {st === 'cancelled' && (
                    <Form.Item name="cancelled_reason" label="Lý do hủy" rules={[{ required: true, message: 'Nhập lý do hủy đơn' }]}>
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
                          <Select placeholder="Chọn đơn vị" style={{ borderRadius: 8 }} allowClear
                            options={[
                              { value: 'GHN', label: 'Giao Hàng Nhanh (GHN)' },
                              { value: 'GHTK', label: 'GHTK' },
                              { value: 'VTP', label: 'Viettel Post' },
                              { value: 'VNPost', label: 'Vietnam Post' },
                              { value: 'JTExpress', label: 'J&T Express' },
                              { value: 'BeeFast', label: 'Bee Fast' },
                            ]}
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
      </Modal>

      {/* ── Payment Modal ── */}
      <Modal
        title={<Space><DollarOutlined style={{ color: '#198754' }} /><span>Cập nhật thanh toán – <Text code>{order.order_code}</Text></span></Space>}
        open={paymentModalOpen}
        onOk={handlePaymentSave}
        onCancel={() => setPaymentModalOpen(false)}
        okText="Lưu thay đổi"
        cancelText="Hủy"
        confirmLoading={savingPayment}
        okButtonProps={{ style: { background: 'linear-gradient(135deg,#198754,#0f5132)', border: 'none', borderRadius: 8 } }}
        cancelButtonProps={{ style: { borderRadius: 8 } }}
        width={400}
        style={{ top: 100 }}
      >
        <Form form={paymentForm} layout="vertical" style={{ marginTop: 14 }}>
          <Form.Item name="payment_status" label="Trạng thái thanh toán" rules={[{ required: true }]}>
            <Select
              style={{ borderRadius: 8 }}
              options={Object.entries(PAYMENT_STATUS_CONFIG)
                .filter(([k]) => {
                  if (order.status === 'returned') return ['refunded', 'partial_refund'].includes(k);
                  return ['unpaid', 'paid'].includes(k);
                })
                .map(([k, cfg]) => ({
                  value: k,
                  label: <Tag color={cfg.color} style={{ borderRadius: 20, margin: 0 }}>{cfg.label}</Tag>,
                }))}
            />
          </Form.Item>
          <Form.Item name="note" label="Ghi chú (tuỳ chọn)">
            <Input.TextArea rows={2} placeholder="Ghi chú..." style={{ borderRadius: 8 }} />
          </Form.Item>
        </Form>
      </Modal>

      {/* ── Return Reject Modal ── */}
      <Modal
        title={<Space><CloseCircleOutlined style={{ color: '#dc3545' }} /><span>Từ chối hoàn trả – <Text code>{order.order_code}</Text></span></Space>}
        open={returnRejectOpen}
        onOk={handleRejectReturn}
        onCancel={() => setReturnRejectOpen(false)}
        okText="Xác nhận từ chối"
        cancelText="Hủy"
        confirmLoading={returnRejectLoading}
        width={520}
        style={{ top: 120 }}
        okButtonProps={{ style: { borderRadius: 10 } }}
      >
        <div style={{ background: '#fff7ed', borderRadius: 10, padding: '10px 14px', marginBottom: 12, fontSize: 12, color: '#92400e', border: '1px solid #fed7aa' }}>
          Nhập lý do từ chối. Sau khi từ chối, trạng thái đơn hàng sẽ được khôi phục về `delivered`/`completed` (tuỳ thời điểm khách đã nhận hàng).
        </div>
        <Form layout="vertical">
          <Form.Item label="Lý do từ chối" required>
            <Input.TextArea
              rows={3}
              value={returnRejectReason}
              onChange={(e) => setReturnRejectReason(e.target.value)}
              placeholder="Ví dụ: Lý do không chấp nhận hoàn trả..."
              style={{ borderRadius: 8 }}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminOrderDetailPage;

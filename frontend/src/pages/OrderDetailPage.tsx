import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { axiosInstance } from '../api/axios';
import { useAuth } from '../context/AuthContext';

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
  product_id?: number;
  product_name: string;
  product_image?: string;
  product_sku?: string;
  variant_info?: VariantInfo | null;
  price: number;
  quantity: number;
  total: number;
  is_reviewed?: boolean;
}

interface StatusHistory {
  from: string;
  to: string;
  note?: string;
  created_at: string;
}

interface ClientOrder {
  id: number;
  order_code: string;
  shipping: {
    fullname?: string;
    phone?: string;
    email?: string;
    address?: string;
    ward?: string;
    district?: string;
    province?: string;
  };
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
    created_at?: string;
  };
}

// ── Cầu hình thời đạn ──────────────────────────────────────────
const AUTO_COMPLETE_DAYS = 3;   // delivered → completed sau N ngày
const RETURN_WINDOW_DAYS = 7;   // cửa sổ hoàn trả kể từ khi completed

/** Tính số ngày giữa 2 đốc thức (bựng Math.floor, làm tròn xuống) */
const daysSince = (dateStr: string | undefined): number => {
  if (!dateStr) return 0;
  const then = new Date(dateStr).getTime();
  const now  = Date.now();
  return Math.floor((now - then) / 86_400_000);
};

/** Trả về số ngày còn lại trong cửa sổ hoàn trả (dương = còn, 0 = đúng ngày, âm = hết hạn) */
const returnDaysLeft = (order: ClientOrder): number => {
  // Ưu tiên completed_at, fallback sang delivered_at
  const ref = order.completed_at ?? order.delivered_at;
  if (!ref) return RETURN_WINDOW_DAYS; // chưa biết ngày → cho phép
  return RETURN_WINDOW_DAYS - daysSince(ref);
};


// ── Shopee-like Status Config (Orange primary) ───────────────
/**
 * Luồng trạng thái:
 * pending → confirmed → processing → shipping → delivered → completed
 *                                  ↘ cancelled (admin/user)
 *                          returned (sau delivered/completed)
 *
 * Admin cập nhật tối đa đến "shipping" (đã giao cho đơn vị VT)
 * "delivered" do hệ thống/webhook tự động hoặc admin xác nhận từ GHN/GHTK
 * "completed" do KHÁCH HÀNG bấm "Đã nhận được hàng"
 */
const ORDER_STATUS_CFG: Record<string, {
  color: string; bg: string; border: string;
  label: string; icon: string; step: number;
  desc?: string;
}> = {
  pending: {
    color: '#b45309', bg: '#fffbeb', border: '#fde68a',
    label: 'Chờ xác nhận', icon: 'fa-clock', step: 0,
    desc: 'Đơn hàng đang chờ shop xác nhận',
  },
  confirmed: {
    color: '#0369a1', bg: '#f0f9ff', border: '#bae6fd',
    label: 'Đã xác nhận', icon: 'fa-check-circle', step: 1,
    desc: 'Shop đã xác nhận và đang chuẩn bị hàng',
  },
  processing: {
    color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe',
    label: 'Đang đóng gói', icon: 'fa-box', step: 2,
    desc: 'Shop đang đóng gói hàng để giao cho đơn vị vận chuyển',
  },
  shipping: {
    color: '#ea580c', bg: '#fff7ed', border: '#fed7aa',
    label: 'Đang vận chuyển', icon: 'fa-truck', step: 3,
    desc: 'Hàng đã được giao cho đơn vị vận chuyển',
  },
  delivered: {
    color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4',
    label: 'Đã giao hàng', icon: 'fa-box-open', step: 4,
    desc: 'Đơn vị vận chuyển đã giao hàng thành công. Bấm xác nhận nếu bạn đã nhận được hàng!',
  },
  completed: {
    color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0',
    label: 'Đã nhận hàng', icon: 'fa-check-double', step: 5,
    desc: 'Giao dịch hoàn tất. Cảm ơn bạn đã mua hàng!',
  },
  cancelled: {
    color: '#b91c1c', bg: '#fef2f2', border: '#fecaca',
    label: 'Đã hủy', icon: 'fa-times-circle', step: -1,
    desc: 'Đơn hàng đã bị hủy',
  },
  returned: {
    color: '#64748b', bg: '#f8fafc', border: '#e2e8f0',
    label: 'Hoàn trả', icon: 'fa-undo', step: -1,
    desc: 'Đơn hàng đã được hoàn trả',
  },
};

const PAYMENT_STATUS_CFG: Record<string, { color: string; bg: string; border: string; label: string; icon: string }> = {
  unpaid: { color: '#b45309', bg: '#fffbeb', border: '#fde68a', label: 'Chưa thanh toán', icon: 'fa-clock' },
  paid: { color: '#15803d', bg: '#f0fdf4', border: '#bbf7d0', label: 'Đã thanh toán', icon: 'fa-check-circle' },
  refunded: { color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', label: 'Đã hoàn tiền', icon: 'fa-undo' },
  partial_refund: { color: '#64748b', bg: '#f8fafc', border: '#e2e8f0', label: 'Hoàn một phần', icon: 'fa-undo' },
};

const PRODUCT_RETURN_STATUS_CFG: Record<string, { color: string; label: string }> = {
  pending: { color: '#b45309', label: 'Đang chờ duyệt' },
  approved: { color: '#0369a1', label: 'Đã duyệt hoàn trả' },
  rejected: { color: '#b91c1c', label: 'Từ chối hoàn trả' },
  refunded: { color: '#64748b', label: 'Đã hoàn tiền' },
};

const PAYMENT_METHOD_CFG: Record<string, { label: string; icon: string; color: string }> = {
  cod: { label: 'COD – Thanh toán khi nhận hàng', icon: 'fa-money-bill-wave', color: '#b45309' },
  vnpay: { label: 'VNPay', icon: 'fa-credit-card', color: '#0369a1' },
  banking: { label: 'Chuyển khoản ngân hàng', icon: 'fa-university', color: '#7c3aed' },
};

const STEP_LABELS = [
  { key: 'pending', label: 'Đặt hàng', icon: 'fa-shopping-cart' },
  { key: 'confirmed', label: 'Xác nhận', icon: 'fa-check-circle' },
  { key: 'processing', label: 'Đóng gói', icon: 'fa-box' },
  { key: 'shipping', label: 'Vận chuyển', icon: 'fa-truck' },
  { key: 'delivered', label: 'Đã giao', icon: 'fa-box-open' },
  { key: 'completed', label: 'Đã nhận', icon: 'fa-check-double' },
];

const formatVND = (v: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

// ── Variant info parser ───────────────────────────────────────
/**
 * variant_info có thể là:
 * 1. { sku, image, attrs: [{name, value}] }  ← format mới
 * 2. { "Màu sắc": "Đỏ", "Size": "L" }       ← format cũ phẳng
 */
const parseVariantAttrs = (info: VariantInfo | null | undefined): VariantAttr[] => {
  if (!info || typeof info !== 'object') return [];
  if (Array.isArray(info.attrs)) {
    return info.attrs.filter(a => a.name && a.value);
  }
  // Format phẳng: loại bỏ các key metadata
  const skip = ['sku', 'image', 'attrs'];
  return Object.entries(info)
    .filter(([k, v]) => !skip.includes(k) && typeof v === 'string' && v !== '')
    .map(([k, v]) => ({ name: k, value: v as string }));
};

// ── Main Component ───────────────────────────────────────────
const OrderDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [order, setOrder] = useState<ClientOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Cancel
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);

  // Confirm received
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);

  // Return request (không nhận/trả hàng)
  const [returnOpen, setReturnOpen] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnLoading, setReturnLoading] = useState(false);
  const [returnEvidenceFiles, setReturnEvidenceFiles] = useState<File[]>([]);
  const [bankInfo, setBankInfo] = useState({ bank: '', accountName: '', accountNumber: '' });

  // Retry VNPAY
  const [retryVnpayLoading, setRetryVnpayLoading] = useState(false);

  // ── Review States ─────────────────────────────────────────
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewItem, setReviewItem] = useState<OrderItem | null>(null);
  const [writeRating, setWriteRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [reviewContent, setReviewContent] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' | 'info' } | null>(null);
  const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // ── Fetch ──────────────────────────────────────────────────
  const fetchOrder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const res = await axiosInstance.get(`/client/orders/${id}`);
      const d: ClientOrder = res.data?.data ?? res.data;
      setOrder(d);
    } catch (err: unknown) {
      const e = err as { response?: { status?: number; data?: { message?: string } } };
      if (e?.response?.status === 403 || e?.response?.status === 404) {
        setError(e?.response?.data?.message ?? 'Không tìm thấy đơn hàng.');
      } else {
        setError('Không thể tải thông tin đơn hàng. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    fetchOrder();
  }, [user, navigate, fetchOrder]);

  // ── Cancel ─────────────────────────────────────────────────
  const handleCancel = async () => {
    if (!order) return;
    setCancelLoading(true);
    try {
      await axiosInstance.post(`/client/orders/${order.id}/cancel`, {
        reason: cancelReason || 'Khách hàng tự hủy.',
        refund_bank: bankInfo.bank,
        refund_account_name: bankInfo.accountName,
        refund_account_number: bankInfo.accountNumber,
      });
      showToast('Đã hủy đơn hàng thành công!', 'success');
      setCancelOpen(false);
      setCancelReason('');
      setBankInfo({ bank: '', accountName: '', accountNumber: '' });
      fetchOrder();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      showToast(e?.response?.data?.message ?? 'Không thể hủy đơn hàng', 'error');
    } finally {
      setCancelLoading(false);
    }
  };

  // ── Confirm Received ────────────────────────────────────────
  const handleConfirmReceived = async () => {
    if (!order) return;
    setConfirmLoading(true);
    try {
      await axiosInstance.post(`/client/orders/${order.id}/confirm-received`);
      showToast('🎉 Cảm ơn bạn đã xác nhận nhận hàng!', 'success');
      setConfirmOpen(false);
      fetchOrder();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      showToast(e?.response?.data?.message ?? 'Có lỗi xảy ra', 'error');
    } finally {
      setConfirmLoading(false);
    }
  };

  // ── Retry VNPAY Payment ────────────────────────────────────
  const handleRetryVnpay = async () => {
    if (!order) return;
    setRetryVnpayLoading(true);
    try {
      const res = await axiosInstance.get(`/client/orders/${order.id}/retry-vnpay`);
      if (res.data?.payment_url) {
        showToast('Đang chuyển hướng đến cổng thanh toán...', 'info');
        setTimeout(() => { window.location.href = res.data.payment_url; }, 800);
      }
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      showToast(e?.response?.data?.message ?? 'Không thể tạo lại link thanh toán', 'error');
    } finally {
      setRetryVnpayLoading(false);
    }
  };

  // ── Return Request ─────────────────────────────────────────
  const handleReturnRequest = async () => {
    if (!order) return;
    if (!returnReason.trim()) {
      showToast('Vui lòng nhập lý do yêu cầu hoàn trả.', 'error');
      return;
    }

    if (returnEvidenceFiles.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 hình ảnh minh chứng.', 'error');
      return;
    }

    setReturnLoading(true);
    try {
      const formData = new FormData();
      formData.append('reason', returnReason);
      formData.append('refund_bank', bankInfo.bank);
      formData.append('refund_account_name', bankInfo.accountName);
      formData.append('refund_account_number', bankInfo.accountNumber);
      returnEvidenceFiles.forEach((f) => {
        formData.append('evidence_images[]', f);
      });

      await axiosInstance.post(`/client/orders/${order.id}/return-request`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      showToast('Đã gửi yêu cầu hoàn trả thành công. Vui lòng chờ admin duyệt.', 'success');
      setReturnOpen(false);
      setReturnReason('');
      setReturnEvidenceFiles([]);
      setBankInfo({ bank: '', accountName: '', accountNumber: '' });
      fetchOrder();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      showToast(e?.response?.data?.message ?? 'Không thể gửi yêu cầu hoàn trả', 'error');
    } finally {
      setReturnLoading(false);
    }
  };

  // ── Submit Review ─────────────────────────────────────────
  const handleSubmitReview = async () => {
    if (!reviewItem || !order) return;
    setReviewLoading(true);
    try {
      await axiosInstance.post('/client/reviews', {
        order_item_id: reviewItem.id,
        rating: writeRating,
        content: reviewContent || null,
      });
      showToast('Cảm ơn bạn đã đánh giá sản phẩm!', 'success');
      setReviewOpen(false);
      setReviewContent('');
      setWriteRating(5);
      fetchOrder();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      showToast(e?.response?.data?.message ?? 'Không thể gửi đánh giá hoặc bạn đã đánh giá sản phẩm này.', 'error');
    } finally {
      setReviewLoading(false);
    }
  };

  // ── Loading ─────────────────────────────────────────────────
  if (loading) return (
    <>
      {CSS_INJECT}
      <div className="od-page">
        <div className="container">
          <div className="od-loading-box">
            <div className="od-spinner" />
            <div className="od-loading-text">Đang tải thông tin đơn hàng...</div>
          </div>
        </div>
      </div>
    </>
  );

  if (error) return (
    <>
      {CSS_INJECT}
      <div className="od-page">
        <div className="container">
          <div className="od-error-box">
            <i className="fas fa-exclamation-circle od-error-icon" />
            <div className="od-error-msg">{error}</div>
            <button className="od-btn-back" onClick={() => navigate('/profile', { state: { tab: 'orders' } })}>
              <i className="fas fa-arrow-left me-2" />Quay lại đơn hàng của tôi
            </button>
          </div>
        </div>
      </div>
    </>
  );

  if (!order) return null;

  const statusCfg = ORDER_STATUS_CFG[order.status] ?? ORDER_STATUS_CFG.pending;
  const payStatusCfg = PAYMENT_STATUS_CFG[order.payment_status] ?? PAYMENT_STATUS_CFG.unpaid;
  const payMethodCfg = PAYMENT_METHOD_CFG[order.payment_method ?? ''];
  const isCancelled = order.status === 'cancelled' || order.status === 'returned';
  const currentStep = isCancelled ? -1 : (statusCfg.step ?? 0);

  const canCancel = order.status === 'pending';
  const canConfirmReceived = order.status === 'delivered';

  // ── Logic hoàn trả và deadline ───────────────────────────────────
  const daysLeft    = returnDaysLeft(order);
  const returnExpired = daysLeft <= 0;            // hết hạn 7 ngày

  // Nếu delivered: countdown từ delivered_at (3 ngày tự động hoàn thành)
  const daysUntilAutoComplete = order.status === 'delivered'
    ? Math.max(0, AUTO_COMPLETE_DAYS - daysSince(order.delivered_at))
    : null;

  const canRequestReturn =
    ['delivered', 'completed'].includes(order.status) &&
    !returnExpired &&                              // Chưa hết 7 ngày
    (!order.product_return || order.product_return.status === 'rejected');

  // Số ngày còn lại để hiển thị (chỉ show khi đang trong cửa sổ)
  const showReturnCountdown =
    ['delivered', 'completed'].includes(order.status) &&
    !returnExpired &&
    daysLeft <= RETURN_WINDOW_DAYS;

  // Cho phép thanh toán lại khi: VNPAY + chưa thanh toán + đang pending
  const canRetryVnpay = order.payment_method === 'vnpay' &&
    order.payment_status === 'unpaid' &&
    order.status === 'pending';

  return (
    <>
      {CSS_INJECT}
      <div className="od-page">
        <div className="container">

          {/* Toast */}
          {toast && (
            <div className={`od-toast od-toast-${toast.type}`}>
              <i className={`fas ${toast.type === 'success' ? 'fa-check-circle' : toast.type === 'error' ? 'fa-exclamation-circle' : 'fa-info-circle'} od-toast-icon`} />
              {toast.msg}
            </div>
          )}

          {/* Breadcrumb */}
          <div className="od-breadcrumb">
            <Link to="/">Trang chủ</Link>
            <i className="fas fa-chevron-right od-bc-sep" />
            <Link to="/profile">Tài khoản</Link>
            <i className="fas fa-chevron-right od-bc-sep" />
            <span className="od-bc-cur">Chi tiết đơn hàng</span>
          </div>

          {/* Header */}
          <div className="od-header">
            <div className="od-header-left">
              <button className="od-btn-back" onClick={() => navigate('/profile', { state: { tab: 'orders' } })}>
                <i className="fas fa-arrow-left me-2" />Đơn hàng của tôi
              </button>
              <div>
                <div className="od-h-title-row">
                  <h1 className="od-h-title">Chi tiết đơn hàng</h1>
                  <div className="od-h-code">
                    #{order.order_code}
                    <button className="od-copy-btn" title="Sao chép" onClick={() => { navigator.clipboard.writeText(order.order_code); showToast('Đã sao chép mã đơn!', 'info'); }}>
                      <i className="fas fa-copy" />
                    </button>
                  </div>
                </div>
                <div className="od-h-date"><i className="fas fa-calendar-alt me-1" />Đặt lúc: {order.created_at}</div>
              </div>
            </div>
            <div className="od-header-badges">
              <span className="od-status-badge" style={{ color: statusCfg.color, background: statusCfg.bg, borderColor: statusCfg.border }}>
                <i className={`fas ${statusCfg.icon} me-1`} />{statusCfg.label}
              </span>
              <span className="od-pay-badge" style={{ color: payStatusCfg.color, background: payStatusCfg.bg, borderColor: payStatusCfg.border }}>
                <i className={`fas ${payStatusCfg.icon} me-1`} />{payStatusCfg.label}
              </span>
            </div>
          </div>

          {/* ── CTA: Xác nhận nhận hàng ── */}
          {canConfirmReceived && (
            <div className="od-cta-card">
              <div className="od-cta-info">
                <i className="fas fa-box-open od-cta-icon" />
                <div>
                  <div className="od-cta-title">Bạn đã nhận được hàng chưa?</div>
                  <div className="od-cta-sub">
                    Đơn vị vận chuyển báo đã giao hàng thành công. Nhấn xác nhận để hoàn tất giao dịch.
                    {daysUntilAutoComplete !== null && daysUntilAutoComplete > 0 && (
                      <span style={{ color: '#b45309', marginLeft: 6 }}>
                        (Tự động hoàn thành sau <strong>{daysUntilAutoComplete}</strong> ngày)
                      </span>
                    )}
                    {daysUntilAutoComplete === 0 && (
                      <span style={{ color: '#b91c1c', marginLeft: 6 }}>
                        (Sắp được tự động hoàn thành hôm nay)
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button className="od-btn-confirm-received" onClick={() => setConfirmOpen(true)}>
                <i className="fas fa-check-double me-2" />Đã nhận được hàng
              </button>
            </div>
          )}

          {/* ── Cancelled / Returned notice ── */}
          {isCancelled && (
            <div className="od-cancelled-card" style={{ borderColor: statusCfg.border, background: statusCfg.bg }}>
              <i className={`fas ${statusCfg.icon} od-cancelled-icon`} style={{ color: statusCfg.color }} />
              <div>
                <div className="od-cancelled-label" style={{ color: statusCfg.color }}>{statusCfg.label}</div>
                {order.status === 'returned' && order.product_return && (
                  <>
                    <div className="od-cancelled-reason">
                      Hoàn trả: {PRODUCT_RETURN_STATUS_CFG[order.product_return.status ?? 'pending']?.label ?? order.product_return.status ?? '—'}
                    </div>
                    {order.product_return.reason && order.product_return.status === 'pending' && (
                      <div className="od-cancelled-reason">Lý do: {order.product_return.reason}</div>
                    )}
                    {order.product_return.reason_for_refusal && order.product_return.status === 'rejected' && (
                      <div className="od-cancelled-reason">Lý do từ chối: {order.product_return.reason_for_refusal}</div>
                    )}
                    {order.product_return.created_at && (
                      <div className="od-cancelled-time">{order.product_return.created_at}</div>
                    )}
                  </>
                )}

                {order.status === 'cancelled' && order.cancelled_reason && (
                  <div className="od-cancelled-reason">Lý do: {order.cancelled_reason}</div>
                )}
                {order.status === 'cancelled' && order.cancelled_at && (
                  <div className="od-cancelled-time">{order.cancelled_at}</div>
                )}
              </div>
            </div>
          )}

          {/* ── Stepper (only non-cancelled) ── */}
          {!isCancelled && (
            <div className="od-card od-stepper-card">
              <div className="od-stepper">
                {STEP_LABELS.map((step, idx) => {
                  const done = idx < currentStep;
                  const active = idx === currentStep;
                  return (
                    <React.Fragment key={step.key}>
                      <div className={`od-step ${done ? 'done' : ''} ${active ? 'active' : ''}`}>
                        <div className="od-step-circle">
                          {done ? <i className="fas fa-check" /> : <i className={`fas ${step.icon}`} />}
                        </div>
                        <div className="od-step-label">{step.label}</div>
                      </div>
                      {idx < STEP_LABELS.length - 1 && (
                        <div className={`od-step-line ${idx < currentStep ? 'done' : ''}`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
              {statusCfg.desc && (
                <div className="od-stepper-desc">{statusCfg.desc}</div>
              )}
            </div>
          )}

          <div className="od-layout">
            {/* ── Main column ── */}
            <div className="od-main">

              {/* Items */}
              <div className="od-card">
                <div className="od-card-title">
                  <i className="fas fa-box me-2" style={{ color: '#ea580c' }} />
                  Sản phẩm ({order.items?.length ?? 0})
                </div>

                {(order.items ?? []).map((item, i) => {
                  const attrs = parseVariantAttrs(item.variant_info);
                  return (
                    <div
                      key={item.id ?? i}
                      className="od-item"
                      style={{ borderBottom: i < (order.items?.length ?? 0) - 1 ? '1px solid #f3f4f6' : 'none' }}
                    >
                      {item.product_image
                        ? <img src={item.product_image} alt={item.product_name} className="od-item-img" />
                        : <div className="od-item-img-placeholder"><i className="fas fa-box" /></div>
                      }
                      <div className="od-item-info">
                        <div className="od-item-name">{item.product_name}</div>
                        {item.product_sku && <div className="od-item-sku">SKU: {item.product_sku}</div>}
                        {attrs.length > 0 && (
                          <div className="od-item-attrs">
                            {attrs.map((a, ai) => (
                              <span key={ai} className="od-attr-tag">{a.name}: {a.value}</span>
                            ))}
                          </div>
                        )}
                        <div className="od-item-qty">{formatVND(item.price)} × {item.quantity}</div>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px' }}>
                         <div className="od-item-total">{formatVND(item.total)}</div>
                         {order.status === 'completed' && (
                            <button
                              className="od-btn-review-sm"
                              disabled={item.is_reviewed}
                              onClick={() => {
                                setReviewItem(item);
                                setReviewOpen(true);
                              }}
                            >
                              {item.is_reviewed ? <><i className="fas fa-check me-1" />Đã đánh giá</> : 'Đánh giá'}
                            </button>
                         )}
                      </div>
                    </div>
                  );
                })}

                {/* Price summary */}
                <div className="od-price-box">
                  <div className="od-price-row">
                    <span>Tạm tính</span><span>{formatVND(order.subtotal)}</span>
                  </div>
                  {order.discount_amount > 0 && (
                    <div className="od-price-row od-saving">
                      <span>Giảm giá</span><span>– {formatVND(order.discount_amount)}</span>
                    </div>
                  )}
                  {order.voucher_code && (
                    <div className="od-price-row od-saving">
                      <span>Voucher <span className="od-voucher">{order.voucher_code}</span></span>
                      <span>– {formatVND(order.voucher_discount ?? 0)}</span>
                    </div>
                  )}
                  <div className="od-price-row">
                    <span>Phí vận chuyển</span>
                    <span>{order.shipping_fee > 0 ? formatVND(order.shipping_fee) : <span className="od-free">Miễn phí</span>}</span>
                  </div>
                  <div className="od-price-divider" />
                  <div className="od-price-row od-total">
                    <span>Tổng cộng</span>
                    <span>{formatVND(order.total_amount)}</span>
                  </div>
                </div>
              </div>

              {/* Status History */}
              {order.status_history && order.status_history.length > 0 && (
                <div className="od-card">
                  <div className="od-card-title">
                    <i className="fas fa-history me-2" style={{ color: '#ea580c' }} />
                    Lịch sử đơn hàng
                  </div>
                  <ul className="od-timeline">
                    {order.status_history.map((h, i) => {
                      const fromCfg = ORDER_STATUS_CFG[h.from];
                      const toCfg = ORDER_STATUS_CFG[h.to];
                      return (
                        <li key={i} className="od-tl-item">
                          <div className="od-tl-dot" style={{ background: toCfg?.color ?? '#ea580c' }} />
                          <div className="od-tl-body">
                            <div className="od-tl-row">
                              <span className="od-tl-chip" style={{ color: fromCfg?.color ?? '#64748b', background: fromCfg?.bg ?? '#f8fafc' }}>
                                <i className={`fas ${fromCfg?.icon ?? 'fa-circle'} me-1`} style={{ fontSize: 9 }} />
                                {fromCfg?.label ?? h.from}
                              </span>
                              <i className="fas fa-long-arrow-alt-right od-tl-arrow" />
                              <span className="od-tl-chip" style={{ color: toCfg?.color ?? '#ea580c', background: toCfg?.bg ?? '#fff7ed' }}>
                                <i className={`fas ${toCfg?.icon ?? 'fa-circle'} me-1`} style={{ fontSize: 9 }} />
                                {toCfg?.label ?? h.to}
                              </span>
                            </div>
                            {h.note && <div className="od-tl-note">"{h.note}"</div>}
                            <div className="od-tl-time">{h.created_at}</div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>

            {/* ── Sidebar ── */}
            <div className="od-sidebar">

              {/* Shipping address */}
              <div className="od-card">
                <div className="od-card-title">
                  <i className="fas fa-map-marker-alt me-2" style={{ color: '#ea580c' }} />Địa chỉ giao hàng
                </div>
                <div className="od-info-row"><i className="fas fa-user" /><span><strong>{order.shipping?.fullname ?? '—'}</strong></span></div>
                <div className="od-info-row"><i className="fas fa-phone-alt" /><span>{order.shipping?.phone ?? '—'}</span></div>
                <div className="od-info-row">
                  <i className="fas fa-home" />
                  <span>{[order.shipping?.address, order.shipping?.ward, order.shipping?.district, order.shipping?.province].filter(Boolean).join(', ') || '—'}</span>
                </div>
              </div>

              {/* Payment */}
              <div className="od-card">
                <div className="od-card-title">
                  <i className="fas fa-credit-card me-2" style={{ color: '#ea580c' }} />Thanh toán
                </div>
                {payMethodCfg && (
                  <div className="od-info-row">
                    <i className={`fas ${payMethodCfg.icon}`} style={{ color: payMethodCfg.color }} />
                    <span style={{ fontWeight: 600 }}>{payMethodCfg.label}</span>
                  </div>
                )}
                <div className="od-info-row">
                  <i className={`fas ${payStatusCfg.icon}`} style={{ color: payStatusCfg.color }} />
                  <span style={{ fontWeight: 600, color: payStatusCfg.color }}>{payStatusCfg.label}</span>
                </div>
              </div>

              {/* Shipping partner info */}
              {(order.tracking_code || order.shipping_partner || order.estimated_delivery) && (
                <div className="od-card">
                  <div className="od-card-title">
                    <i className="fas fa-truck me-2" style={{ color: '#ea580c' }} />Vận chuyển
                  </div>
                  {order.shipping_partner && (
                    <div className="od-info-row"><i className="fas fa-building" /><span>Đơn vị: <strong>{order.shipping_partner}</strong></span></div>
                  )}
                  {order.tracking_code && (
                    <div className="od-info-row">
                      <i className="fas fa-barcode" />
                      <span>
                        Mã vận đơn: <strong>{order.tracking_code}</strong>
                        <button className="od-copy-btn-sm" onClick={() => { navigator.clipboard.writeText(order.tracking_code!); showToast('Đã sao chép mã vận đơn!', 'info'); }}>
                          <i className="fas fa-copy" />
                        </button>
                      </span>
                    </div>
                  )}
                  {order.estimated_delivery && (
                    <div className="od-info-row"><i className="fas fa-calendar-check" /><span>Dự kiến: <strong>{order.estimated_delivery}</strong></span></div>
                  )}
                </div>
              )}

              {/* Note from customer */}
              {order.note && (
                <div className="od-card">
                  <div className="od-card-title">
                    <i className="fas fa-sticky-note me-2" style={{ color: '#ea580c' }} />Ghi chú của bạn
                  </div>
                  <div className="od-note-box">"{order.note}"</div>
                </div>
              )}

              {/* Timestamps */}
              <div className="od-card">
                <div className="od-card-title">
                  <i className="fas fa-clock me-2" style={{ color: '#ea580c' }} />Thời gian
                </div>
                {[
                  { label: 'Đặt hàng', value: order.created_at },
                  { label: 'Xác nhận', value: order.confirmed_at },
                  { label: 'Giao vận chuyển', value: order.shipped_at },
                  { label: 'Giao thành công', value: order.delivered_at },
                  { label: 'Nhận hàng', value: order.completed_at },
                  { label: 'Hủy đơn', value: order.cancelled_at },
                ].filter(t => t.value).map(t => (
                  <div key={t.label} className="od-time-row">
                    <span className="od-time-label">{t.label}</span>
                    <span className="od-time-val">{t.value}</span>
                  </div>
                ))}
              </div>

              {/* Actions */}
              <div className="od-card">
                {/* Nút Thanh toán lại cho VNPAY lỗi */}
                {canRetryVnpay && (
                  <button
                    className="od-btn-full"
                    style={{
                      background: retryVnpayLoading
                        ? '#bae6fd'
                        : 'linear-gradient(135deg, #0369a1, #0284c7)',
                      border: 'none', color: '#fff',
                      borderRadius: 10, padding: '10px 16px',
                      fontWeight: 700, fontSize: 14,
                      cursor: retryVnpayLoading ? 'not-allowed' : 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                      marginBottom: 8, transition: 'all .2s',
                    }}
                    onClick={handleRetryVnpay}
                    disabled={retryVnpayLoading}
                  >
                    {retryVnpayLoading
                      ? <><span className="od-spin me-2" />Đang tạo link...</>
                      : <><i className="fas fa-credit-card me-2" />Thanh toán lại (VNPAY)</>
                    }
                  </button>
                )}

                {canConfirmReceived && (
                  <button className="od-btn-confirm-received od-btn-full" onClick={() => setConfirmOpen(true)}>
                    <i className="fas fa-check-double me-2" />Đã nhận được hàng
                  </button>
                )}
                {canCancel && (
                  <button className="od-btn-cancel od-btn-full" onClick={() => { setCancelOpen(true); setCancelReason(''); }}>
                    <i className="fas fa-times-circle me-2" />Hủy đơn hàng
                  </button>
                )}
                {canRequestReturn && (
                  <>
                    {/* Countdown cửa sổ hoàn trả */}
                    {showReturnCountdown && (
                      <div style={{
                        background: daysLeft <= 2 ? '#fef2f2' : '#fff7ed',
                        border: `1.5px solid ${daysLeft <= 2 ? '#fecaca' : '#fed7aa'}`,
                        borderRadius: 10, padding: '8px 12px',
                        fontSize: 12, color: daysLeft <= 2 ? '#b91c1c' : '#b45309',
                        marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        <i className={`fas ${daysLeft <= 2 ? 'fa-exclamation-triangle' : 'fa-clock'}`} />
                        {daysLeft > 0
                          ? <>Còn <strong>{daysLeft}</strong> ngày để yêu cầu trả hàng</>
                          : <>Hôm nay là ngày cuối để yêu cầu trả hàng!</>}
                      </div>
                    )}
                    <button
                      className="od-btn-full"
                      style={{ background: '#fff7ed', border: '1.5px solid #b45309', color: '#b45309' }}
                      onClick={() => { setReturnOpen(true); setReturnReason(''); }}
                    >
                      <i className="fas fa-undo me-2" />
                      {order.status === 'delivered' ? 'Không nhận hàng' : 'Trả hàng'}
                    </button>
                  </>
                )}

                {/* Hết hạn hoàn trả */}
                {returnExpired && ['delivered', 'completed'].includes(order.status) &&
                  !order.product_return && (
                  <div style={{
                    background: '#f8fafc', border: '1.5px solid #e2e8f0',
                    borderRadius: 10, padding: '8px 12px',
                    fontSize: 12, color: '#64748b',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}>
                    <i className="fas fa-lock" />
                    Đã qua {RETURN_WINDOW_DAYS} ngày — không thể yêu cầu hoàn trả
                  </div>
                )}
                {['confirmed', 'processing', 'shipping'].includes(order.status) && (
                  <div className="od-lock-hint">
                    <i className="fas fa-lock me-2" />Đơn hàng đang xử lý, không thể hủy
                  </div>
                )}
                <Link to="/shop" style={{ textDecoration: 'none' }}>
                  <button className="od-btn-shop od-btn-full">
                    <i className="fas fa-shopping-bag me-2" />Tiếp tục mua sắm
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cancel Modal ── */}
      {cancelOpen && (
        <div className="od-overlay" onClick={e => { if (e.target === e.currentTarget) setCancelOpen(false); }}>
          <div className="od-modal">
            <div className="od-modal-hd">
              <div>
                <div className="od-modal-title">
                  <i className="fas fa-exclamation-triangle me-2" style={{ color: '#dc3545' }} />Hủy đơn hàng
                </div>
                <div className="od-modal-sub">Đơn <strong>#{order.order_code}</strong> sẽ bị hủy và tồn kho được khôi phục.</div>
              </div>
              <button className="od-modal-x" onClick={() => setCancelOpen(false)}><i className="fas fa-times" /></button>
            </div>
            <div className="od-modal-bd">
              <label className="od-modal-label">Lý do hủy (không bắt buộc)</label>
              <textarea
                className="od-textarea"
                placeholder="Cho chúng tôi biết lý do bạn muốn hủy..."
                value={cancelReason}
                onChange={e => setCancelReason(e.target.value)}
              />

              {order.payment_status === 'paid' && ['vnpay', 'banking'].includes(order.payment_method ?? '') && (
                <div style={{ marginTop: 16, padding: 14, background: '#fff7ed', borderRadius: 10, border: '1px solid #fed7aa' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#9a3412', marginBottom: 10 }}>
                    <i className="fas fa-university me-2" />Thông tin hoàn tiền
                  </div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    <input className="od-textarea" style={{ minHeight: 40 }} placeholder="Tên ngân hàng (ví dụ: VCB, Techcombank...)" value={bankInfo.bank} onChange={e => setBankInfo(prev => ({ ...prev, bank: e.target.value }))} />
                    <input className="od-textarea" style={{ minHeight: 40 }} placeholder="Họ tên chủ tài khoản" value={bankInfo.accountName} onChange={e => setBankInfo(prev => ({ ...prev, accountName: e.target.value }))} />
                    <input className="od-textarea" style={{ minHeight: 40 }} placeholder="Số tài khoản" value={bankInfo.accountNumber} onChange={e => setBankInfo(prev => ({ ...prev, accountNumber: e.target.value }))} />
                  </div>
                  <div style={{ fontSize: 11, color: '#9a3412', marginTop: 8 }}>Vui lòng nhập chính xác để Shop hoàn lại tiền đã thanh toán.</div>
                </div>
              )}
            </div>
            <div className="od-modal-ft">
              <button className="od-modal-btn-no" onClick={() => setCancelOpen(false)} disabled={cancelLoading}>Không hủy</button>
              <button className="od-modal-btn-yes od-btn-danger" onClick={handleCancel} disabled={cancelLoading}>
                {cancelLoading
                  ? <><span className="od-spin me-2" />Đang hủy...</>
                  : <><i className="fas fa-times-circle me-2" />Xác nhận hủy</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Received Modal ── */}
      {confirmOpen && (
        <div className="od-overlay" onClick={e => { if (e.target === e.currentTarget) setConfirmOpen(false); }}>
          <div className="od-modal">
            <div className="od-modal-hd">
              <div>
                <div className="od-modal-title">
                  <i className="fas fa-check-double me-2" style={{ color: '#15803d' }} />Xác nhận đã nhận hàng
                </div>
                <div className="od-modal-sub">Bạn xác nhận đã nhận được hàng từ đơn <strong>#{order.order_code}</strong>?</div>
              </div>
              <button className="od-modal-x" onClick={() => setConfirmOpen(false)}><i className="fas fa-times" /></button>
            </div>
            <div className="od-modal-bd">
              <div className="od-confirm-info-box">
                <i className="fas fa-info-circle me-2" style={{ color: '#0369a1' }} />
                Sau khi xác nhận, đơn hàng sẽ được chuyển sang trạng thái <strong>Hoàn thành</strong> và không thể hoàn tác.
              </div>
            </div>
            <div className="od-modal-ft">
              <button className="od-modal-btn-no" onClick={() => setConfirmOpen(false)} disabled={confirmLoading}>Chưa nhận được</button>
              <button className="od-modal-btn-yes od-btn-success" onClick={handleConfirmReceived} disabled={confirmLoading}>
                {confirmLoading
                  ? <><span className="od-spin me-2" />Đang xác nhận...</>
                  : <><i className="fas fa-check-double me-2" />Đã nhận được hàng</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Return Request Modal ── */}
      {returnOpen && (
        <div
          className="od-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setReturnOpen(false);
              setReturnEvidenceFiles([]);
            }
          }}
        >
          <div className="od-modal">
            <div className="od-modal-hd">
              <div>
                <div className="od-modal-title">
                  <i className="fas fa-undo me-2" style={{ color: '#b45309' }} />Yêu cầu hoàn trả
                </div>
                <div className="od-modal-sub">
                  Bạn sẽ gửi yêu cầu hoàn trả cho đơn <strong>#{order.order_code}</strong>. Admin sẽ duyệt/từ chối.
                </div>
              </div>
              <button
                className="od-modal-x"
                onClick={() => {
                  setReturnOpen(false);
                  setReturnEvidenceFiles([]);
                }}
              >
                <i className="fas fa-times" />
              </button>
            </div>
            <div className="od-modal-bd">
              <label className="od-modal-label">Lý do yêu cầu hoàn trả (bắt buộc)</label>
              <textarea
                className="od-textarea"
                placeholder="Ví dụ: không nhận được hàng / muốn trả hàng / lý do khác..."
                value={returnReason}
                onChange={e => setReturnReason(e.target.value)}
              />

              <div style={{ height: 12 }} />

              <label className="od-modal-label">Hình ảnh minh chứng (bắt buộc)</label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  const files = Array.from(e.target.files ?? []);
                  setReturnEvidenceFiles(files);
                }}
                style={{
                  width: '100%',
                  border: '2px solid #eaecf0',
                  borderRadius: 10,
                  padding: '10px 12px',
                  background: '#f8f9fc',
                  fontSize: 13,
                }}
              />
              {returnEvidenceFiles.length > 0 && (
                <div style={{ marginTop: 10, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {returnEvidenceFiles.slice(0, 6).map((f, idx) => (
                    <img
                      key={`${f.name}_${idx}`}
                      src={URL.createObjectURL(f)}
                      alt="minh chứng"
                      style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 10, border: '1px solid #f0f0f0' }}
                    />
                  ))}
                </div>
              )}

              {order.payment_status === 'paid' && (
                <div style={{ marginTop: 16, padding: 14, background: '#fff7ed', borderRadius: 10, border: '1px solid #fed7aa' }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#9a3412', marginBottom: 10 }}>
                    <i className="fas fa-university me-2" />Thông tin hoàn tiền
                  </div>
                  <div style={{ display: 'grid', gap: 10 }}>
                    <input className="od-textarea" style={{ minHeight: 40 }} placeholder="Tên ngân hàng (ví dụ: VCB, Techcombank...)" value={bankInfo.bank} onChange={e => setBankInfo(prev => ({ ...prev, bank: e.target.value }))} />
                    <input className="od-textarea" style={{ minHeight: 40 }} placeholder="Họ tên chủ tài khoản" value={bankInfo.accountName} onChange={e => setBankInfo(prev => ({ ...prev, accountName: e.target.value }))} />
                    <input className="od-textarea" style={{ minHeight: 40 }} placeholder="Số tài khoản" value={bankInfo.accountNumber} onChange={e => setBankInfo(prev => ({ ...prev, accountNumber: e.target.value }))} />
                  </div>
                  <div style={{ fontSize: 11, color: '#9a3412', marginTop: 8 }}>Vui lòng nhập chính xác để Shop hoàn lại tiền cho bạn.</div>
                </div>
              )}
            </div>
            <div className="od-modal-ft">
              <button
                className="od-modal-btn-no"
                onClick={() => {
                  setReturnOpen(false);
                  setReturnEvidenceFiles([]);
                }}
                disabled={returnLoading}
              >
                Hủy
              </button>
              <button
                className="od-modal-btn-yes"
                style={{ background: 'linear-gradient(135deg,#b45309,#92400e)' }}
                onClick={handleReturnRequest}
                disabled={returnLoading}
              >
                {returnLoading
                  ? <><span className="od-spin me-2" />Đang gửi...</>
                  : <><i className="fas fa-undo-alt me-2" />Gửi yêu cầu hoàn trả</>
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Review Modal ── */}
      {reviewOpen && reviewItem && (
        <div className="od-overlay" onClick={e => { if (e.target === e.currentTarget) setReviewOpen(false); }}>
          <div className="od-modal">
            <div className="od-modal-hd">
              <div>
                <div className="od-modal-title">
                  <i className="fas fa-star me-2" style={{ color: '#eab308' }} />Đánh giá sản phẩm
                </div>
                <div className="od-modal-sub">Bạn cảm thấy thế nào về sản phẩm này?</div>
              </div>
              <button className="od-modal-x" onClick={() => setReviewOpen(false)}><i className="fas fa-times" /></button>
            </div>
            <div className="od-modal-bd">
              <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                <img src={reviewItem.product_image || 'https://via.placeholder.com/60'} alt="" style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, border: '1px solid #eee' }} />
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1d23', marginBottom: 4 }}>{reviewItem.product_name}</div>
                  <div style={{ fontSize: 12, color: '#8590a3' }}>Phân loại: {parseVariantAttrs(reviewItem.variant_info).map(a => `${a.name}: ${a.value}`).join(', ') || 'Mặc định'}</div>
                </div>
              </div>

              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>Mức độ hài lòng</div>
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
                  {[1, 2, 3, 4, 5].map(star => (
                    <i
                      key={star}
                      className={star <= (hoverRating || writeRating) ? 'fas fa-star' : 'far fa-star'}
                      style={{ fontSize: 28, color: '#eab308', cursor: 'pointer', transition: 'transform 0.1s' }}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setWriteRating(star)}
                    />
                  ))}
                </div>
              </div>

              <label className="od-modal-label">Nhận xét chi tiết</label>
              <textarea
                className="od-textarea"
                placeholder="Hãy chia sẻ những điều bạn thích về sản phẩm này nhé..."
                value={reviewContent}
                onChange={e => setReviewContent(e.target.value)}
                style={{ minHeight: 100 }}
              />
            </div>
            <div className="od-modal-ft">
              <button className="od-modal-btn-no" onClick={() => setReviewOpen(false)} disabled={reviewLoading}>Trở lại</button>
              <button className="od-modal-btn-yes" style={{ background: 'linear-gradient(135deg, #1d4ed8, #1e3a8a)' }} onClick={handleSubmitReview} disabled={reviewLoading}>
                {reviewLoading
                  ? <><span className="od-spin me-2" />Đang gửi...</>
                  : <><i className="fas fa-paper-plane me-2" />Hoàn thành</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ── CSS (Orange primary) ─────────────────────────────────────
const CSS = `
  /* ── Variables ── */
  :root {
    --od-primary: #ea580c;
    --od-primary-light: #fff7ed;
    --od-primary-border: #fed7aa;
    --od-primary-dark: #c2410c;
    --od-radius: 14px;
    --od-card-shadow: 0 2px 10px rgba(0,0,0,0.05);
  }

  .od-page { background: #f5f6fa; min-height: calc(100vh - 120px); padding: 32px 0 64px; }

  /* Breadcrumb */
  .od-breadcrumb { font-size: 12.5px; color: #8590a3; margin-bottom: 20px; display: flex; align-items: center; gap: 6px; }
  .od-breadcrumb a { color: #6c757d; text-decoration: none; transition: color .2s; }
  .od-breadcrumb a:hover { color: var(--od-primary); }
  .od-bc-sep { font-size: 10px; color: #c8cdd5; }
  .od-bc-cur { color: var(--od-primary); font-weight: 600; }

  /* Header */
  .od-header { display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 14px; margin-bottom: 20px; }
  .od-header-left { display: flex; align-items: flex-start; gap: 14px; flex-wrap: wrap; }
  .od-btn-back {
    display: inline-flex; align-items: center; white-space: nowrap;
    background: #fff; border: 1.5px solid #dde1ea; border-radius: 10px;
    padding: 9px 16px; font-size: 13px; font-weight: 600; color: #5a6275;
    cursor: pointer; transition: all .2s;
  }
  .od-btn-back:hover { border-color: var(--od-primary); color: var(--od-primary); background: var(--od-primary-light); }
  .od-h-title-row { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
  .od-h-title { font-size: 20px; font-weight: 800; color: #1a1d23; margin: 0; }
  .od-h-code { font-size: 13px; font-weight: 700; color: var(--od-primary); background: var(--od-primary-light); border-radius: 8px; padding: 2px 10px; display: flex; align-items: center; gap: 4px; }
  .od-h-date { font-size: 12px; color: #8590a3; margin-top: 4px; }
  .od-copy-btn { background: none; border: none; cursor: pointer; color: var(--od-primary); padding: 0 2px; font-size: 12px; opacity: .7; transition: opacity .2s; }
  .od-copy-btn:hover { opacity: 1; }
  .od-copy-btn-sm { background: none; border: none; cursor: pointer; color: var(--od-primary); padding: 0 3px; font-size: 11px; opacity: .7; }
  .od-copy-btn-sm:hover { opacity: 1; }

  /* Status badges */
  .od-header-badges { display: flex; gap: 8px; flex-wrap: wrap; align-items: flex-start; }
  .od-status-badge, .od-pay-badge {
    display: inline-flex; align-items: center; padding: 6px 14px;
    border-radius: 20px; font-size: 12.5px; font-weight: 700;
    border: 1.5px solid;
  }

  /* Toast */
  .od-toast {
    position: fixed; top: 80px; right: 20px; z-index: 9999;
    border-radius: 12px; padding: 13px 18px; font-size: 13.5px; font-weight: 500;
    display: flex; align-items: center; gap: 10px;
    box-shadow: 0 8px 24px rgba(0,0,0,0.15);
    animation: slideIn .3s ease; max-width: 360px;
  }
  .od-toast-icon { font-size: 16px; }
  .od-toast-success { background: #f0fdf4; border: 1px solid #bbf7d0; color: #15803d; }
  .od-toast-error   { background: #fef2f2; border: 1px solid #fecaca; color: #b91c1c; }
  .od-toast-info    { background: #eff6ff; border: 1px solid #bfdbfe; color: #1d4ed8; }
  @keyframes slideIn { from { opacity: 0; transform: translateX(18px); } to { opacity: 1; transform: translateX(0); } }

  /* CTA confirm received */
  .od-cta-card {
    display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 14px;
    background: linear-gradient(135deg, #f0fdf4, #dcfce7);
    border: 2px solid #86efac; border-radius: var(--od-radius);
    padding: 18px 22px; margin-bottom: 16px;
  }
  .od-cta-info { display: flex; align-items: flex-start; gap: 14px; }
  .od-cta-icon { font-size: 28px; color: #15803d; }
  .od-cta-title { font-weight: 800; font-size: 15px; color: #14532d; margin-bottom: 3px; }
  .od-cta-sub { font-size: 13px; color: #166534; }
  .od-btn-confirm-received {
    background: linear-gradient(135deg, #16a34a, #15803d);
    border: none; color: #fff; border-radius: 10px;
    padding: 10px 22px; font-size: 13.5px; font-weight: 700;
    cursor: pointer; white-space: nowrap; transition: all .2s;
    display: inline-flex; align-items: center;
  }
  .od-btn-confirm-received:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(21,128,61,.35); }

  /* Cancelled */
  .od-cancelled-card { display: flex; align-items: flex-start; gap: 14px; border-radius: var(--od-radius); border-width: 2px; border-style: solid; padding: 16px 20px; margin-bottom: 16px; }
  .od-cancelled-icon { font-size: 26px; }
  .od-cancelled-label { font-weight: 700; font-size: 15px; margin-bottom: 3px; }
  .od-cancelled-reason { font-size: 13px; color: #6c757d; }
  .od-cancelled-time { font-size: 12px; color: #8590a3; margin-top: 3px; }

  /* Card */
  .od-card { background: #fff; border-radius: var(--od-radius); border: 1.5px solid #eaecf0; padding: 20px; margin-bottom: 16px; box-shadow: var(--od-card-shadow); }
  .od-card-title { font-size: 14.5px; font-weight: 700; color: #1a1d23; margin-bottom: 16px; }

  /* Stepper */
  .od-stepper-card { padding: 22px 24px 16px; }
  .od-stepper { display: flex; align-items: center; justify-content: space-between; }
  .od-step { display: flex; flex-direction: column; align-items: center; gap: 8px; flex: 0 0 auto; }
  .od-step-circle {
    width: 36px; height: 36px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    background: #f1f3f7; color: #c8cdd5; font-size: 13px;
    border: 2px solid #eaecf0; transition: all .3s;
  }
  .od-step.done .od-step-circle { background: var(--od-primary); color: #fff; border-color: var(--od-primary); }
  .od-step.active .od-step-circle {
    background: #fff; color: var(--od-primary); border-color: var(--od-primary);
    box-shadow: 0 0 0 4px rgba(234,88,12,.15);
  }
  .od-step-label { font-size: 10.5px; font-weight: 600; color: #c8cdd5; text-align: center; white-space: nowrap; }
  .od-step.done .od-step-label, .od-step.active .od-step-label { color: var(--od-primary); }
  .od-step-line { flex: 1; height: 2px; background: #eaecf0; margin: 0 2px; margin-bottom: 22px; transition: background .3s; }
  .od-step-line.done { background: var(--od-primary); }
  .od-stepper-desc { margin-top: 14px; font-size: 12.5px; color: #6c757d; text-align: center; font-style: italic; }

  /* Layout */
  .od-layout { display: grid; grid-template-columns: 1fr 310px; gap: 16px; }
  @media (max-width: 900px) {
    .od-layout { grid-template-columns: 1fr; }
    .od-stepper { gap: 2px; }
    .od-step-label { font-size: 9px; }
    .od-step-circle { width: 28px; height: 28px; font-size: 10px; }
    .od-stepper-card { padding: 14px 12px; }
    .od-cta-card { flex-direction: column; }
  }

  /* Item */
  .od-item { display: flex; align-items: flex-start; gap: 14px; padding: 14px 0; }
  .od-item-img { width: 70px; height: 70px; object-fit: cover; border-radius: 10px; border: 1px solid #eaecf0; flex-shrink: 0; }
  .od-item-img-placeholder { width: 70px; height: 70px; border-radius: 10px; border: 1px solid #eaecf0; background: #f5f6fa; display: flex; align-items: center; justify-content: center; color: #c8cdd5; font-size: 22px; flex-shrink: 0; }
  .od-item-info { flex: 1; }
  .od-item-name { font-size: 14px; font-weight: 700; color: #1a1d23; margin-bottom: 3px; line-height: 1.4; }
  .od-item-sku { font-size: 11px; color: #8590a3; }
  .od-item-attrs { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 5px; }
  .od-attr-tag { font-size: 11px; background: #f0f2f7; border-radius: 10px; padding: 2px 8px; color: #5a6275; }
  .od-item-qty { font-size: 12px; color: #8590a3; margin-top: 5px; }
  .od-item-total { font-size: 15px; font-weight: 800; color: var(--od-primary); white-space: nowrap; }

  /* Price box */
  .od-price-box { background: linear-gradient(135deg, var(--od-primary-light), #fef9f6); border-radius: 12px; padding: 14px 16px; margin-top: 4px; }
  .od-price-row { display: flex; justify-content: space-between; font-size: 13px; color: #5a6275; margin-bottom: 8px; }
  .od-price-row:last-child { margin-bottom: 0; }
  .od-saving span:last-child { color: #16a34a; font-weight: 600; }
  .od-voucher { font-size: 11px; font-weight: 700; background: #fef9c3; border: 1px solid #fde047; border-radius: 10px; padding: 1px 7px; color: #854d0e; }
  .od-free { color: #16a34a; font-weight: 600; }
  .od-price-divider { border: none; border-top: 1px dashed #e2cfc9; margin: 8px 0; }
  .od-total { font-size: 15.5px !important; font-weight: 800 !important; color: #1a1d23 !important; }
  .od-total span:last-child { color: var(--od-primary) !important; }

  /* Timeline */
  .od-timeline { list-style: none; padding: 0; margin: 0; }
  .od-tl-item { display: flex; gap: 14px; padding-bottom: 16px; position: relative; }
  .od-tl-item:last-child { padding-bottom: 0; }
  .od-tl-item:not(:last-child)::before { content: ''; position: absolute; left: 7px; top: 16px; bottom: 0; width: 2px; background: #f0f2f7; }
  .od-tl-dot { width: 16px; height: 16px; border-radius: 50%; border: 3px solid #fff; box-shadow: 0 0 0 2px currentColor; flex-shrink: 0; margin-top: 2px; }
  .od-tl-body { flex: 1; }
  .od-tl-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin-bottom: 4px; }
  .od-tl-chip { font-size: 11px; font-weight: 700; padding: 3px 9px; border-radius: 20px; }
  .od-tl-arrow { font-size: 11px; color: #c8cdd5; }
  .od-tl-note { font-size: 12px; color: #6c757d; font-style: italic; margin-bottom: 3px; }
  .od-tl-time { font-size: 11px; color: #adb5bd; }

  /* Sidebar rows */
  .od-info-row { display: flex; gap: 10px; font-size: 13px; color: #3d4555; margin-bottom: 10px; align-items: flex-start; }
  .od-info-row:last-child { margin-bottom: 0; }
  .od-info-row i { color: var(--od-primary); margin-top: 2px; flex-shrink: 0; width: 14px; text-align: center; font-size: 13px; }
  .od-time-row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 7px; }
  .od-time-row:last-child { margin-bottom: 0; }
  .od-time-label { color: #8590a3; }
  .od-time-val { font-weight: 600; color: #3d4555; }
  .od-note-box { font-size: 13px; color: #5a6275; font-style: italic; line-height: 1.65; background: var(--od-primary-light); border-radius: 8px; padding: 10px 12px; }

  /* Action buttons */
  .od-btn-review-sm { background: #fff; border: 1.5px solid var(--od-primary); color: var(--od-primary); font-size: 12px; font-weight: 600; padding: 4px 10px; border-radius: 6px; cursor: pointer; transition: all .2s; display: inline-flex; align-items: center; }
  .od-btn-review-sm:hover:not(:disabled) { background: var(--od-primary); color: #fff; }
  .od-btn-review-sm:disabled { border-color: #eaecf0; color: #8590a3; cursor: not-allowed; background: #f8f9fc; }
  .od-btn-full { width: 100%; display: flex; align-items: center; justify-content: center; border-radius: 10px; padding: 11px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all .2s; margin-bottom: 10px; }
  .od-btn-full:last-child { margin-bottom: 0; }
  .od-btn-cancel { background: #fff5f5; border: 1.5px solid #dc3545; color: #dc3545; }
  .od-btn-cancel:hover { background: #dc3545; color: #fff; }
  .od-btn-shop { background: linear-gradient(135deg, var(--od-primary), var(--od-primary-dark)); border: none; color: #fff; }
  .od-btn-shop:hover { transform: translateY(-1px); box-shadow: 0 6px 18px rgba(234,88,12,.35); }
  .od-lock-hint { font-size: 12px; color: #8590a3; background: #f8f9fc; border-radius: 8px; padding: 8px 12px; margin-bottom: 10px; display: flex; align-items: center; }

  /* Modal */
  .od-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.5); display: flex; align-items: center; justify-content: center; z-index: 9999; animation: fadeIn .15s ease; }
  @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
  .od-modal { background: #fff; border-radius: 18px; width: 440px; max-width: 94vw; box-shadow: 0 24px 64px rgba(0,0,0,.2); animation: slideUp .2s ease; overflow: hidden; }
  @keyframes slideUp { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
  .od-modal-hd { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 20px 0; }
  .od-modal-title { font-size: 16px; font-weight: 800; color: #1a1d23; margin-bottom: 4px; }
  .od-modal-sub { font-size: 13px; color: #6c757d; }
  .od-modal-x { background: none; border: none; cursor: pointer; color: #adb5bd; font-size: 16px; padding: 0; transition: color .2s; }
  .od-modal-x:hover { color: #dc3545; }
  .od-modal-bd { padding: 16px 20px; }
  .od-modal-label { font-size: 13px; font-weight: 600; color: #3d4555; display: block; margin-bottom: 6px; }
  .od-textarea { width: 100%; border: 2px solid #eaecf0; border-radius: 10px; padding: 10px 12px; font-size: 13px; resize: vertical; min-height: 80px; outline: none; transition: border-color .2s; font-family: inherit; background: #f8f9fc; box-sizing: border-box; }
  .od-textarea:focus { border-color: var(--od-primary); background: #fff; }
  .od-confirm-info-box { background: #eff6ff; border: 1.5px solid #bfdbfe; border-radius: 10px; padding: 12px 14px; font-size: 13px; color: #1d4ed8; }
  .od-modal-ft { display: flex; justify-content: flex-end; gap: 10px; padding: 12px 20px 20px; }
  .od-modal-btn-no { background: #f8f9fa; border: 1.5px solid #dee2e6; color: #5a6275; border-radius: 10px; padding: 10px 22px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all .2s; }
  .od-modal-btn-no:hover { background: #e9ecef; }
  .od-modal-btn-yes { border: none; color: #fff; border-radius: 10px; padding: 10px 22px; font-size: 13px; font-weight: 700; cursor: pointer; transition: all .2s; display: flex; align-items: center; }
  .od-modal-btn-yes:disabled { opacity: .6; cursor: not-allowed; }
  .od-modal-btn-yes:not(:disabled):hover { transform: translateY(-1px); }
  .od-btn-danger { background: linear-gradient(135deg, #dc3545, #b02a37); }
  .od-btn-danger:not(:disabled):hover { box-shadow: 0 6px 18px rgba(220,53,69,.35); }
  .od-btn-success { background: linear-gradient(135deg, #16a34a, #15803d); }
  .od-btn-success:not(:disabled):hover { box-shadow: 0 6px 18px rgba(21,128,61,.35); }

  /* Loading / Error */
  .od-loading-box { text-align: center; padding: 80px 0; }
  .od-spinner { width: 40px; height: 40px; border: 4px solid #f0f2f7; border-top-color: var(--od-primary); border-radius: 50%; animation: spin .8s linear infinite; margin: 0 auto 16px; }
  @keyframes spin { to { transform: rotate(360deg); } }
  .od-loading-text { font-size: 14px; color: #8590a3; }
  .od-spin { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .7s linear infinite; display: inline-block; }
  .od-error-box { text-align: center; padding: 80px 0; }
  .od-error-icon { font-size: 56px; color: #dc3545; margin-bottom: 16px; display: block; }
  .od-error-msg { font-size: 16px; font-weight: 600; color: #2d3748; margin-bottom: 20px; }
`;

const CSS_INJECT = <style>{CSS}</style>;

export default OrderDetailPage;

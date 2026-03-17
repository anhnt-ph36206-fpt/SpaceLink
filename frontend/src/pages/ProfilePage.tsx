import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import type { User } from '../types/user';
import { axiosInstance } from '../api/axios';
import type { AxiosError } from 'axios';

// ── Order types ──────────────────────────────────────────────
interface OrderItem {
  id: number;
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
  created_at: string;
}
interface ClientOrder {
  id: number;
  order_code: string;
  shipping: { fullname?: string; phone?: string; address?: string; ward?: string; district?: string; province?: string };
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
  created_at: string;
  items?: OrderItem[];
  status_history?: StatusHistory[];
}

const ORDER_STATUS_CFG: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  pending:    { color: '#b45309', bg: '#fffbeb', label: 'Chờ xác nhận',   icon: 'fa-clock' },
  confirmed:  { color: '#1d4ed8', bg: '#eff6ff', label: 'Đã xác nhận',    icon: 'fa-check-circle' },
  processing: { color: '#7c3aed', bg: '#f5f3ff', label: 'Đang xử lí',     icon: 'fa-spinner' },
  shipping:   { color: '#0369a1', bg: '#f0f9ff', label: 'Đang giao',       icon: 'fa-truck' },
  delivered:  { color: '#0f766e', bg: '#f0fdfa', label: 'Đã giao',         icon: 'fa-box-open' },
  completed:  { color: '#15803d', bg: '#f0fdf4', label: 'Hoàn thành',      icon: 'fa-check-double' },
  cancelled:  { color: '#b91c1c', bg: '#fef2f2', label: 'Đã hủy',          icon: 'fa-times-circle' },
  returned:   { color: '#64748b', bg: '#f8fafc', label: 'Hoàn trả',        icon: 'fa-undo' },
};

const PAYMENT_STATUS_CFG: Record<string, { color: string; label: string }> = {
  pending:  { color: '#d97706', label: 'Chưa TT' },
  paid:     { color: '#16a34a', label: 'Đã TT' },
  unpaid:   { color: '#d97706', label: 'Chưa TT' },
  failed:   { color: '#dc2626', label: 'Thất bại' },
  refunded: { color: '#6b7280', label: 'Hoàn tiền' },
};

const formatVND = (v: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

const canCancel = (status: string) => status === 'pending';

type ProfileForm = {
  name: string;     // khớp với backend field 'fullname' (mapped)
  phone: string;
  gender: string;
  email: string;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const ProfilePage: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'info' | 'password' | 'orders'>('info');

  // ── Orders state ─────────────────────────────────────────────
  const [orders, setOrders] = useState<ClientOrder[]>([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderStatusFilter, setOrderStatusFilter] = useState('');
  const [orderPage, setOrderPage] = useState(1);
  const [orderTotal, setOrderTotal] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<ClientOrder | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cancelModalOrder, setCancelModalOrder] = useState<ClientOrder | null>(null);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [orderError, setOrderError] = useState('');
  const [orderSuccess, setOrderSuccess] = useState('');
  const [avatarPreview, setAvatarPreview] = useState<string>(user?.avatar || '');
  const [saveSuccess, setSaveSuccess] = useState<string>('');
  const [saveError, setSaveError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    register: regInfo,
    handleSubmit: handleInfo,
    formState: { errors: errInfo, isSubmitting: submittingInfo },
  } = useForm<ProfileForm>({
    defaultValues: {
      name:   user?.fullname   || '',
      phone:  user?.phone  || '',
      gender: user?.gender || '',
      email:  user?.email  || '',
    },
  });

  const {
    register: regPwd,
    handleSubmit: handlePwd,
    watch: watchPwd,
    reset: resetPwd,
    formState: { errors: errPwd, isSubmitting: submittingPwd },
  } = useForm<PasswordForm>();

  const newPasswordValue = watchPwd('newPassword');

  const showToast = (msg: string, type: 'success' | 'error') => {
    if (type === 'success') { setSaveSuccess(msg); setSaveError(''); }
    else { setSaveError(msg); setSaveSuccess(''); }
    setTimeout(() => { setSaveSuccess(''); setSaveError(''); }, 3500);
  };

  const showOrderToast = (msg: string, type: 'success' | 'error') => {
    if (type === 'success') { setOrderSuccess(msg); setOrderError(''); }
    else { setOrderError(msg); setOrderSuccess(''); }
    setTimeout(() => { setOrderSuccess(''); setOrderError(''); }, 3500);
  };

  // ── Fetch orders ─────────────────────────────────────────────
  const fetchOrders = useCallback(async (page = 1, statusFilter = orderStatusFilter) => {
    setOrderLoading(true);
    try {
      const params: Record<string, string | number> = { per_page: 5, page };
      if (statusFilter) params.status = statusFilter;
      const res = await axiosInstance.get('/client/orders', { params });
      const payload = res.data;
      const list: ClientOrder[] = payload?.data?.data ?? payload?.data ?? [];
      const meta = payload?.data?.meta ?? payload?.meta ?? {};
      setOrders(list);
      setOrderTotal(meta.total ?? list.length);
      setOrderPage(page);
    } catch {
      showOrderToast('Không thể tải danh sách đơn hàng', 'error');
    } finally {
      setOrderLoading(false);
    }
  }, [orderStatusFilter]);

  useEffect(() => {
    if (activeTab === 'orders') fetchOrders(1);
  }, [activeTab, fetchOrders]);

  // ── Fetch order detail ────────────────────────────────────────
  const openOrderDetail = async (order: ClientOrder) => {
    setSelectedOrder(order);
    setDetailLoading(true);
    try {
      const res = await axiosInstance.get(`/client/orders/${order.id}`);
      const d: ClientOrder = res.data?.data ?? res.data;
      setSelectedOrder(d);
    } catch { /* keep list data */ }
    finally { setDetailLoading(false); }
  };

  // ── Cancel order ─────────────────────────────────────────────
  const handleCancelOrder = async () => {
    if (!cancelModalOrder) return;
    setCancelLoading(true);
    try {
      await axiosInstance.post(`/client/orders/${cancelModalOrder.id}/cancel`, {
        reason: cancelReason || 'Khách hàng tự hủy.',
      });
      showOrderToast('Đã hủy đơn hàng thành công!', 'success');
      setCancelModalOrder(null);
      setCancelReason('');
      fetchOrders(orderPage);
      if (selectedOrder?.id === cancelModalOrder.id) {
        openOrderDetail(cancelModalOrder);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? 'Không thể hủy đơn hàng';
      showOrderToast(msg, 'error');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const onSaveInfo = async (data: ProfileForm) => {
    if (!user) return;
    try {
      // PUT /api/profile — axiosInstance tự gắn Bearer token
      const res = await axiosInstance.put('/profile', {
        fullname: data.name,      // backend field: 'fullname'
        phone:    data.phone,
        gender:   data.gender,
        email:    user.email,

        avatar:   avatarPreview || null,
      });
      // Response: { status: true, data: UserResource }
      const freshUser: User = res.data.data;
      updateUser(freshUser);
      showToast('Cập nhật thông tin thành công!', 'success');
    } catch (err) {
      const error = err as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
      const msg = error.response?.data?.message ?? 'Đã có lỗi xảy ra, vui lòng thử lại!';
      showToast(msg, 'error');
    }
  };

  const onSavePassword = async (data: PasswordForm) => {
    if (!user) return;
    try {
      // Gửi cùng endpoint PUT /api/profile — backend validate current_password
      const res = await axiosInstance.put('/profile', {
        current_password:      data.currentPassword,
        password:              data.newPassword,
        password_confirmation: data.confirmPassword,
      });
      const freshUser: User = res.data.data;
      updateUser(freshUser);
      resetPwd();
      showToast('Đổi mật khẩu thành công!', 'success');
    } catch (err) {
      const error = err as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
      const resData = error.response?.data;
      if (resData?.errors) {
        const firstMsg = Object.values(resData.errors)[0]?.[0];
        showToast(firstMsg ?? 'Dữ liệu không hợp lệ!', 'error');
      } else {
        showToast(resData?.message ?? 'Đã có lỗi xảy ra, vui lòng thử lại!', 'error');
      }
    }
  };

  if (!user) {
    navigate('/login');
    return null;
  }

  return (
    <>
      <style>{`
        /* ── Page wrapper ── */
        .profile-page {
          background: #f4f6fb;
          min-height: calc(100vh - 120px);
          padding: 40px 0 60px;
        }

        /* ── Breadcrumb ── */
        .profile-breadcrumb {
          font-size: 13px;
          color: #6c757d;
          margin-bottom: 28px;
        }
        .profile-breadcrumb a { color: #6c757d; text-decoration: none; }
        .profile-breadcrumb a:hover { color: #0d6efd; }
        .profile-breadcrumb .sep { margin: 0 8px; }
        .profile-breadcrumb .current { color: #0d6efd; font-weight: 600; }

        /* ── Sidebar ── */
        .profile-sidebar {
          background: linear-gradient(160deg, #0d6efd 0%, #0a58ca 55%, #084298 100%);
          border-radius: 20px;
          padding: 32px 24px;
          position: relative;
          overflow: hidden;
          box-shadow: 0 8px 32px rgba(13,110,253,0.25);
        }
        .profile-sidebar::before {
          content: '';
          position: absolute;
          width: 220px; height: 220px;
          background: rgba(255,255,255,0.06);
          border-radius: 50%;
          top: -80px; right: -70px;
        }
        .profile-sidebar::after {
          content: '';
          position: absolute;
          width: 140px; height: 140px;
          background: rgba(255,255,255,0.05);
          border-radius: 50%;
          bottom: 30px; left: -50px;
        }

        /* Avatar */
        .avatar-wrapper {
          position: relative;
          width: 90px; height: 90px;
          margin: 0 auto 14px;
        }
        .avatar-img {
          width: 90px; height: 90px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid rgba(255,255,255,0.85);
          background: #6c8ebf;
          box-shadow: 0 4px 16px rgba(0,0,0,0.18);
        }
        .avatar-placeholder {
          width: 90px; height: 90px;
          border-radius: 50%;
          border: 3px solid rgba(255,255,255,0.85);
          background: rgba(255,255,255,0.18);
          display: flex; align-items: center; justify-content: center;
          font-size: 32px; color: #fff;
          box-shadow: 0 4px 16px rgba(0,0,0,0.15);
        }
        .avatar-edit-btn {
          position: absolute;
          bottom: 2px; right: 2px;
          width: 26px; height: 26px;
          background: #ffc107;
          border-radius: 50%;
          border: none;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          font-size: 11px; color: #333;
          box-shadow: 0 2px 8px rgba(0,0,0,0.2);
          transition: transform 0.2s;
          z-index: 1;
        }
        .avatar-edit-btn:hover { transform: scale(1.15); background: #ffca2c; }

        /* Sidebar user info */
        .sidebar-username {
          color: #fff;
          font-size: 16px;
          font-weight: 700;
          text-align: center;
          margin-bottom: 4px;
        }
        .sidebar-email {
          color: rgba(255,255,255,0.6);
          font-size: 12px;
          text-align: center;
          margin-bottom: 10px;
          word-break: break-all;
        }
        .sidebar-role {
          display: inline-block;
          background: rgba(255,193,7,0.2);
          border: 1px solid rgba(255,193,7,0.5);
          color: #ffc107;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          padding: 3px 10px;
          border-radius: 20px;
          margin-bottom: 24px;
        }

        /* Sidebar divider */
        .sidebar-divider { border-color: rgba(255,255,255,0.15); margin-bottom: 14px; }

        /* Nav items */
        .sidebar-nav { list-style: none; padding: 0; margin: 0; }
        .sidebar-nav li { margin-bottom: 6px; }
        .sidebar-nav-btn {
          width: 100%;
          background: transparent;
          border: none;
          border-radius: 10px;
          padding: 10px 14px;
          display: flex; align-items: center; gap: 10px;
          color: rgba(255,255,255,0.7);
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          text-align: left;
        }
        .sidebar-nav-btn:hover { background: rgba(255,255,255,0.12); color: #fff; }
        .sidebar-nav-btn.active {
          background: rgba(255,255,255,0.18);
          color: #fff;
          font-weight: 600;
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.2);
        }
        .sidebar-nav-btn i { width: 18px; text-align: center; font-size: 14px; }
        .sidebar-nav-btn.logout-btn { color: rgba(255,120,120,0.85); margin-top: 6px; }
        .sidebar-nav-btn.logout-btn:hover { background: rgba(220,53,69,0.15); color: #ff9999; }

        /* ── Content card ── */
        .profile-card {
          background: #fff;
          border-radius: 20px;
          box-shadow: 0 4px 24px rgba(0,0,0,0.07);
          overflow: hidden;
        }
        .profile-card-header {
          padding: 22px 28px 18px;
          border-bottom: 1px solid #f0f2f7;
        }
        .profile-card-header h5 {
          font-size: 18px;
          font-weight: 700;
          color: #1a1d23;
          margin: 0 0 3px;
        }
        .profile-card-header p {
          font-size: 13px;
          color: #8590a3;
          margin: 0;
        }
        .profile-card-body { padding: 28px; }

        /* ── Form controls ── */
        .pf-label {
          font-size: 13px;
          font-weight: 600;
          color: #3d4555;
          margin-bottom: 6px;
          display: block;
        }
        .pf-input {
          width: 100%;
          border-radius: 10px;
          border: 2px solid #eaecf0;
          padding: 11px 14px 11px 40px;
          font-size: 14px;
          color: #2d3748;
          background: #f8f9fc;
          transition: all 0.25s;
          outline: none;
          appearance: none;
        }
        .pf-input:focus {
          border-color: #0d6efd;
          background: #fff;
          box-shadow: 0 0 0 4px rgba(13,110,253,0.08);
        }
        .pf-input.pf-error { border-color: #e03e3e; background: #fff8f8; }
        .pf-input-wrap { position: relative; }
        .pf-input-icon {
          position: absolute;
          left: 13px; top: 50%;
          transform: translateY(-50%);
          color: #a0aab8;
          font-size: 13px;
        }
        .pf-select { padding-left: 40px; cursor: pointer; }
        .pf-err-msg {
          font-size: 12px;
          color: #e03e3e;
          margin-top: 5px;
          display: flex; align-items: center; gap: 4px;
        }

        /* ── Buttons ── */
        .btn-pf-save {
          border-radius: 10px;
          padding: 12px 28px;
          font-weight: 600;
          font-size: 14px;
          background: linear-gradient(135deg, #0d6efd, #0a58ca);
          color: #fff;
          border: none;
          cursor: pointer;
          transition: all 0.25s;
          letter-spacing: 0.3px;
        }
        .btn-pf-save:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 22px rgba(13,110,253,0.38);
          background: linear-gradient(135deg, #0a58ca, #084298);
        }
        .btn-pf-save:disabled { opacity: 0.7; cursor: not-allowed; }

        /* ── Toast ── */
        .pf-toast {
          border-radius: 10px;
          padding: 12px 16px;
          font-size: 13px;
          font-weight: 500;
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 20px;
          animation: fadeInDown 0.3s ease;
        }
        .pf-toast.success { background: #e9f7ef; border: 1px solid #a8dbb9; color: #1d6a3a; }
        .pf-toast.error   { background: #fff0f0; border: 1px solid #f0a8a8; color: #8b1a1a; }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }

        /* ── Avatar section in form ── */
        .avatar-form-section {
          display: flex; align-items: center; gap: 20px;
          padding: 16px 20px;
          background: #f8f9fc;
          border-radius: 12px;
          border: 2px dashed #dde1ea;
          margin-bottom: 24px;
          transition: border-color 0.2s;
        }
        .avatar-form-section:hover { border-color: #0d6efd; }
        .avatar-form-big {
          width: 72px; height: 72px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid #dde1ea;
          background: #c4cfdf;
          flex-shrink: 0;
        }
        .avatar-form-placeholder {
          width: 72px; height: 72px;
          border-radius: 50%;
          background: linear-gradient(135deg, #0d6efd22, #0a58ca33);
          border: 3px solid #dde1ea;
          display: flex; align-items: center; justify-content: center;
          font-size: 26px; color: #0d6efd;
          flex-shrink: 0;
        }
        .avatar-upload-btn {
          background: #fff;
          border: 2px solid #0d6efd;
          color: #0d6efd;
          border-radius: 8px;
          padding: 7px 16px;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }
        .avatar-upload-btn:hover { background: #0d6efd; color: #fff; }

        /* ── Gender radio ── */
        .gender-radio-group { display: flex; gap: 12px; flex-wrap: wrap; }
        .gender-radio-item { display: none; }
        .gender-radio-label {
          display: flex; align-items: center; gap: 6px;
          padding: 9px 18px;
          border-radius: 10px;
          border: 2px solid #eaecf0;
          background: #f8f9fc;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          color: #5a6275;
          transition: all 0.2s;
          user-select: none;
        }
        .gender-radio-item:checked + .gender-radio-label {
          border-color: #0d6efd;
          background: #eef3ff;
          color: #0d6efd;
          font-weight: 600;
        }
        .gender-radio-label:hover { border-color: #0d6efd33; }

        /* ── Orders tab ── */
        .orders-filter-bar { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:18px; }
        .order-filter-btn {
          border:2px solid #eaecf0; background:#f8f9fc; color:#5a6275;
          border-radius:20px; padding:5px 14px; font-size:12px; font-weight:600;
          cursor:pointer; transition:all 0.2s;
        }
        .order-filter-btn:hover { border-color:#0d6efd44; color:#0d6efd; }
        .order-filter-btn.active { background:#0d6efd; border-color:#0d6efd; color:#fff; }

        .order-card {
          border:1.5px solid #eaecf0; border-radius:14px; margin-bottom:14px;
          background:#fff; transition:box-shadow 0.2s;
          overflow:hidden;
        }
        .order-card:hover { box-shadow:0 4px 20px rgba(13,110,253,0.1); border-color:#0d6efd33; }
        .order-card-head {
          display:flex; justify-content:space-between; align-items:center;
          padding:12px 18px; background:#f8f9fc; border-bottom:1px solid #eaecf0;
          flex-wrap:wrap; gap:8px;
        }
        .order-code { font-size:13px; font-weight:700; color:#2d3748; }
        .order-date { font-size:11px; color:#8590a3; }
        .order-status-badge {
          display:inline-flex; align-items:center; gap:5px;
          padding:4px 10px; border-radius:20px; font-size:11px; font-weight:700;
        }
        .order-card-body { padding:14px 18px; }
        .order-items-preview { display:flex; gap:8px; flex-wrap:wrap; margin-bottom:10px; }
        .order-item-img {
          width:48px; height:48px; object-fit:cover; border-radius:8px;
          border:1px solid #eaecf0; background:#f1f3f7; flex-shrink:0;
        }
        .order-item-img-placeholder {
          width:48px; height:48px; border-radius:8px; border:1px solid #eaecf0;
          background:#f1f3f7; display:flex; align-items:center; justify-content:center;
          color:#adb5bd; font-size:18px; flex-shrink:0;
        }
        .order-card-foot {
          display:flex; justify-content:space-between; align-items:center;
          padding:10px 18px; border-top:1px solid #f0f2f7; gap:10px; flex-wrap:wrap;
        }
        .order-total { font-size:15px; font-weight:700; color:#0d6efd; }
        .order-actions { display:flex; gap:8px; }
        .btn-order-detail {
          background:#fff; border:1.5px solid #0d6efd; color:#0d6efd;
          border-radius:8px; padding:6px 14px; font-size:12px; font-weight:600;
          cursor:pointer; transition:all 0.2s;
        }
        .btn-order-detail:hover { background:#0d6efd; color:#fff; }
        .btn-order-cancel {
          background:#fff5f5; border:1.5px solid #dc3545; color:#dc3545;
          border-radius:8px; padding:6px 14px; font-size:12px; font-weight:600;
          cursor:pointer; transition:all 0.2s;
        }
        .btn-order-cancel:hover { background:#dc3545; color:#fff; }
        .btn-order-cancel:disabled { opacity:0.45; cursor:not-allowed; }

        /* Order detail panel */
        .order-detail-panel {
          background:#fff; border-radius:16px; border:1.5px solid #eaecf0;
          padding:22px; margin-top:4px;
        }
        .order-detail-items .od-item {
          display:flex; gap:12px; align-items:flex-start;
          padding:10px 0; border-bottom:1px solid #f0f2f7;
        }
        .order-detail-items .od-item:last-child { border-bottom:none; }
        .od-item-info { flex:1; }
        .od-item-name { font-size:13px; font-weight:600; color:#2d3748; }
        .od-item-sku { font-size:11px; color:#8590a3; margin-top:1px; }
        .od-item-price { font-size:13px; font-weight:700; color:#0d6efd; white-space:nowrap; }

        .order-timeline { list-style:none; padding:0; margin:0; }
        .order-timeline li {
          position:relative; padding:0 0 14px 26px;
          font-size:12px; color:#5a6275;
        }
        .order-timeline li::before {
          content:''; position:absolute; left:7px; top:7px;
          bottom:-1px; width:2px; background:#e5e7eb;
        }
        .order-timeline li:last-child::before { display:none; }
        .order-timeline li::after {
          content:''; position:absolute; left:4px; top:4px;
          width:8px; height:8px; border-radius:50%;
          background:#0d6efd; border:2px solid #fff;
          box-shadow:0 0 0 2px #0d6efd44;
        }
        .tl-label { font-weight:600; color:#2d3748; }
        .tl-time { color:#adb5bd; font-size:11px; margin-top:2px; }
        .tl-note { color:#8590a3; font-style:italic; }

        /* Overlay modal */
        .cancel-overlay {
          position:fixed; inset:0; background:rgba(0,0,0,0.45);
          display:flex; align-items:center; justify-content:center; z-index:9999;
          animation:fadeIn 0.15s ease;
        }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .cancel-modal {
          background:#fff; border-radius:20px; padding:28px; width:420px;
          max-width:92vw; box-shadow:0 20px 60px rgba(0,0,0,0.18);
          animation:slideUp 0.2s ease;
        }
        @keyframes slideUp { from{transform:translateY(20px);opacity:0} to{transform:translateY(0);opacity:1} }
        .cancel-modal h6 { font-size:16px; font-weight:700; color:#1a1d23; margin:0 0 6px; }
        .cancel-modal p { font-size:13px; color:#6c757d; margin:0 0 16px; }
        .cancel-textarea {
          width:100%; border:2px solid #eaecf0; border-radius:10px;
          padding:10px 12px; font-size:13px; resize:vertical;
          min-height:80px; outline:none; transition:border-color 0.2s;
          font-family:inherit; background:#f8f9fc; box-sizing:border-box;
        }
        .cancel-textarea:focus { border-color:#dc3545; background:#fff; }
        .cancel-modal-btns { display:flex; justify-content:flex-end; gap:10px; margin-top:16px; }
        .btn-cancel-cancel {
          background:#f8f9fa; border:1.5px solid #dee2e6; color:#5a6275;
          border-radius:8px; padding:9px 20px; font-size:13px; font-weight:600;
          cursor:pointer; transition:all 0.2s;
        }
        .btn-cancel-cancel:hover { background:#e9ecef; }
        .btn-cancel-confirm {
          background:linear-gradient(135deg,#dc3545,#b02a37);
          border:none; color:#fff; border-radius:8px;
          padding:9px 20px; font-size:13px; font-weight:600;
          cursor:pointer; transition:all 0.2s;
        }
        .btn-cancel-confirm:disabled { opacity:0.65; cursor:not-allowed; }
        .order-empty {
          text-align:center; padding:50px 20px; color:#adb5bd;
        }
        .order-empty i { font-size:48px; margin-bottom:12px; display:block; }
        .order-pagination { display:flex; justify-content:center; gap:6px; margin-top:16px; }
        .order-page-btn {
          width:34px; height:34px; border-radius:8px;
          border:1.5px solid #eaecf0; background:#fff;
          font-size:13px; font-weight:600; color:#5a6275;
          cursor:pointer; transition:all 0.2s;
          display:flex; align-items:center; justify-content:center;
        }
        .order-page-btn:hover { border-color:#0d6efd; color:#0d6efd; }
        .order-page-btn.active { background:#0d6efd; border-color:#0d6efd; color:#fff; }
        .order-page-btn:disabled { opacity:0.4; cursor:not-allowed; }
      `}</style>

      <div className="profile-page">
        <div className="container">

          {/* Breadcrumb */}
          <div className="profile-breadcrumb">
            <Link to="/">Trang chủ</Link>
            <span className="sep">/</span>
            <span className="current">Tài khoản của tôi</span>
          </div>

          <div className="row g-4">

            {/* ── SIDEBAR ── */}
            <div className="col-lg-3 col-md-4">
              <div className="profile-sidebar">

                {/* Avatar */}
                <div className="text-center" style={{ position: 'relative', zIndex: 1 }}>
                  <div className="avatar-wrapper mx-auto">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="avatar" className="avatar-img" />
                    ) : (
                      <div className="avatar-placeholder">
                        <i className="fas fa-user" />
                      </div>
                    )}
                    <button
                      className="avatar-edit-btn"
                      title="Đổi ảnh đại diện"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <i className="fas fa-camera" />
                    </button>
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      onChange={handleAvatarChange}
                    />
                  </div>

                  <div className="sidebar-username">{user.fullname}</div>
                  <div className="sidebar-email">{user.email}</div>
                  <div className="text-center mb-2">
                    <span className="sidebar-role">{user.role}</span>
                  </div>
                </div>

                <hr className="sidebar-divider" />

                {/* Nav */}
                <ul className="sidebar-nav" style={{ position: 'relative', zIndex: 1 }}>
                  <li>
                    <button
                      className={`sidebar-nav-btn ${activeTab === 'info' ? 'active' : ''}`}
                      onClick={() => setActiveTab('info')}
                    >
                      <i className="fas fa-user-circle" />
                      Thông tin cá nhân
                    </button>
                  </li>
                  <li>
                    <button
                      className={`sidebar-nav-btn ${activeTab === 'password' ? 'active' : ''}`}
                      onClick={() => setActiveTab('password')}
                    >
                      <i className="fas fa-lock" />
                      Đổi mật khẩu
                    </button>
                  </li>
                  <li>
                    <button
                      className={`sidebar-nav-btn ${activeTab === 'orders' ? 'active' : ''}`}
                      onClick={() => setActiveTab('orders')}
                    >
                      <i className="fas fa-shopping-bag" />
                      Đơn hàng của tôi
                    </button>
                  </li>
                  <li>
                    <button
                      className="sidebar-nav-btn logout-btn"
                      onClick={logout}
                    >
                      <i className="fas fa-sign-out-alt" />
                      Đăng xuất
                    </button>
                  </li>
                </ul>
              </div>
            </div>

            {/* ── CONTENT ── */}
            <div className="col-lg-9 col-md-8">
              <div className="profile-card">

                {/* ── Tab: Thông tin cá nhân ── */}
                {activeTab === 'info' && (
                  <>
                    <div className="profile-card-header">
                      <h5><i className="fas fa-user-circle me-2 text-primary" style={{ fontSize: '16px' }} />Thông tin cá nhân</h5>
                      <p>Cập nhật ảnh và thông tin cơ bản của bạn</p>
                    </div>
                    <div className="profile-card-body">

                      {/* Toast */}
                      {saveSuccess && (
                        <div className="pf-toast success">
                          <i className="fas fa-check-circle" />{saveSuccess}
                        </div>
                      )}
                      {saveError && (
                        <div className="pf-toast error">
                          <i className="fas fa-exclamation-circle" />{saveError}
                        </div>
                      )}

                      {/* Avatar upload row */}
                      <div className="avatar-form-section">
                        {avatarPreview ? (
                          <img src={avatarPreview} alt="avatar" className="avatar-form-big" />
                        ) : (
                          <div className="avatar-form-placeholder">
                            <i className="fas fa-user" />
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '14px', color: '#2d3748', marginBottom: '4px' }}>
                            Ảnh đại diện
                          </div>
                          <div style={{ fontSize: '12px', color: '#8590a3', marginBottom: '10px' }}>
                            JPG, PNG tối đa 5MB
                          </div>
                          <button
                            type="button"
                            className="avatar-upload-btn"
                            onClick={() => fileInputRef.current?.click()}
                          >
                            <i className="fas fa-upload me-1" />Tải ảnh lên
                          </button>
                        </div>
                      </div>

                      <form onSubmit={handleInfo(onSaveInfo)}>
                        <div className="row g-3">

                          {/* Họ tên */}
                          <div className="col-md-6">
                            <label className="pf-label">
                              Họ và tên <span className="text-danger">*</span>
                            </label>
                            <div className="pf-input-wrap">
                              <i className="fas fa-user pf-input-icon" />
                              <input
                                type="text"
                                className={`pf-input ${errInfo.name ? 'pf-error' : ''}`}
                                placeholder="Nguyễn Văn A"
                                {...regInfo('name', {
                                  required: 'Vui lòng nhập họ tên',
                                  minLength: { value: 2, message: 'Tên phải có ít nhất 2 ký tự' },
                                })}
                              />
                            </div>
                            {errInfo.name && (
                              <div className="pf-err-msg">
                                <i className="fas fa-exclamation-circle" />{errInfo.name.message}
                              </div>
                            )}
                          </div>

                          {/* Email */}
                          <div className="col-md-6">
                            <label className="pf-label">
                              Email <span className="text-danger">*</span>
                            </label>
                            <div className="pf-input-wrap">
                              <i className="fas fa-envelope pf-input-icon" />
                              <input
                                type="email"
                                className={`pf-input ${errInfo.email ? 'pf-error' : ''}`}
                                placeholder="example@email.com"
                                {...regInfo('email', {
                                  required: 'Vui lòng nhập email',
                                  pattern: { value: /^\S+@\S+\.\S+$/, message: 'Email không hợp lệ' },
                                })}
                              />
                            </div>
                            {errInfo.email && (
                              <div className="pf-err-msg">
                                <i className="fas fa-exclamation-circle" />{errInfo.email.message}
                              </div>
                            )}
                          </div>

                          {/* Số điện thoại */}
                          <div className="col-md-6">
                            <label className="pf-label">Số điện thoại</label>
                            <div className="pf-input-wrap">
                              <i className="fas fa-phone pf-input-icon" />
                              <input
                                type="tel"
                                className={`pf-input ${errInfo.phone ? 'pf-error' : ''}`}
                                placeholder="0912 345 678"
                                {...regInfo('phone', {
                                  pattern: { value: /^[0-9]{9,11}$/, message: 'Số điện thoại không hợp lệ' },
                                })}
                              />
                            </div>
                            {errInfo.phone && (
                              <div className="pf-err-msg">
                                <i className="fas fa-exclamation-circle" />{errInfo.phone.message}
                              </div>
                            )}
                          </div>

                          {/* Giới tính */}
                          <div className="col-md-6">
                            <label className="pf-label">Giới tính</label>
                            <div className="gender-radio-group" style={{ paddingTop: '4px' }}>
                              {[
                                { value: 'male', label: 'Nam', icon: 'fa-mars' },
                                { value: 'female', label: 'Nữ', icon: 'fa-venus' },
                                { value: 'other', label: 'Khác', icon: 'fa-genderless' },
                              ].map(({ value, label, icon }) => (
                                <React.Fragment key={value}>
                                  <input
                                    type="radio"
                                    id={`gender-${value}`}
                                    value={value}
                                    className="gender-radio-item"
                                    {...regInfo('gender')}
                                  />
                                  <label htmlFor={`gender-${value}`} className="gender-radio-label">
                                    <i className={`fas ${icon}`} style={{ fontSize: '12px' }} />
                                    {label}
                                  </label>
                                </React.Fragment>
                              ))}
                            </div>
                          </div>

                          {/* Submit */}
                          <div className="col-12 d-flex justify-content-end" style={{ marginTop: '8px' }}>
                            <button
                              type="submit"
                              className="btn-pf-save"
                              disabled={submittingInfo}
                            >
                              {submittingInfo ? (
                                <><span className="spinner-border spinner-border-sm me-2" />Đang lưu...</>
                              ) : (
                                <><i className="fas fa-save me-2" />Lưu thay đổi</>
                              )}
                            </button>
                          </div>

                        </div>
                      </form>
                    </div>
                  </>
                )}

                {/* ── Tab: Đổi mật khẩu ── */}
                {activeTab === 'password' && (
                  <>
                    <div className="profile-card-header">
                      <h5><i className="fas fa-lock me-2 text-primary" style={{ fontSize: '16px' }} />Đổi mật khẩu</h5>
                      <p>Đảm bảo tài khoản sử dụng mật khẩu mạnh và khó đoán</p>
                    </div>
                    <div className="profile-card-body">

                      {/* Toast */}
                      {saveSuccess && (
                        <div className="pf-toast success">
                          <i className="fas fa-check-circle" />{saveSuccess}
                        </div>
                      )}
                      {saveError && (
                        <div className="pf-toast error">
                          <i className="fas fa-exclamation-circle" />{saveError}
                        </div>
                      )}

                      <form onSubmit={handlePwd(onSavePassword)}>
                        <div className="row g-3" style={{ maxWidth: '520px' }}>

                          {/* Mật khẩu hiện tại */}
                          <div className="col-12">
                            <label className="pf-label">
                              Mật khẩu hiện tại <span className="text-danger">*</span>
                            </label>
                            <div className="pf-input-wrap">
                              <i className="fas fa-lock pf-input-icon" />
                              <input
                                type="password"
                                className={`pf-input ${errPwd.currentPassword ? 'pf-error' : ''}`}
                                placeholder="Nhập mật khẩu hiện tại"
                                {...regPwd('currentPassword', { required: 'Vui lòng nhập mật khẩu hiện tại' })}
                              />
                            </div>
                            {errPwd.currentPassword && (
                              <div className="pf-err-msg">
                                <i className="fas fa-exclamation-circle" />{errPwd.currentPassword.message}
                              </div>
                            )}
                          </div>

                          {/* Mật khẩu mới */}
                          <div className="col-12">
                            <label className="pf-label">
                              Mật khẩu mới <span className="text-danger">*</span>
                            </label>
                            <div className="pf-input-wrap">
                              <i className="fas fa-key pf-input-icon" />
                              <input
                                type="password"
                                className={`pf-input ${errPwd.newPassword ? 'pf-error' : ''}`}
                                placeholder="Tối thiểu 6 ký tự"
                                {...regPwd('newPassword', {
                                  required: 'Vui lòng nhập mật khẩu mới',
                                  minLength: { value: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' },
                                })}
                              />
                            </div>
                            {errPwd.newPassword && (
                              <div className="pf-err-msg">
                                <i className="fas fa-exclamation-circle" />{errPwd.newPassword.message}
                              </div>
                            )}
                          </div>

                          {/* Xác nhận mật khẩu mới */}
                          <div className="col-12">
                            <label className="pf-label">
                              Xác nhận mật khẩu mới <span className="text-danger">*</span>
                            </label>
                            <div className="pf-input-wrap">
                              <i className="fas fa-shield-alt pf-input-icon" />
                              <input
                                type="password"
                                className={`pf-input ${errPwd.confirmPassword ? 'pf-error' : ''}`}
                                placeholder="Nhập lại mật khẩu mới"
                                {...regPwd('confirmPassword', {
                                  required: 'Vui lòng xác nhận mật khẩu',
                                  validate: val => val === newPasswordValue || 'Mật khẩu xác nhận không khớp',
                                })}
                              />
                            </div>
                            {errPwd.confirmPassword && (
                              <div className="pf-err-msg">
                                <i className="fas fa-exclamation-circle" />{errPwd.confirmPassword.message}
                              </div>
                            )}
                          </div>

                          {/* Hint */}
                          <div className="col-12">
                            <div style={{
                              background: '#f0f4ff',
                              border: '1px solid #d0dcff',
                              borderRadius: '10px',
                              padding: '12px 16px',
                              fontSize: '12.5px',
                              color: '#4a5a8a',
                            }}>
                              <i className="fas fa-info-circle me-2 text-primary" />
                              Mật khẩu mạnh nên có ít nhất 8 ký tự, gồm chữ hoa, chữ thường và số.
                            </div>
                          </div>

                          {/* Submit */}
                          <div className="col-12 d-flex justify-content-end" style={{ marginTop: '4px' }}>
                            <button
                              type="submit"
                              className="btn-pf-save"
                              disabled={submittingPwd}
                            >
                              {submittingPwd ? (
                                <><span className="spinner-border spinner-border-sm me-2" />Đang cập nhật...</>
                              ) : (
                                <><i className="fas fa-key me-2" />Cập nhật mật khẩu</>
                              )}
                            </button>
                          </div>

                        </div>
                      </form>
                    </div>
                  </>
                )}

                {/* ── Tab: Đơn hàng ── */}
                {activeTab === 'orders' && (
                  <>
                    <div className="profile-card-header">
                      <h5><i className="fas fa-shopping-bag me-2 text-primary" style={{ fontSize:'16px' }} />Đơn hàng của tôi</h5>
                      <p>Theo dõi và quản lý tất cả đơn hàng bạn đã đặt</p>
                    </div>
                    <div className="profile-card-body">

                      {/* Toasts */}
                      {orderSuccess && <div className="pf-toast success"><i className="fas fa-check-circle" />{orderSuccess}</div>}
                      {orderError   && <div className="pf-toast error"><i className="fas fa-exclamation-circle" />{orderError}</div>}

                      {/* Filter bar */}
                      <div className="orders-filter-bar">
                        {[{ key:'', label:'Tất cả' }, ...Object.entries(ORDER_STATUS_CFG).map(([k,v]) => ({ key:k, label:v.label }))]
                          .map(f => (
                            <button
                              key={f.key}
                              className={`order-filter-btn ${orderStatusFilter === f.key ? 'active' : ''}`}
                              onClick={() => { setOrderStatusFilter(f.key); fetchOrders(1, f.key); }}
                            >{f.label}</button>
                          ))}
                      </div>

                      {/* Loading */}
                      {orderLoading ? (
                        <div style={{ textAlign:'center', padding:'40px 0' }}>
                          <span className="spinner-border text-primary" />
                        </div>
                      ) : orders.length === 0 ? (
                        <div className="order-empty">
                          <i className="fas fa-box-open" />
                          <div style={{ fontWeight:600, fontSize:15, color:'#5a6275' }}>Chưa có đơn hàng nào</div>
                          <div style={{ fontSize:13, marginTop:4 }}>Hãy khám phá các sản phẩm và đặt hàng ngay!</div>
                          <Link to="/" style={{ display:'inline-block', marginTop:14 }}>
                            <button className="btn-pf-save" style={{ padding:'10px 24px', fontSize:13 }}>
                              <i className="fas fa-shopping-cart me-2" />Mua sắm ngay
                            </button>
                          </Link>
                        </div>
                      ) : (
                        <>
                          {/* Two-column layout on large screen */}
                          <div className={selectedOrder ? 'row g-3' : ''}>
                            <div className={selectedOrder ? 'col-lg-5' : ''}>
                              {orders.map(order => {
                                const cfg = ORDER_STATUS_CFG[order.status] ?? { color:'#64748b', bg:'#f8fafc', label: order.status, icon:'fa-circle' };
                                return (
                                  <div key={order.id} className="order-card">
                                    <div className="order-card-head">
                                      <div>
                                        <div className="order-code">#{order.order_code}</div>
                                        <div className="order-date">{order.created_at}</div>
                                      </div>
                                      <span className="order-status-badge" style={{ color: cfg.color, background: cfg.bg }}>
                                        <i className={`fas ${cfg.icon}`} />{cfg.label}
                                      </span>
                                    </div>
                                    <div className="order-card-body">
                                      <div className="order-items-preview">
                                        {(order.items ?? []).slice(0, 4).map((item, i) =>
                                          item.product_image
                                            ? <img key={i} src={item.product_image} alt={item.product_name} className="order-item-img" />
                                            : <div key={i} className="order-item-img-placeholder"><i className="fas fa-box" /></div>
                                        )}
                                        {(order.items?.length ?? 0) > 4 && (
                                          <div className="order-item-img-placeholder" style={{ fontSize:12, fontWeight:700 }}>
                                            +{(order.items?.length ?? 0) - 4}
                                          </div>
                                        )}
                                      </div>
                                      {order.cancelled_reason && (
                                        <div style={{ fontSize:12, color:'#b91c1c', marginTop:4 }}>
                                          <i className="fas fa-info-circle me-1" />Lý do: {order.cancelled_reason}
                                        </div>
                                      )}
                                    </div>
                                    <div className="order-card-foot">
                                      <span className="order-total">{formatVND(order.total_amount)}</span>
                                      <div className="order-actions">
                                        <button
                                          className="btn-order-detail"
                                          onClick={() => openOrderDetail(order)}
                                        >
                                          <i className="fas fa-eye me-1" />Chi tiết
                                        </button>
                                        {canCancel(order.status) && (
                                          <button
                                            className="btn-order-cancel"
                                            onClick={() => { setCancelModalOrder(order); setCancelReason(''); }}
                                          >
                                            <i className="fas fa-times me-1" />Hủy đơn
                                          </button>
                                        )}
                                        {['confirmed','processing','shipping'].includes(order.status) && (
                                          <span style={{ fontSize:11, color:'#8590a3', alignSelf:'center' }}>
                                            <i className="fas fa-lock me-1" />Không thể hủy
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Pagination */}
                              {orderTotal > 5 && (
                                <div className="order-pagination">
                                  <button
                                    className="order-page-btn"
                                    disabled={orderPage <= 1}
                                    onClick={() => fetchOrders(orderPage - 1)}
                                  ><i className="fas fa-chevron-left" /></button>
                                  {Array.from({ length: Math.ceil(orderTotal / 5) }, (_, i) => i + 1).map(p => (
                                    <button
                                      key={p}
                                      className={`order-page-btn ${p === orderPage ? 'active' : ''}`}
                                      onClick={() => fetchOrders(p)}
                                    >{p}</button>
                                  ))}
                                  <button
                                    className="order-page-btn"
                                    disabled={orderPage >= Math.ceil(orderTotal / 5)}
                                    onClick={() => fetchOrders(orderPage + 1)}
                                  ><i className="fas fa-chevron-right" /></button>
                                </div>
                              )}
                            </div>

                            {/* Detail panel */}
                            {selectedOrder && (
                              <div className="col-lg-7">
                                <div className="order-detail-panel">
                                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                                    <div>
                                      <div style={{ fontWeight:700, fontSize:15, color:'#1a1d23' }}>#{selectedOrder.order_code}</div>
                                      <div style={{ fontSize:12, color:'#8590a3' }}>{selectedOrder.created_at}</div>
                                    </div>
                                    <button
                                      style={{ background:'none', border:'none', cursor:'pointer', color:'#8590a3', fontSize:18 }}
                                      onClick={() => setSelectedOrder(null)}
                                    ><i className="fas fa-times" /></button>
                                  </div>

                                  {detailLoading ? (
                                    <div style={{ textAlign:'center', padding:30 }}><span className="spinner-border text-primary" /></div>
                                  ) : (
                                    <>
                                      {/* Shipping */}
                                      <div style={{ background:'#f8f9fc', borderRadius:10, padding:'12px 14px', marginBottom:14 }}>
                                        <div style={{ fontSize:12, fontWeight:700, color:'#3d4555', marginBottom:8 }}>
                                          <i className="fas fa-map-marker-alt me-2 text-primary" />Địa chỉ giao hàng
                                        </div>
                                        <div style={{ fontSize:13, fontWeight:600 }}>{selectedOrder.shipping?.fullname}</div>
                                        <div style={{ fontSize:12, color:'#6c757d' }}>{selectedOrder.shipping?.phone}</div>
                                        <div style={{ fontSize:12, color:'#6c757d', marginTop:2 }}>
                                          {[selectedOrder.shipping?.address, selectedOrder.shipping?.ward, selectedOrder.shipping?.district, selectedOrder.shipping?.province].filter(Boolean).join(', ')}
                                        </div>
                                      </div>

                                      {/* Items */}
                                      {selectedOrder.items && selectedOrder.items.length > 0 && (
                                        <div className="order-detail-items" style={{ marginBottom:14 }}>
                                          <div style={{ fontSize:12, fontWeight:700, color:'#3d4555', marginBottom:8 }}>
                                            <i className="fas fa-box me-2 text-primary" />Sản phẩm ({selectedOrder.items.length})
                                          </div>
                                          {selectedOrder.items.map((item, i) => (
                                            <div key={i} className="od-item">
                                              {item.product_image
                                                ? <img src={item.product_image} alt={item.product_name} className="order-item-img" />
                                                : <div className="order-item-img-placeholder"><i className="fas fa-box" /></div>
                                              }
                                              <div className="od-item-info">
                                                <div className="od-item-name">{item.product_name}</div>
                                                {item.product_sku && <div className="od-item-sku">SKU: {item.product_sku}</div>}
                                                {item.variant_info && Object.entries(item.variant_info).map(([k,v]) => (
                                                  <span key={k} style={{ fontSize:11, background:'#eaecf0', borderRadius:10, padding:'1px 7px', marginRight:4 }}>{k}: {v}</span>
                                                ))}
                                                <div style={{ fontSize:12, color:'#8590a3', marginTop:3 }}>
                                                  {formatVND(item.price)} × {item.quantity}
                                                </div>
                                              </div>
                                              <div className="od-item-price">{formatVND(item.total)}</div>
                                            </div>
                                          ))}
                                          {/* Tổng */}
                                          <div style={{ background:'#f0f4ff', borderRadius:10, padding:'10px 14px', marginTop:10 }}>
                                            {selectedOrder.discount_amount > 0 && (
                                              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                                                <span style={{ color:'#6c757d' }}>Giảm giá</span>
                                                <span style={{ color:'#16a34a' }}>– {formatVND(selectedOrder.discount_amount)}</span>
                                              </div>
                                            )}
                                            {selectedOrder.voucher_code && (
                                              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                                                <span style={{ color:'#6c757d' }}>Voucher ({selectedOrder.voucher_code})</span>
                                                <span style={{ color:'#16a34a' }}>– {formatVND(selectedOrder.voucher_discount ?? 0)}</span>
                                              </div>
                                            )}
                                            {selectedOrder.shipping_fee > 0 && (
                                              <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, marginBottom:4 }}>
                                                <span style={{ color:'#6c757d' }}>Phí giao hàng</span>
                                                <span>{formatVND(selectedOrder.shipping_fee)}</span>
                                              </div>
                                            )}
                                            <div style={{ display:'flex', justifyContent:'space-between', fontWeight:700, fontSize:14, borderTop:'1px solid #dde3f2', paddingTop:8, marginTop:4 }}>
                                              <span>Tổng cộng</span>
                                              <span style={{ color:'#0d6efd' }}>{formatVND(selectedOrder.total_amount)}</span>
                                            </div>
                                          </div>
                                        </div>
                                      )}

                                      {/* Payment & status */}
                                      <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:14 }}>
                                        {(() => {
                                          const cfg = ORDER_STATUS_CFG[selectedOrder.status] ?? { color:'#64748b', bg:'#f8fafc', label:selectedOrder.status, icon:'fa-circle' };
                                          return (
                                            <span className="order-status-badge" style={{ color:cfg.color, background:cfg.bg }}>
                                              <i className={`fas ${cfg.icon}`} />{cfg.label}
                                            </span>
                                          );
                                        })()}
                                        {(() => {
                                          const pc = PAYMENT_STATUS_CFG[selectedOrder.payment_status] ?? { color:'#6b7280', label: selectedOrder.payment_status };
                                          return (
                                            <span style={{ fontSize:11, fontWeight:700, color:pc.color, background:'#f8f9fa', border:`1.5px solid ${pc.color}44`, borderRadius:20, padding:'4px 10px' }}>
                                              {pc.label}
                                            </span>
                                          );
                                        })()}
                                        {selectedOrder.tracking_code && (
                                          <span style={{ fontSize:11, color:'#5a6275', background:'#f0f4ff', border:'1.5px solid #d0dcff', borderRadius:20, padding:'4px 10px' }}>
                                            <i className="fas fa-truck me-1" />{selectedOrder.tracking_code}
                                          </span>
                                        )}
                                      </div>

                                      {/* Cancel button in detail */}
                                      {canCancel(selectedOrder.status) && (
                                        <button
                                          className="btn-order-cancel"
                                          style={{ width:'100%', marginBottom:14 }}
                                          onClick={() => { setCancelModalOrder(selectedOrder); setCancelReason(''); }}
                                        >
                                          <i className="fas fa-times-circle me-2" />Hủy đơn hàng này
                                        </button>
                                      )}

                                      {/* Status history timeline */}
                                      {selectedOrder.status_history && selectedOrder.status_history.length > 0 && (
                                        <div>
                                          <div style={{ fontSize:12, fontWeight:700, color:'#3d4555', marginBottom:10 }}>
                                            <i className="fas fa-history me-2 text-primary" />Lịch sử trạng thái
                                          </div>
                                          <ul className="order-timeline">
                                            {selectedOrder.status_history.map((h, i) => {
                                              const toCfg = ORDER_STATUS_CFG[h.to];
                                              return (
                                                <li key={i}>
                                                  <span className="tl-label">
                                                    {ORDER_STATUS_CFG[h.from]?.label ?? h.from} → {toCfg?.label ?? h.to}
                                                  </span>
                                                  {h.note && <div className="tl-note">{h.note}</div>}
                                                  <div className="tl-time">{h.created_at}</div>
                                                </li>
                                              );
                                            })}
                                          </ul>
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  </>
                )}

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Cancel Confirmation Modal ── */}
      {cancelModalOrder && (
        <div className="cancel-overlay" onClick={(e) => { if (e.target === e.currentTarget) setCancelModalOrder(null); }}>
          <div className="cancel-modal">
            <h6><i className="fas fa-exclamation-triangle me-2" style={{ color:'#dc3545' }} />Xác nhận hủy đơn hàng</h6>
            <p>Đơn hàng <strong>#{cancelModalOrder.order_code}</strong> sẽ bị hủy và không thể khôi phục. Các ưu đãi hoặc mã giảm giá đã áp dụng cho đơn hàng này có thể sẽ không còn hiệu lực cho đơn sau.</p>
            <textarea
              className="cancel-textarea"
              placeholder="Lý do hủy (không bắt buộc)..."
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
            />
            <div className="cancel-modal-btns">
              <button
                className="btn-cancel-cancel"
                onClick={() => setCancelModalOrder(null)}
                disabled={cancelLoading}
              >
                Không hủy
              </button>
              <button
                className="btn-cancel-confirm"
                onClick={handleCancelOrder}
                disabled={cancelLoading}
              >
                {cancelLoading
                  ? <><span className="spinner-border spinner-border-sm me-2" />Đang hủy...</>
                  : <><i className="fas fa-times-circle me-2" />Xác nhận hủy</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ProfilePage;

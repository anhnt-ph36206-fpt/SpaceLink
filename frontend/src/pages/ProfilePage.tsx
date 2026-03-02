import React, { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../context/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import type { User } from '../types/user';

type ProfileForm = {
  fullname: string;
  email: string;
  phone: string;
  gender: string;
};

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const ProfilePage: React.FC = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'info' | 'password'>('info');
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
      fullname: user?.fullname || '',
      email: user?.email || '',
      phone: user?.phone || '',
      gender: user?.gender || '',
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
      const updatedUser: User = {
        ...user,
        fullname: data.fullname,
        email: data.email,
        phone: data.phone,
        gender: data.gender,
        avatar: avatarPreview,
      };
      const res = await fetch(`http://localhost:3000/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullname: data.fullname,
          email: data.email,
          phone: data.phone,
          gender: data.gender,
          avatar: avatarPreview,
        }),
      });
      if (!res.ok) throw new Error('Update failed');
      updateUser(updatedUser);
      showToast('Cập nhật thông tin thành công!', 'success');
    } catch {
      showToast('Đã có lỗi xảy ra, vui lòng thử lại!', 'error');
    }
  };

  const onSavePassword = async (data: PasswordForm) => {
    if (!user) return;
    try {

      const verifiRes = await fetch('http://localhost:3000/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email, // email của user đang đăng nhập
          password: data.currentPassword // mật khẩu hiện tại
        }),
        })
        if(!verifiRes.ok){
          showToast('Mật khẩu hiện tại không đúng!', 'error');
          return;
        }

        const {accessToken} = await verifiRes.json();
        const token = accessToken || localStorage.getItem('token') || '';   // lấy token từ response hoặc từ local storage
      
         //gủi request đổi mật khẩu.
         const res = await fetch(`http://localhost:3000/users/${user.id}`,{
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
          body: JSON.stringify({ password: data.newPassword }),
        })
        
      if (!res.ok) throw new Error('Update failed');
      updateUser({ ...user, password: data.newPassword });
      resetPwd();
      showToast('Đổi mật khẩu thành công!', 'success');
      }  
     catch {
      showToast('Đã có lỗi xảy ra, vui lòng thử lại!', 'error');
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
                                className={`pf-input ${errInfo.fullname ? 'pf-error' : ''}`}
                                placeholder="Nguyễn Văn A"
                                {...regInfo('fullname', {
                                  required: 'Vui lòng nhập họ tên',
                                  minLength: { value: 2, message: 'Tên phải có ít nhất 2 ký tự' },
                                })}
                              />
                            </div>
                            {errInfo.fullname && (
                              <div className="pf-err-msg">
                                <i className="fas fa-exclamation-circle" />{errInfo.fullname.message}
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

              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfilePage;

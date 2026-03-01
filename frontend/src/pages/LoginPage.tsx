import React from 'react';
import { useForm } from 'react-hook-form';
import type { User } from '../types/user';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';

type LoginForm = {
  email: string;
  password: string;
};

const LoginPage: React.FC = () => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>();
  const { login } = useAuth();

  const onLogin = async (data: LoginForm) => {
    try {
      const res = await fetch(`http://localhost:3000/users?email=${data.email}&password=${data.password}`);
      const users: User[] = await res.json();

      if (users.length === 0) {
        alert('Email hoặc mật khẩu không đúng!');
        return;
      }

      const user = users[0];
      const token = btoa(JSON.stringify({ email: user.email, password: user.password, role: user.role }));
      login(token, user);
    } catch (error) {
      console.error(error);
      alert('Đã có lỗi xảy ra, vui lòng thử lại!');
    }
  };

  return (
    <>
      {/* Custom styles scoped via inline */}
      <style>{`
        .auth-page { min-height: 100vh; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); }
        .auth-card { border: none; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.12); overflow: hidden; }
        .auth-left { background: linear-gradient(160deg, #ffb347 0%, #f28b00 50%, #c96f00 100%); min-height: 500px; position: relative; }
        .auth-left::after { content:''; position:absolute; bottom:0; left:0; right:0; height:6px; background: linear-gradient(90deg,#ffc107,#fd7e14,#ffc107); }
        .auth-brand-icon { width:70px; height:70px; background:rgba(255,255,255,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(10px); border:2px solid rgba(255,255,255,0.3); }
        .feature-item { background:rgba(255,255,255,0.1); border-radius:10px; padding:12px 16px; backdrop-filter:blur(5px); border:1px solid rgba(255,255,255,0.2); }
        .form-control-custom { border-radius: 10px; border: 2px solid #e9ecef; padding: 12px 16px; font-size: 14px; transition: all 0.3s ease; background:#f8f9fa; }
        .form-control-custom:focus { border-color: #0d6efd; background: #fff; box-shadow: 0 0 0 4px rgba(13,110,253,0.1); }
        .form-control-custom.is-invalid { border-color: #dc3545; background: #fff8f8; }
        .input-icon-wrapper { position: relative; }
        .input-icon { position:absolute; left:14px; top:50%; transform:translateY(-50%); color: #adb5bd; z-index:1; font-size:14px; }
        .form-control-custom.with-icon { padding-left: 40px; }
        .btn-login { border-radius: 10px; padding: 13px; font-weight: 600; font-size: 15px; letter-spacing: 0.5px; transition: all 0.3s ease; background: linear-gradient(135deg,#0d6efd,#0a58ca); border:none; }
        .btn-login:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(13,110,253,0.4); background: linear-gradient(135deg,#0a58ca,#084298); }
        .btn-social { border-radius: 10px; padding: 11px; font-size:14px; font-weight:500; border: 2px solid #e9ecef; background:#fff; color:#495057; transition:all 0.2s; }
        .btn-social:hover { border-color:#0d6efd; color:#0d6efd; background:#f0f4ff; }
        .divider { display:flex; align-items:center; gap:12px; color:#adb5bd; font-size:13px; }
        .divider::before, .divider::after { content:''; flex:1; height:1px; background:#e9ecef; }
        .auth-link { color:linear-gradient(160deg, #ffb347 0%, #f28b00 50%, #c96f00 100%); text-decoration:none; font-weight:600; }
        .auth-link:hover { color:linear-gradient(160deg, #ff9f1c 0%, #d97700 50%, #a85d00 100%); text-decoration:underline; }
        .floating-shape { position:absolute; border-radius:50%; opacity:0.08; background:#fff; }
      `}</style>

      <div className="auth-page d-flex align-items-center py-5">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-xl-10 col-lg-11">
              <div className="card auth-card">
                <div className="row g-0">

                  {/* Left Panel */}
                  <div className="col-lg-5 auth-left d-flex flex-column justify-content-between p-5">
                    {/* Floating decorative shapes */}
                    <div className="floating-shape" style={{width:200,height:200,top:-80,right:-60}}></div>
                    <div className="floating-shape" style={{width:130,height:130,bottom:60,left:-50}}></div>

                    <div>
                      <div className="auth-brand-icon mb-4">
                        <i className="fas fa-shopping-bag text-white fs-4"></i>
                      </div>
                      <h2 className="text-white fw-bold mb-2">Chào mừng trở lại!</h2>
                      <p className="text-white-50 mb-5">Đăng nhập để tiếp tục mua sắm và theo dõi đơn hàng của bạn.</p>

                      <div className="d-flex flex-column gap-3">
                        <div className="feature-item d-flex align-items-center gap-3">
                          <i className="fas fa-truck text-warning fs-5"></i>
                          <div>
                            <div className="text-white fw-semibold" style={{fontSize:'13px'}}>Miễn phí vận chuyển</div>
                            <div className="text-white-50" style={{fontSize:'12px'}}>Cho đơn hàng từ 500.000đ</div>
                          </div>
                        </div>
                        <div className="feature-item d-flex align-items-center gap-3">
                          <i className="fas fa-shield-alt text-warning fs-5"></i>
                          <div>
                            <div className="text-white fw-semibold" style={{fontSize:'13px'}}>Bảo mật tuyệt đối</div>
                            <div className="text-white-50" style={{fontSize:'12px'}}>Thông tin được mã hóa SSL</div>
                          </div>
                        </div>
                        <div className="feature-item d-flex align-items-center gap-3">
                          <i className="fas fa-undo-alt text-warning fs-5"></i>
                          <div>
                            <div className="text-white fw-semibold" style={{fontSize:'13px'}}>Đổi trả dễ dàng</div>
                            <div className="text-white-50" style={{fontSize:'12px'}}>Trong vòng 30 ngày</div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <p className="text-white-50 mb-0 mt-5" style={{fontSize:'12px'}}>
                      © 2025 <span className="text-white fw-semibold">Electro SpaceLink</span>. All rights reserved.
                    </p>
                  </div>

                  {/* Right Panel - Form */}
                  <div className="col-lg-7 d-flex align-items-center">
                    <div className="w-100 p-5">
                      <div className="mb-4">
                        <h3 className="fw-bold text-dark mb-1">Đăng nhập</h3>
                        <p className="text-muted" style={{fontSize:'14px'}}>Nhập thông tin tài khoản của bạn bên dưới</p>
                      </div>

                      {/* Social login */}
                      <div className="row g-3 mb-4">
                        <div className="col-6">
                          <button className="btn btn-social w-100">
                            <i className="fab fa-google text-danger me-2"></i>Google
                          </button>
                        </div>
                        <div className="col-6">
                          <button className="btn btn-social w-100">
                            <i className="fab fa-facebook text-primary me-2"></i>Facebook
                          </button>
                        </div>
                      </div>

                      <div className="divider mb-4">hoặc đăng nhập bằng email</div>

                      <form onSubmit={handleSubmit(onLogin)}>
                        {/* Email */}
                        <div className="mb-3">
                          <label className="form-label fw-semibold" style={{fontSize:'14px'}}>
                            Địa chỉ Email <span className="text-danger">*</span>
                          </label>
                          <div className="input-icon-wrapper">
                            <i className="fas fa-envelope input-icon"></i>
                            <input
                              type="email"
                              placeholder="example@email.com"
                              {...register('email', {
                                required: 'Vui lòng nhập email',
                                pattern: { value: /^\S+@\S+$/i, message: 'Email không hợp lệ' }
                              })}
                              className={`form-control form-control-custom with-icon ${errors.email ? 'is-invalid' : ''}`}
                            />
                          </div>
                          {errors.email && <div className="invalid-feedback d-block" style={{fontSize:'13px'}}><i className="fas fa-exclamation-circle me-1"></i>{errors.email.message}</div>}
                        </div>

                        {/* Password */}
                        <div className="mb-2">
                          <label className="form-label fw-semibold" style={{fontSize:'14px'}}>
                            Mật khẩu <span className="text-danger">*</span>
                          </label>
                          <div className="input-icon-wrapper">
                            <i className="fas fa-lock input-icon"></i>
                            <input
                              type="password"
                              placeholder="Nhập mật khẩu"
                              {...register('password', { required: 'Vui lòng nhập mật khẩu' })}
                              className={`form-control form-control-custom with-icon ${errors.password ? 'is-invalid' : ''}`}
                            />
                          </div>
                          {errors.password && <div className="invalid-feedback d-block" style={{fontSize:'13px'}}><i className="fas fa-exclamation-circle me-1"></i>{errors.password.message}</div>}
                        </div>

                        <div className="d-flex justify-content-between align-items-center mb-4">
                          <div className="form-check mb-0">
                            <input className="form-check-input" type="checkbox" id="rememberMe" />
                            <label className="form-check-label text-muted" htmlFor="rememberMe" style={{fontSize:'13px'}}>
                              Ghi nhớ đăng nhập
                            </label>
                          </div>
                          <a href="#" className="auth-link" style={{fontSize:'13px'}}>Quên mật khẩu?</a>
                        </div>

                        <button type="submit" className="btn btn-login btn-primary w-100 text-white mb-4" disabled={isSubmitting}>
                          {isSubmitting
                            ? <><span className="spinner-border spinner-border-sm me-2"></span>Đang đăng nhập...</>
                            : <><i className="fas fa-sign-in-alt me-2"></i>Đăng nhập</>
                          }
                        </button>

                        <p className="text-center text-muted mb-0" style={{fontSize:'14px'}}>
                          Chưa có tài khoản?{' '}
                          <Link to="/register" className="auth-link">Đăng ký ngay</Link>
                        </p>
                      </form>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;

import React from 'react';
import { useForm } from 'react-hook-form';
import type { User } from '../types/user';
import { useNavigate, Link } from 'react-router-dom';

type RegisterForm = {
  fullname: string;
  email: string;
  password: string;
  confirmPassword: string;
};

const RegisterPage: React.FC = () => {
  const { register, handleSubmit, watch, formState: { errors, isSubmitting } } = useForm<RegisterForm>();
  const navigate = useNavigate();
  const passwordValue = watch('password');

  const onRegister = async (data: RegisterForm) => {
    try {
      // Kiểm tra email tồn tại chưa
      const checkEmail = await fetch('http://localhost:3000/users?email=' + data.email);
      const checkEmailJson = await checkEmail.json();
      if (checkEmailJson.length > 0) {
        alert('Email này đã được sử dụng, vui lòng dùng email khác!');
        return;
      }

      const newUser: Omit<User, 'id'> = {
        fullname: data.fullname,
        email: data.email,
        password: data.password,
        role: 'customer',
        status: 'active',
        avatar: '',
      };

      const res = await fetch('http://localhost:3000/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser),
      });

      if (!res.ok) throw new Error('Register failed');

      alert('Đăng ký thành công! Vui lòng đăng nhập.');
      navigate('/login');
    } catch (error) {
      console.error('Error:', error);
      alert('Đã có lỗi xảy ra, vui lòng thử lại!');
    }
  };

  return (
    <>
      <style>{`
        .auth-page { min-height: 100vh; background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%); }
        .auth-card { border: none; border-radius: 20px; box-shadow: 0 20px 60px rgba(0,0,0,0.12); overflow: hidden; }
        .auth-right { background: linear-gradient(160deg, #ffb347 0%, #f28b00 50%, #c96f00 100%); min-height: 500px; position: relative; }
        .auth-right::after { content:''; position:absolute; top:0; left:0; right:0; height:6px; background: linear-gradient(90deg,#ffc107,#fd7e14,#ffc107); }
        .auth-brand-icon { width:70px; height:70px; background:rgba(255,255,255,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(10px); border:2px solid rgba(255,255,255,0.3); }
        .step-badge { width:32px; height:32px; background:rgba(255,255,255,0.15); border-radius:50%; display:flex; align-items:center; justify-content:center; font-size:13px; font-weight:700; color:#fff; border:2px solid rgba(255,255,255,0.4); flex-shrink:0; }
        .step-item { background:rgba(255,255,255,0.1); border-radius:10px; padding:12px 16px; backdrop-filter:blur(5px); border:1px solid rgba(255,255,255,0.2); }
        .form-control-custom { border-radius: 10px; border: 2px solid #e9ecef; padding: 12px 16px; font-size: 14px; transition: all 0.3s ease; background:#f8f9fa; }
        .form-control-custom:focus { border-color: #0d6efd; background: #fff; box-shadow: 0 0 0 4px rgba(13,110,253,0.1); }
        .form-control-custom.is-invalid { border-color: #dc3545; background: #fff8f8; }
        .input-icon-wrapper { position: relative; }
        .input-icon { position:absolute; left:14px; top:50%; transform:translateY(-50%); color: #adb5bd; z-index:1; font-size:14px; }
        .form-control-custom.with-icon { padding-left: 40px; }
        .btn-register { border-radius: 10px; padding: 13px; font-weight: 600; font-size: 15px; letter-spacing: 0.5px; transition: all 0.3s ease; background: linear-gradient(135deg,#0d6efd,#0a58ca); border:none; }
        .btn-register:hover { transform: translateY(-2px); box-shadow: 0 8px 25px rgba(13,110,253,0.4); background: linear-gradient(135deg,#0a58ca,#084298); }
        .auth-link { color:linear-gradient(160deg, #ffb347 0%, #f28b00 50%, #c96f00 100%); text-decoration:none; font-weight:600; }
        .auth-link:hover { color:linear-gradient(160deg, #ff9f1c 0%, #d97700 50%, #a85d00 100%); text-decoration:underline; }
        .floating-shape { position:absolute; border-radius:50%; opacity:0.08; background:#fff; }
        .password-strength { height: 4px; border-radius: 4px; transition: all 0.3s; }
      `}</style>

      <div className="auth-page d-flex align-items-center py-5">
        <div className="container">
          <div className="row justify-content-center">
            <div className="col-xl-10 col-lg-11">
              <div className="card auth-card">
                <div className="row g-0">

                  {/* Left Panel - Form */}
                  <div className="col-lg-7 d-flex align-items-center order-2 order-lg-1">
                    <div className="w-100 p-5">
                      <div className="mb-4">
                        <h3 className="fw-bold text-dark mb-1">Tạo tài khoản</h3>
                        <p className="text-muted" style={{fontSize:'14px'}}>Điền đầy đủ thông tin để đăng ký tài khoản mới</p>
                      </div>

                      <form onSubmit={handleSubmit(onRegister)}>
                        {/* Fullname */}
                        <div className="mb-3">
                          <label className="form-label fw-semibold" style={{fontSize:'14px'}}>
                            Họ và tên <span className="text-danger">*</span>
                          </label>
                          <div className="input-icon-wrapper">
                            <i className="fas fa-user input-icon"></i>
                            <input
                              type="text"
                              placeholder="Nguyễn Văn A"
                              {...register('fullname', {
                                required: 'Vui lòng nhập họ tên',
                                minLength: { value: 2, message: 'Tên phải có ít nhất 2 ký tự' }
                              })}
                              className={`form-control form-control-custom with-icon ${errors.fullname ? 'is-invalid' : ''}`}
                            />
                          </div>
                          {errors.fullname && <div className="invalid-feedback d-block" style={{fontSize:'13px'}}><i className="fas fa-exclamation-circle me-1"></i>{errors.fullname.message}</div>}
                        </div>

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
                                pattern: { value: /^\S+@\S+\.\S+$/, message: 'Email không hợp lệ' }
                              })}
                              className={`form-control form-control-custom with-icon ${errors.email ? 'is-invalid' : ''}`}
                            />
                          </div>
                          {errors.email && <div className="invalid-feedback d-block" style={{fontSize:'13px'}}><i className="fas fa-exclamation-circle me-1"></i>{errors.email.message}</div>}
                        </div>

                        {/* Password + Confirm - 2 cột */}
                        <div className="row g-3 mb-3">
                          <div className="col-md-6">
                            <label className="form-label fw-semibold" style={{fontSize:'14px'}}>
                              Mật khẩu <span className="text-danger">*</span>
                            </label>
                            <div className="input-icon-wrapper">
                              <i className="fas fa-lock input-icon"></i>
                              <input
                                type="password"
                                placeholder="Tối thiểu 6 ký tự"
                                {...register('password', {
                                  required: 'Vui lòng nhập mật khẩu',
                                  minLength: { value: 6, message: 'Mật khẩu ít nhất 6 ký tự' }
                                })}
                                className={`form-control form-control-custom with-icon ${errors.password ? 'is-invalid' : ''}`}
                              />
                            </div>
                            {errors.password && <div className="invalid-feedback d-block" style={{fontSize:'13px'}}><i className="fas fa-exclamation-circle me-1"></i>{errors.password.message}</div>}
                          </div>
                          <div className="col-md-6">
                            <label className="form-label fw-semibold" style={{fontSize:'14px'}}>
                              Xác nhận mật khẩu <span className="text-danger">*</span>
                            </label>
                            <div className="input-icon-wrapper">
                              <i className="fas fa-shield-alt input-icon"></i>
                              <input
                                type="password"
                                placeholder="Nhập lại mật khẩu"
                                {...register('confirmPassword', {
                                  required: 'Vui lòng xác nhận mật khẩu',
                                  validate: val => val === passwordValue || 'Mật khẩu không khớp'
                                })}
                                className={`form-control form-control-custom with-icon ${errors.confirmPassword ? 'is-invalid' : ''}`}
                              />
                            </div>
                            {errors.confirmPassword && <div className="invalid-feedback d-block" style={{fontSize:'13px'}}><i className="fas fa-exclamation-circle me-1"></i>{errors.confirmPassword.message}</div>}
                          </div>
                        </div>

                        {/* Terms */}
                        <div className="form-check mb-4">
                          <input
                            className="form-check-input"
                            type="checkbox"
                            id="agreeTerms"
                            required
                          />
                          <label className="form-check-label text-muted" htmlFor="agreeTerms" style={{fontSize:'13px'}}>
                            Tôi đồng ý với{' '}
                            <a href="#" className="auth-link">Điều khoản dịch vụ</a>{' '}và{' '}
                            <a href="#" className="auth-link">Chính sách bảo mật</a>
                          </label>
                        </div>

                        <button type="submit" className="btn btn-register btn-primary w-100 text-white mb-4" disabled={isSubmitting}>
                          {isSubmitting
                            ? <><span className="spinner-border spinner-border-sm me-2"></span>Đang tạo tài khoản...</>
                            : <><i className="fas fa-user-plus me-2"></i>Đăng ký ngay</>
                          }
                        </button>

                        <p className="text-center text-muted mb-0" style={{fontSize:'14px'}}>
                          Đã có tài khoản?{' '}
                          <Link to="/login" className="auth-link">Đăng nhập</Link>
                        </p>
                      </form>
                    </div>
                  </div>

                  {/* Right Panel */}
                  <div className="col-lg-5 auth-right d-flex flex-column justify-content-between p-5 order-1 order-lg-2">
                    <div className="floating-shape" style={{width:200,height:200,top:-80,left:-60}}></div>
                    <div className="floating-shape" style={{width:130,height:130,bottom:60,right:-50}}></div>

                    <div>
                      <div className="auth-brand-icon mb-4">
                        <i className="fas fa-shopping-bag text-white fs-4"></i>
                      </div>
                      <h2 className="text-white fw-bold mb-2">Tham gia cùng chúng tôi!</h2>
                      <p className="text-white-50 mb-5">Đăng ký để nhận ưu đãi độc quyền và theo dõi đơn hàng.</p>

                      <h6 className="text-white-50 text-uppercase fw-bold mb-3" style={{fontSize:'11px', letterSpacing:'1px'}}>
                        Quy trình đăng ký
                      </h6>
                      <div className="d-flex flex-column gap-3">
                        <div className="step-item d-flex align-items-center gap-3">
                          <div className="step-badge">1</div>
                          <div>
                            <div className="text-white fw-semibold" style={{fontSize:'13px'}}>Điền thông tin cá nhân</div>
                            <div className="text-white-50" style={{fontSize:'12px'}}>Họ tên và địa chỉ email</div>
                          </div>
                        </div>
                        <div className="step-item d-flex align-items-center gap-3">
                          <div className="step-badge">2</div>
                          <div>
                            <div className="text-white fw-semibold" style={{fontSize:'13px'}}>Tạo mật khẩu bảo mật</div>
                            <div className="text-white-50" style={{fontSize:'12px'}}>Tối thiểu 6 ký tự</div>
                          </div>
                        </div>
                        <div className="step-item d-flex align-items-center gap-3">
                          <div className="step-badge">3</div>
                          <div>
                            <div className="text-white fw-semibold" style={{fontSize:'13px'}}>Bắt đầu mua sắm</div>
                            <div className="text-white-50" style={{fontSize:'12px'}}>Khám phá hàng nghìn sản phẩm</div>
                          </div>
                        </div>
                      </div>

                      <div className="mt-5 p-3" style={{background:'rgba(255,193,7,0.15)', borderRadius:'12px', border:'1px solid rgba(255,193,7,0.3)'}}>
                        <div className="d-flex align-items-center gap-2 mb-1">
                          <i className="fas fa-gift text-warning"></i>
                          <span className="text-white fw-semibold" style={{fontSize:'13px'}}>Ưu đãi đăng ký mới</span>
                        </div>
                        <p className="text-white-50 mb-0" style={{fontSize:'12px'}}>
                          Giảm <strong className="text-warning">10%</strong> cho đơn hàng đầu tiên khi đăng ký tài khoản mới!
                        </p>
                      </div>
                    </div>

                    <p className="text-white-50 mb-0 mt-5" style={{fontSize:'12px'}}>
                      © 2025 <span className="text-white fw-semibold">Electro SpaceLink</span>. All rights reserved.
                    </p>
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

export default RegisterPage;

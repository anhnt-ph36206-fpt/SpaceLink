import React from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { axiosInstance } from '../api/axios';
import type { AxiosError } from 'axios';

type ResetPasswordForm = {
  password: string;
  confirmPassword: string;
};

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token') ?? '';
  const email = searchParams.get('email') ?? '';

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ResetPasswordForm>();

  const passwordValue = watch('password');
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const onSubmit = async (data: ResetPasswordForm) => {
    setSuccessMessage(null);
    setErrorMessage(null);

    if (!token || !email) {
      setErrorMessage('Liên kết không hợp lệ hoặc thiếu thông tin. Vui lòng yêu cầu gửi lại email đặt lại mật khẩu.');
      return;
    }

    try {
      const response = await axiosInstance.post('/auth/reset-password', {
        token,
        email,
        password: data.password,
        password_confirmation: data.confirmPassword,
      });

      setSuccessMessage(
        response.data?.message ?? 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.'
      );
      reset();
      setTimeout(() => {
        navigate('/login');
      }, 1800);
    } catch (err) {
      const error = err as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
      const validationErrors = error.response?.data?.errors;

      if (validationErrors) {
        const firstErrorGroup = Object.values(validationErrors)[0];
        const firstMessage = Array.isArray(firstErrorGroup) ? firstErrorGroup[0] : null;
        setErrorMessage(firstMessage ?? 'Dữ liệu không hợp lệ. Vui lòng kiểm tra lại.');
        return;
      }

      setErrorMessage(error.response?.data?.message ?? 'Không thể đặt lại mật khẩu lúc này. Vui lòng thử lại sau.');
    }
  };

  return (
    <div className="auth-page d-flex align-items-center py-5" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)' }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-6 col-md-8">
            <div className="card border-0 shadow-lg" style={{ borderRadius: '20px' }}>
              <div className="card-body p-4 p-md-5">
                <div className="text-center mb-4">
                  <h3 className="fw-bold mb-2">Đặt lại mật khẩu</h3>
                  <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
                    Tạo mật khẩu mới cho tài khoản của bạn.
                  </p>
                  {email && (
                    <p className="text-muted mt-2 mb-0" style={{ fontSize: '13px' }}>
                      Email: <span className="fw-semibold">{email}</span>
                    </p>
                  )}
                </div>

                {(!token || !email) && (
                  <div className="alert alert-warning" style={{ fontSize: '13px' }}>
                    Link đặt lại mật khẩu thiếu token hoặc email. Vui lòng quay lại trang đăng nhập và gửi yêu cầu mới.
                  </div>
                )}

                {successMessage && (
                  <div className="alert alert-success" style={{ fontSize: '13px' }}>
                    {successMessage}
                  </div>
                )}

                {errorMessage && (
                  <div className="alert alert-danger" style={{ fontSize: '13px' }}>
                    {errorMessage}
                  </div>
                )}

                {!successMessage && (
                  <form onSubmit={handleSubmit(onSubmit)}>
                    <div className="mb-3">
                      <label className="form-label fw-semibold" style={{ fontSize: '14px' }}>
                        Mật khẩu mới <span className="text-danger">*</span>
                      </label>
                      <div className="input-icon-wrapper position-relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          className={`form-control ${errors.password ? 'is-invalid' : ''}`}
                          placeholder="Tối thiểu 6 ký tự"
                          style={{ paddingRight: '42px' }}
                          {...register('password', {
                            required: 'Vui lòng nhập mật khẩu mới',
                            minLength: { value: 6, message: 'Mật khẩu phải có ít nhất 6 ký tự' },
                          })}
                        />
                        <button 
                          type="button" 
                          className="btn btn-link position-absolute top-50 end-0 translate-middle-y text-muted text-decoration-none"
                          onClick={() => setShowPassword(p => !p)} 
                          tabIndex={-1} 
                          aria-label={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                          style={{ border: 'none', background: 'transparent' }}
                        >
                          <i className={`fas ${showPassword ? 'fa-eye' : 'fa-eye-slash'}`} />
                        </button>
                      </div>
                      {errors.password && (
                        <div className="invalid-feedback d-block" style={{ fontSize: '13px' }}>
                          {errors.password.message}
                        </div>
                      )}
                    </div>

                    <div className="mb-4">
                      <label className="form-label fw-semibold" style={{ fontSize: '14px' }}>
                        Xác nhận mật khẩu <span className="text-danger">*</span>
                      </label>
                      <div className="input-icon-wrapper position-relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          className={`form-control ${errors.confirmPassword ? 'is-invalid' : ''}`}
                          placeholder="Nhập lại mật khẩu"
                          style={{ paddingRight: '42px' }}
                          {...register('confirmPassword', {
                            required: 'Vui lòng xác nhận mật khẩu',
                            validate: (value) => value === passwordValue || 'Xác nhận mật khẩu không khớp',
                          })}
                        />
                        <button 
                          type="button" 
                          className="btn btn-link position-absolute top-50 end-0 translate-middle-y text-muted text-decoration-none"
                          onClick={() => setShowConfirmPassword(p => !p)} 
                          tabIndex={-1} 
                          aria-label={showConfirmPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                          style={{ border: 'none', background: 'transparent' }}
                        >
                          <i className={`fas ${showConfirmPassword ? 'fa-eye' : 'fa-eye-slash'}`} />
                        </button>
                      </div>
                      {errors.confirmPassword && (
                        <div className="invalid-feedback d-block" style={{ fontSize: '13px' }}>
                          {errors.confirmPassword.message}
                        </div>
                      )}
                    </div>

                    <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting || !token || !email}>
                      {isSubmitting ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
                    </button>
                  </form>
                )}

                <p className="text-center mb-0 mt-4" style={{ fontSize: '14px' }}>
                  <Link to="/login">Quay lại đăng nhập</Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;

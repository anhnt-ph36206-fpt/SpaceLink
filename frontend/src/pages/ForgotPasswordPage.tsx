import React from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { axiosInstance } from '../api/axios';
import type { AxiosError } from 'axios';

type ForgotPasswordForm = {
  email: string;
};

const ForgotPasswordPage: React.FC = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<ForgotPasswordForm>();

  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const onSubmit = async (data: ForgotPasswordForm) => {
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const response = await axiosInstance.post('/auth/forgot-password', {
        email: data.email,
      });

      setSuccessMessage(
        response.data?.message ?? 'Đã gửi liên kết đặt lại mật khẩu. Vui lòng kiểm tra email của bạn.'
      );
      reset();
    } catch (err) {
      const error = err as AxiosError<{ message?: string; errors?: Record<string, string[]> }>;
      const emailErrors = error.response?.data?.errors?.email;
      const fallback = error.response?.data?.message ?? 'Không thể gửi yêu cầu lúc này. Vui lòng thử lại.';
      setErrorMessage(Array.isArray(emailErrors) && emailErrors.length > 0 ? emailErrors[0] : fallback);
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
                  <h3 className="fw-bold mb-2">Khôi phục mật khẩu</h3>
                  <p className="text-muted mb-0" style={{ fontSize: '14px' }}>
                    Nhập email đã đăng ký, chúng tôi sẽ gửi liên kết đặt lại mật khẩu.
                  </p>
                </div>

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

                <form onSubmit={handleSubmit(onSubmit)}>
                  <div className="mb-4">
                    <label className="form-label fw-semibold" style={{ fontSize: '14px' }}>
                      Địa chỉ Email <span className="text-danger">*</span>
                    </label>
                    <input
                      type="email"
                      className={`form-control ${errors.email ? 'is-invalid' : ''}`}
                      placeholder="example@email.com"
                      {...register('email', {
                        required: 'Vui lòng nhập email',
                        pattern: { value: /^\S+@\S+$/i, message: 'Email không hợp lệ' },
                      })}
                    />
                    {errors.email && (
                      <div className="invalid-feedback d-block" style={{ fontSize: '13px' }}>
                        {errors.email.message}
                      </div>
                    )}
                  </div>

                  <button type="submit" className="btn btn-primary w-100" disabled={isSubmitting}>
                    {isSubmitting ? 'Đang gửi...' : 'Gửi liên kết khôi phục'}
                  </button>
                </form>

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

export default ForgotPasswordPage;

import React from 'react';
import { Link } from 'react-router-dom';

const Footer: React.FC = () => {
    return (
        <>
            {/* Footer Start */}
            <div className="container-fluid bg-dark footer mt-5 py-5 wow fadeIn" data-wow-delay="0.1s">
                <div className="container py-5">
                    <div className="row g-5">

                        {/* CỘT 1: THÔNG TIN CHUNG */}
                        <div className="col-md-6 col-lg-6 col-xl-3">
                            <div className="footer-item d-flex flex-column">
                                <h4 className="text-white mb-4">
                                    <i className="fas fa-satellite-dish text-primary me-3"></i>SpaceLink
                                </h4>
                                <p className="mb-3">
                                    SpaceLink - Hệ thống bán lẻ điện thoại uy tín, chất lượng. Kết nối công nghệ, kết nối tương lai.
                                </p>
                                <div className="d-flex align-items-center mb-3">
                                    <i className="fas fa-map-marker-alt text-primary me-2"></i>
                                    <span>123 Cầu Giấy, Hà Nội</span>
                                </div>
                                <div className="d-flex align-items-center mb-3">
                                    <i className="fas fa-envelope text-primary me-2"></i>
                                    <span>hotro@spacelink.vn</span>
                                </div>
                                <div className="d-flex align-items-center">
                                    <i className="fas fa-phone-alt text-primary me-2"></i>
                                    <span>1900 1234</span>
                                </div>
                            </div>
                        </div>

                        {/* CỘT 2: HỖ TRỢ KHÁCH HÀNG */}
                        <div className="col-md-6 col-lg-6 col-xl-3">
                            <div className="footer-item d-flex flex-column">
                                <h4 className="text-primary mb-4">Hỗ Trợ Khách Hàng</h4>
                                <Link to="/contact" className="pb-2 text-white text-decoration-none"><i className="fas fa-angle-right me-2 text-primary"></i> Liên hệ</Link>
                                <Link to="#" className="pb-2 text-white text-decoration-none"><i className="fas fa-angle-right me-2 text-primary"></i> Chính sách đổi trả</Link>
                                <Link to="#" className="pb-2 text-white text-decoration-none"><i className="fas fa-angle-right me-2 text-primary"></i> Chính sách bảo hành</Link>
                                <Link to="#" className="pb-2 text-white text-decoration-none"><i className="fas fa-angle-right me-2 text-primary"></i> Tra cứu đơn hàng</Link>
                                <Link to="#" className="pb-2 text-white text-decoration-none"><i className="fas fa-angle-right me-2 text-primary"></i> Câu hỏi thường gặp</Link>
                            </div>
                        </div>

                        {/* CỘT 3: VỀ CHÚNG TÔI */}
                        <div className="col-md-6 col-lg-6 col-xl-3">
                            <div className="footer-item d-flex flex-column">
                                <h4 className="text-primary mb-4">Về SpaceLink</h4>
                                <Link to="/about" className="pb-2 text-white text-decoration-none"><i className="fas fa-angle-right me-2 text-primary"></i> Giới thiệu</Link>
                                <Link to="#" className="pb-2 text-white text-decoration-none"><i className="fas fa-angle-right me-2 text-primary"></i> Tuyển dụng</Link>
                                <Link to="#" className="pb-2 text-white text-decoration-none"><i className="fas fa-angle-right me-2 text-primary"></i> Điều khoản sử dụng</Link>
                                <Link to="#" className="pb-2 text-white text-decoration-none"><i className="fas fa-angle-right me-2 text-primary"></i> Chính sách bảo mật</Link>

                                <div className="d-flex mt-4 gap-2">
                                    <a className="btn btn-primary btn-sm-square rounded-circle me-2" href="#"><i className="fab fa-facebook-f"></i></a>
                                    <a className="btn btn-primary btn-sm-square rounded-circle me-2" href="#"><i className="fab fa-twitter"></i></a>
                                    <a className="btn btn-primary btn-sm-square rounded-circle me-2" href="#"><i className="fab fa-youtube"></i></a>
                                    <a className="btn btn-primary btn-sm-square rounded-circle" href="#"><i className="fab fa-tiktok"></i></a>
                                </div>
                            </div>
                        </div>

                        {/* CỘT 4: ĐĂNG KÝ NHẬN TIN */}
                        <div className="col-md-6 col-lg-6 col-xl-3">
                            <div className="footer-item">
                                <h4 className="text-primary mb-4">Đăng Ký Nhận Tin</h4>
                                <p className="mb-3">Nhận thông tin khuyến mãi mới nhất từ SpaceLink.</p>
                                <div className="position-relative mx-auto rounded-pill">
                                    <input
                                        className="form-control rounded-pill w-100 py-3 ps-4 pe-5 border-0"
                                        type="text"
                                        placeholder="Email của bạn"
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-primary rounded-pill position-absolute top-0 end-0 py-2 px-4 mt-2 me-2"
                                    >
                                        Gửi
                                    </button>
                                </div>
                                <div className="mt-4">
                                    <h6 className="text-white mb-3">Thanh toán</h6>
                                    <div className="d-flex gap-2">
                                        <i className="fab fa-cc-visa fa-2x text-white-50"></i>
                                        <i className="fab fa-cc-mastercard fa-2x text-white-50"></i>
                                        <i className="fab fa-cc-paypal fa-2x text-white-50"></i>
                                        <i className="fas fa-money-bill-wave fa-2x text-white-50"></i>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                </div>
            </div>
            {/* Footer End */}

            {/* Copyright Start */}
            <div className="container-fluid copyright py-4 bg-dark border-top border-secondary">
                <div className="container">
                    <div className="row g-4 align-items-center">
                        <div className="col-md-6 text-center text-md-start mb-md-0">
                            <span className="text-white">
                                &copy; <Link to="/" className="text-white text-decoration-none fw-bold">SpaceLink</Link>, All Right Reserved.
                            </span>
                        </div>
                        <div className="col-md-6 text-center text-md-end text-white">
                            Designed By <a className="text-white text-decoration-underline" href="#">Your Name</a>
                        </div>
                    </div>
                </div>
            </div>
            {/* Copyright End */}
        </>
    );
};

export default Footer;
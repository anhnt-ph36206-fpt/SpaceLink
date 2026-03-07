import React from 'react';
import { Link } from 'react-router-dom';

const ContactPage: React.FC = () => {
    return (
        <div className="container-fluid py-5 bg-light min-vh-100">
            <div className="container py-5">

                {/* --- BREADCRUMB --- */}
                <div className="mb-5 text-center">
                    <h1 className="display-5 fw-bold text-primary mb-3">Liên Hệ Với Chúng Tôi</h1>
                    <nav aria-label="breadcrumb">
                        <ol className="breadcrumb justify-content-center">
                            <li className="breadcrumb-item"><Link to="/" className="text-decoration-none">Trang chủ</Link></li>
                            <li className="breadcrumb-item active text-dark" aria-current="page">Liên hệ</li>
                        </ol>
                    </nav>
                    <p className="lead text-muted mx-auto" style={{ maxWidth: '600px' }}>
                        Chúng tôi luôn sẵn sàng lắng nghe và hỗ trợ bạn. Hãy để lại tin nhắn hoặc ghé thăm cửa hàng của chúng tôi.
                    </p>
                </div>

                {/* --- INFO BOXES --- */}
                <div className="row g-4 mb-5">
                    <div className="col-md-4">
                        <div className="bg-white rounded-3 p-4 text-center h-100 shadow-sm border-0 transition-hover">
                            <div className="d-inline-flex align-items-center justify-content-center bg-primary text-white rounded-circle mb-4" style={{ width: '60px', height: '60px' }}>
                                <i className="fas fa-map-marker-alt fa-lg"></i>
                            </div>
                            <h5 className="fw-bold">Địa chỉ</h5>
                            <p className="text-muted mb-0">123 Cầu Giấy, Hà Nội, Việt Nam</p>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="bg-white rounded-3 p-4 text-center h-100 shadow-sm border-0 transition-hover">
                            <div className="d-inline-flex align-items-center justify-content-center bg-primary text-white rounded-circle mb-4" style={{ width: '60px', height: '60px' }}>
                                <i className="fas fa-phone-alt fa-lg"></i>
                            </div>
                            <h5 className="fw-bold">Hotline</h5>
                            <p className="text-muted mb-0">
                                <a href="tel:19001234" className="text-decoration-none text-muted">1900 1234</a>
                            </p>
                        </div>
                    </div>
                    <div className="col-md-4">
                        <div className="bg-white rounded-3 p-4 text-center h-100 shadow-sm border-0 transition-hover">
                            <div className="d-inline-flex align-items-center justify-content-center bg-primary text-white rounded-circle mb-4" style={{ width: '60px', height: '60px' }}>
                                <i className="fas fa-envelope fa-lg"></i>
                            </div>
                            <h5 className="fw-bold">Email</h5>
                            <p className="text-muted mb-0">
                                <a href="mailto:hotro@spacelink.vn" className="text-decoration-none text-muted">hotro@spacelink.vn</a>
                            </p>
                        </div>
                    </div>
                </div>

                {/* --- FORM & MAP --- */}
                <div className="row g-4">

                    {/* Form liên hệ */}
                    <div className="col-lg-6">
                        <div className="bg-white rounded-3 p-4 p-lg-5 shadow-sm h-100">
                            <h4 className="fw-bold mb-4 text-primary">Gửi tin nhắn cho chúng tôi</h4>
                            <form onSubmit={(e) => e.preventDefault()}>
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <div className="form-floating">
                                            <input type="text" className="form-control bg-light border-0" id="name" placeholder="Họ tên" />
                                            <label htmlFor="name">Họ tên của bạn</label>
                                        </div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="form-floating">
                                            <input type="email" className="form-control bg-light border-0" id="email" placeholder="Email" />
                                            <label htmlFor="email">Email liên hệ</label>
                                        </div>
                                    </div>
                                    <div className="col-12">
                                        <div className="form-floating">
                                            <input type="text" className="form-control bg-light border-0" id="subject" placeholder="Tiêu đề" />
                                            <label htmlFor="subject">Tiêu đề</label>
                                        </div>
                                    </div>
                                    <div className="col-12">
                                        <div className="form-floating">
                                            <textarea className="form-control bg-light border-0" placeholder="Nội dung" id="message" style={{ height: '150px' }}></textarea>
                                            <label htmlFor="message">Nội dung tin nhắn</label>
                                        </div>
                                    </div>
                                    <div className="col-12">
                                        <button className="btn btn-primary rounded-pill py-3 px-5 fw-bold w-100 hover-shadow" type="submit">
                                            <i className="fas fa-paper-plane me-2"></i> Gửi Tin Nhắn
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>

                    {/* Bản đồ Google Maps */}
                    <div className="col-lg-6">
                        <div className="h-100 bg-white rounded-3 shadow-sm overflow-hidden p-2">
                            <iframe
                                className="w-100 h-100 rounded-3"
                                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3723.863981044776!2d105.79379631548384!3d21.02812549283477!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3135ab4cf1114533%3A0xc9c34d3d023366c9!2zMTIzIMSQLiBD4bqndSBHaeG6pXksIFF1YW4gSG9hLCBD4bqndSBHaeG6pXksIEjDoCBO4buZaSwgVmlldG5hbQ!5e0!3m2!1sen!2s!4v1689651234567!5m2!1sen!2s"
                                style={{ minHeight: '400px', border: 0 }}
                                allowFullScreen={true}
                                loading="lazy"
                                referrerPolicy="no-referrer-when-downgrade"
                                title="Google Maps"
                            ></iframe>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactPage;
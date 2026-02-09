import React from 'react';
import {Link} from 'react-router-dom';

const Footer: React.FC = () => {
    return (
        <>
            {/* Footer Start */}
            <div className="container-fluid bg-dark footer mt-5 py-5 wow fadeIn" data-wow-delay="0.1s">
                <div className="container py-5">
                    <div className="row g-5">
                        <div className="col-md-6 col-lg-6 col-xl-3">
                            <div className="footer-item d-flex flex-column">
                                <div className="footer-item">
                                    <h4 className="text-white mb-4">
                                        <i className="fas fa-shopping-bag text-primary me-3"></i>Electro
                                    </h4>
                                    <p className="mb-3">
                                        Dolor amet sit justo amet elitr clita ipsum elitr est. Lorem ipsum dolor sit
                                        amet,
                                        consectetur adipiscing elit consectetur adipiscing elit.
                                    </p>
                                    <div className="position-relative">
                                        <input
                                            className="form-control rounded-pill w-100 py-3 ps-4 pe-5"
                                            type="text"
                                            placeholder="Your email"
                                        />
                                        <button
                                            type="button"
                                            className="btn btn-primary rounded-pill position-absolute top-0 end-0 py-2 px-4 mt-2 me-2"
                                        >
                                            Subscribe
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6 col-lg-6 col-xl-3">
                            <div className="footer-item d-flex flex-column">
                                <h4 className="text-primary mb-4">Newsletter</h4>
                                <p className="mb-3">
                                    Dolor amet sit justo amet elitr clita ipsum elitr est.Lorem ipsum dolor sit amet,
                                    consectetur adipiscing elit consectetur adipiscing elit.
                                </p>
                                <div className="position-relative mx-auto rounded-pill">
                                    <input
                                        className="form-control rounded-pill w-100 py-3 ps-4 pe-5"
                                        type="text"
                                        placeholder="Enter your email"
                                    />
                                    <button
                                        type="button"
                                        className="btn btn-primary rounded-pill position-absolute top-0 end-0 py-2 mt-2 me-2"
                                    >
                                        SignUp
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6 col-lg-6 col-xl-3">
                            <div className="footer-item d-flex flex-column">
                                <h4 className="text-primary mb-4">Customer Service</h4>
                                <Link to="#" className="">
                                    <i className="fas fa-angle-right me-2"></i> Contact Us
                                </Link>
                                <Link to="#" className="">
                                    <i className="fas fa-angle-right me-2"></i> Returns
                                </Link>
                                <Link to="#" className="">
                                    <i className="fas fa-angle-right me-2"></i> Order History
                                </Link>
                                <Link to="#" className="">
                                    <i className="fas fa-angle-right me-2"></i> Site Map
                                </Link>
                                <Link to="#" className="">
                                    <i className="fas fa-angle-right me-2"></i> Testimonials
                                </Link>
                                <Link to="#" className="">
                                    <i className="fas fa-angle-right me-2"></i> My Account
                                </Link>
                                <Link to="#" className="">
                                    <i className="fas fa-angle-right me-2"></i> Unsubscribe Notification
                                </Link>
                            </div>
                        </div>
                        <div className="col-md-6 col-lg-6 col-xl-3">
                            <div className="footer-item d-flex flex-column">
                                <h4 className="text-primary mb-4">Information</h4>
                                <Link to="#" className="">
                                    <i className="fas fa-angle-right me-2"></i> About Us
                                </Link>
                                <Link to="#" className="">
                                    <i className="fas fa-angle-right me-2"></i> Delivery infomation
                                </Link>
                                <Link to="#" className="">
                                    <i className="fas fa-angle-right me-2"></i> Privacy Policy
                                </Link>
                                <Link to="#" className="">
                                    <i className="fas fa-angle-right me-2"></i> Terms & Conditions
                                </Link>
                                <Link to="#" className="">
                                    <i className="fas fa-angle-right me-2"></i> Warranty
                                </Link>
                                <Link to="#" className="">
                                    <i className="fas fa-angle-right me-2"></i> FAQ
                                </Link>
                                <Link to="#" className="">
                                    <i className="fas fa-angle-right me-2"></i> Seller Login
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {/* Footer End */}

            {/* Copyright Start */}
            <div className="container-fluid copyright py-4">
                <div className="container">
                    <div className="row g-4 align-items-center">
                        <div className="col-md-6 text-center text-md-start mb-md-0">
                            <span className="text-white">
                                <Link to="#" className="border-bottom text-white">
                                    <i className="fas fa-copyright text-light me-2"></i>SpaceLink
                                </Link>, All right reserved.
                            </span>
                        </div>
                        <div className="col-md-6 text-center text-md-end text-white">
                            Designed By <a className="border-bottom text-white" href="https://htmlcodex.com">HTML
                            Codex</a>.
                            Distributed By <a className="border-bottom text-white"
                                              href="https://themewagon.com">ThemeWagon</a>
                        </div>
                    </div>
                </div>
            </div>
            {/* Copyright End */}
        </>
    );
};

export default Footer;
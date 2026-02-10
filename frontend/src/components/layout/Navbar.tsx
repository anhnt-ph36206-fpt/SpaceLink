import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

// Định nghĩa kiểu dữ liệu
interface Category {
    id: number;
    name: string;
    count?: number; // Số lượng sản phẩm (tính toán sau)
}

const Navbar: React.FC = () => {
    const location = useLocation();
    const [showCategories, setShowCategories] = useState(false);
    const [categories, setCategories] = useState<Category[]>([]);

    // Hàm kiểm tra active menu
    const isActive = (path: string) => location.pathname === path ? 'active' : '';

    // Lấy danh mục và đếm số lượng sản phẩm
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [catRes, prodRes] = await Promise.all([
                    fetch("http://localhost:3000/categories"),
                    fetch("http://localhost:3000/products")
                ]);

                const cats = await catRes.json();
                const prods = await prodRes.json();

                // Chỉ lấy danh mục active
                const activeCats = cats.filter((c: any) => c.is_active);

                // Tính số lượng sản phẩm cho từng danh mục
                const catsWithCount = activeCats.map((c: any) => {
                    const count = prods.filter((p: any) => p.category_id === c.id).length;
                    return { ...c, count };
                });

                setCategories(catsWithCount);
            } catch (error) {
                console.error("Lỗi tải Navbar:", error);
            }
        };

        fetchData();
    }, []);

    return (
        <div className="container-fluid nav-bar p-0">
            <div className="row gx-0 bg-primary px-5 align-items-center">

                {/* --- CỘT TRÁI: DANH MỤC SẢN PHẨM (Desktop) --- */}
                <div className="col-lg-3 d-none d-lg-block">
                    <nav className="navbar navbar-light position-relative" style={{ width: '100%', maxWidth: '250px' }}>
                        <button
                            className="navbar-toggler border-0 fs-4 w-100 px-3 py-2 text-start bg-white text-primary rounded shadow-sm"
                            type="button"
                            onClick={() => setShowCategories(!showCategories)}
                        >
                            <h5 className="m-0 fw-bold">
                                <i className="fa fa-bars me-2"></i> Danh Mục
                            </h5>
                        </button>

                        {/* Dropdown Danh mục */}
                        <div className={`collapse navbar-collapse rounded-bottom shadow-lg position-absolute w-100 bg-white ${showCategories ? 'show' : ''}`}
                            id="allCat"
                            style={{ zIndex: 999, top: '100%', left: 0 }}>
                            <div className="navbar-nav ms-auto py-0">
                                <ul className="list-unstyled categories-bars m-0">
                                    {categories.map((category) => (
                                        <li key={category.id} className="border-bottom last-0">
                                            <Link
                                                to={`/search?category=${category.id}`}
                                                className="d-flex justify-content-between align-items-center px-3 py-2 text-decoration-none text-dark hover-primary"
                                                onClick={() => setShowCategories(false)} // Đóng menu khi click
                                            >
                                                <span>{category.name}</span>
                                                <span className="badge bg-light text-primary rounded-pill">{category.count}</span>
                                            </Link>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </nav>
                </div>

                {/* --- CỘT PHẢI: MENU CHÍNH --- */}
                <div className="col-12 col-lg-9">
                    <nav className="navbar navbar-expand-lg navbar-light bg-primary">

                        {/* Logo Mobile */}
                        <Link to="/" className="navbar-brand d-block d-lg-none">
                            <h1 className="display-5 text-white m-0 fw-bold">
                                <i className="fas fa-satellite-dish text-white me-2"></i>SpaceLink
                            </h1>
                        </Link>

                        {/* Nút Toggle Mobile */}
                        <button
                            className="navbar-toggler ms-auto text-white border-white"
                            type="button"
                            data-bs-toggle="collapse"
                            data-bs-target="#navbarCollapse"
                        >
                            <span className="fa fa-bars text-white"></span>
                        </button>

                        <div className="collapse navbar-collapse" id="navbarCollapse">
                            <div className="navbar-nav ms-auto py-0">
                                <Link to="/" className={`nav-item nav-link px-3 ${isActive('/')}`}>
                                    Trang Chủ
                                </Link>
                                <Link to="/about" className={`nav-item nav-link px-3 ${isActive('/about')}`}>
                                    Giới Thiệu
                                </Link>
                                <Link to="/shop" className={`nav-item nav-link px-3 ${isActive('/shop')}`}>
                                    Sản Phẩm
                                </Link>

                                {/* Dropdown Tin tức / Hướng dẫn */}
                                <div className="nav-item dropdown">
                                    <a href="#" className="nav-link dropdown-toggle px-3" data-bs-toggle="dropdown">
                                        Tin Tức
                                    </a>
                                    <div className="dropdown-menu m-0 shadow-sm border-0 rounded-0">
                                        <Link to="/blog" className="dropdown-item">Tin công nghệ</Link>
                                        <Link to="/tips" className="dropdown-item">Mẹo hay</Link>
                                        <Link to="/review" className="dropdown-item">Đánh giá sản phẩm</Link>
                                    </div>
                                </div>

                                <Link to="/contact" className={`nav-item nav-link px-3 me-2 ${isActive('/contact')}`}>
                                    Liên Hệ
                                </Link>

                                {/* Danh mục Mobile (Chỉ hiện trên mobile) */}
                                <div className="nav-item dropdown d-block d-lg-none mb-3">
                                    <a href="#" className="nav-link dropdown-toggle px-3 text-warning fw-bold" data-bs-toggle="dropdown">
                                        <i className="fas fa-list me-2"></i> Danh Mục Sản Phẩm
                                    </a>
                                    <div className="dropdown-menu m-0 shadow-sm border-0 rounded-0">
                                        {categories.map((category) => (
                                            <Link
                                                key={category.id}
                                                to={`/search?category=${category.id}`}
                                                className="dropdown-item d-flex justify-content-between"
                                            >
                                                {category.name} <span className="text-muted small">({category.count})</span>
                                            </Link>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {/* Nút Hotline */}
                            <a href="tel:19001234" className="btn btn-secondary rounded-pill py-2 px-4 px-lg-3 mb-3 mb-md-3 mb-lg-0 fw-bold shadow-sm hover-up">
                                <i className="fa fa-phone-alt me-2"></i> 1900 1234
                            </a>
                        </div>
                    </nav>
                </div>
            </div>
        </div>
    );
};

export default Navbar;
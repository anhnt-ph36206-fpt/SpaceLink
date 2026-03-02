import React, { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

interface Category {
    id: number;
    name: string;
}

interface ProductSuggestion {
    id: string;
    name: string;
    image: string;
    price: number;
    sale_price: number;
}

const Header: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);

    // --- STATE CHO TÌM KIẾM ---
    const [keyword, setKeyword] = useState("");
    const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [allProducts, setAllProducts] = useState<ProductSuggestion[]>([]);

    const navigate = useNavigate();
    const wrapperRef = useRef<HTMLDivElement>(null);

    // ... (Phần useEffect lấy data và logic search giữ nguyên như cũ) ...
    // Copy lại logic search cũ vào đây nhé!
    // -----------------------------------------------------------------
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [catRes, prodRes, imgRes] = await Promise.all([
                    fetch("http://localhost:3000/categories"),
                    fetch("http://localhost:3000/products"),
                    fetch("http://localhost:3000/product_images")
                ]);
                const cats = await catRes.json();
                const prods = await prodRes.json();
                const imgs = await imgRes.json();
                setCategories(cats.filter((c: any) => c.is_active));
                const productData = prods.map((p: any) => {
                    const thumb = imgs.find((i: any) => i.product_id === p.id && i.is_primary);
                    return {
                        id: String(p.id),
                        name: p.name,
                        price: p.price,
                        sale_price: p.sale_price,
                        image: thumb ? thumb.image_path : ""
                    };
                });
                setAllProducts(productData);
            } catch (error) { console.error("Lỗi:", error); }
        };
        fetchData();
    }, []);

    useEffect(() => {
        if (keyword.trim().length > 1) {
            const lowerKeyword = keyword.toLowerCase();
            const filtered = allProducts.filter(p => p.name.toLowerCase().includes(lowerKeyword)).slice(0, 5);
            setSuggestions(filtered);
            setShowSuggestions(true);
        } else {
            setSuggestions([]); setShowSuggestions(false);
        }
    }, [keyword, allProducts]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) setShowSuggestions(false);
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [wrapperRef]);

    const handleSearch = () => {
        if (!keyword.trim()) return;
        setShowSuggestions(false);
        navigate(`/search?keyword=${encodeURIComponent(keyword)}`);
    };
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') handleSearch(); };
    const handleSuggestionClick = (prodId: string) => {
        setShowSuggestions(false);
        setKeyword("");
        navigate(`/product/${prodId}`);
    };
    // -----------------------------------------------------------------

    return (
        <>
            {/* --- TOPBAR --- */}
            <div className="container-fluid px-5 d-none border-bottom d-lg-block bg-light">
                <div className="row gx-0 align-items-center">
                    <div className="col-lg-4 text-center text-lg-start mb-lg-0">
                        <div className="d-inline-flex align-items-center" style={{ height: '45px' }}>
                            <small className="me-3 text-muted"><i className="fa fa-map-marker-alt text-primary me-2"></i>123 Cầu Giấy, Hà Nội</small>
                            <small className="text-muted"><i className="fa fa-envelope text-primary me-2"></i>hotro@spacelink.vn</small>
                        </div>
                    </div>
                    <div className="col-lg-4 text-center d-flex align-items-center justify-content-center">
                        <small className="text-dark me-2">Hotline:</small>
                        <a href="tel:19001234" className="text-primary fw-bold text-decoration-none" style={{ letterSpacing: '1px' }}>1900 1234</a>
                    </div>
                    <div className="col-lg-4 text-center text-lg-end">
                        <div className="d-inline-flex align-items-center" style={{ height: '45px' }}>
                            <Link to="#" className="text-muted me-2 text-decoration-none"><small>Tra cứu đơn hàng</small></Link>

                            {/* --- MENU TÀI KHOẢN (THÊM MỚI Ở ĐÂY) --- */}
                            <span className="text-muted mx-2">|</span>
                            <div className="dropdown">
                                <Link to="#" className="dropdown-toggle text-muted text-decoration-none small" data-bs-toggle="dropdown">
                                    <i className="fas fa-user text-primary me-1"></i> Tài khoản
                                </Link>
                                <div className="dropdown-menu dropdown-menu-end rounded-0 shadow-sm border-0 m-0">
                                    <Link to="/login" className="dropdown-item">Đăng nhập</Link>
                                    <Link to="/register" className="dropdown-item">Đăng ký</Link>
                                </div>
                            </div>
                            {/* ------------------------------------- */}

                        </div>
                    </div>
                </div>
            </div>

            {/* --- MAIN HEADER --- */}
            <div className="container-fluid px-5 py-4 d-none d-lg-block bg-white shadow-sm position-relative" style={{ zIndex: 100 }}>
                <div className="row gx-0 align-items-center text-center">

                    {/* LOGO */}
                    <div className="col-md-4 col-lg-3 text-center text-lg-start">
                        <Link to="/" className="navbar-brand p-0">
                            <h1 className="display-5 text-primary m-0 fw-bold">
                                <i className="fas fa-satellite-dish text-secondary me-2"></i>SpaceLink
                            </h1>
                            <span className="text-muted small" style={{ fontSize: '12px', letterSpacing: '2px', paddingLeft: '5px' }}>
                                KẾT NỐI TƯƠNG LAI
                            </span>
                        </Link>
                    </div>

                    {/* SEARCH BOX */}
                    <div className="col-md-4 col-lg-6 text-center">
                        <div className="position-relative ps-4" ref={wrapperRef}>
                            <div className="d-flex border border-2 border-primary rounded-pill overflow-hidden bg-white position-relative" style={{ zIndex: 102 }}>
                                <input
                                    className="form-control border-0 py-3 ps-4"
                                    type="text"
                                    placeholder="Tìm kiếm iPhone, Samsung..."
                                    style={{ outline: 'none', boxShadow: 'none' }}
                                    value={keyword}
                                    onChange={(e) => setKeyword(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    onFocus={() => { if (keyword.length > 1) setShowSuggestions(true); }}
                                />
                                <button
                                    type="button"
                                    className="btn btn-primary rounded-0 py-3 px-4 border-0 hover-shadow"
                                    onClick={handleSearch}
                                >
                                    <i className="fas fa-search fs-5"></i>
                                </button>
                            </div>
                            {/* Bảng gợi ý */}
                            {showSuggestions && suggestions.length > 0 && (
                                <div className="position-absolute start-0 mt-1 w-100 bg-white shadow-lg rounded-3 border overflow-hidden text-start"
                                    style={{ zIndex: 101, top: '100%', marginLeft: '24px', width: 'calc(100% - 24px)' }}>
                                    <div className="list-group list-group-flush">
                                        {suggestions.map((prod) => (
                                            <div
                                                key={prod.id}
                                                className="list-group-item list-group-item-action d-flex align-items-center p-2 cursor-pointer"
                                                onClick={() => handleSuggestionClick(prod.id)}
                                                style={{ cursor: 'pointer' }}
                                            >
                                                <img src={prod.image || "https://via.placeholder.com/50"} alt={prod.name} className="rounded me-3" style={{ width: '40px', height: '40px', objectFit: 'contain' }} />
                                                <div className="flex-grow-1">
                                                    <div className="fw-bold text-dark text-truncate" style={{ fontSize: '0.9rem' }}>{prod.name}</div>
                                                    <div className="small text-danger">
                                                        {prod.sale_price.toLocaleString('vi-VN')}đ
                                                        {prod.price > prod.sale_price && <del className="text-muted ms-2">{prod.price.toLocaleString('vi-VN')}đ</del>}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="list-group-item list-group-item-action text-center text-primary small fw-bold py-2 bg-light cursor-pointer" onClick={handleSearch} style={{ cursor: 'pointer' }}>
                                            Xem tất cả kết quả cho "{keyword}"
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ICONS */}
                    <div className="col-md-4 col-lg-3 text-center text-lg-end">
                        <div className="d-inline-flex align-items-center">

                            {/* --- ICON USER MỚI (DÀNH CHO MOBILE/TABLET HOẶC TRANG CHÍNH) --- */}
                            <Link to="/login" className="me-4 text-muted d-block d-lg-none">
                                <i className="fas fa-user fa-2x"></i>
                            </Link>
                            {/* ----------------------------------------------------------- */}


                            {/* --- GIỎ HÀNG (Icon + Text) --- */}
                            <Link to="/cart" className="d-flex align-items-center text-muted text-decoration-none">

                                {/* 1. Phần Icon và Số lượng (Badge) */}
                                <div className="position-relative">
                                    <i className="fas fa-shopping-bag fa-2x text-primary"></i>
                                    <span
                                        className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-warning text-dark"
                                        style={{ fontSize: '10px', border: '2px solid #fff' }}
                                    >
                                        1
                                    </span>
                                </div>

                                {/* 2. Phần chữ "Giỏ hàng" (Thêm margin-start để cách icon ra) */}
                                <div className="ms-2 d-none d-xl-block"> {/* Chỉ hiện chữ trên màn hình lớn */}
                                    <span className="fw-bold text-dark" style={{ fontSize: '0.9rem' }}>Giỏ hàng</span>
                                </div>
                            </Link>
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
};

export default Header;
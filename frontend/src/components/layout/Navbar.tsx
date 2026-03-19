import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { axiosInstance } from '../../api/axios';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Category {
    id: number;
    name: string;
    slug: string;
    children?: Category[];
}

// ─── Component ───────────────────────────────────────────────────────────────
const Navbar: React.FC = () => {
    const location = useLocation();
    const [categories, setCategories] = useState<Category[]>([]);
    const [catOpen, setCatOpen] = useState(false);
    const catRef = useRef<HTMLDivElement>(null);
    const hoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

    const isActive = (path: string) => location.pathname === path ? 'active' : '';

    // ── Fetch categories from Laravel API ────────────────────────────────────
    useEffect(() => {
        axiosInstance
            .get<{ data: Category[] }>('/categories', { params: { type: 'tree' } })
            .then((res) => setCategories(res.data.data ?? []))
            .catch((err) => console.error('Lỗi tải danh mục:', err));
    }, []);

    // ── Close dropdown when clicking outside ────────────────────────────────
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (catRef.current && !catRef.current.contains(e.target as Node)) {
                setCatOpen(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // ── Hover helpers (small delay so tiny cursor gaps don't close menu) ─────
    const handleMouseEnter = () => {
        if (hoverTimer.current) clearTimeout(hoverTimer.current);
        setCatOpen(true);
    };
    const handleMouseLeave = () => {
        hoverTimer.current = setTimeout(() => setCatOpen(false), 150);
    };

    return (
        <>
            {/* ── Inline styles for the hover dropdown transition ── */}
            <style>{`
                .cat-dropdown-wrap {
                    position: relative;
                }
                .cat-dropdown-menu {
                    position: absolute;
                    top: 100%;
                    left: 0;
                    z-index: 1050;
                    min-width: 250px;
                    background: #fff;
                    border-radius: 0 0 8px 8px;
                    box-shadow: 0 8px 24px rgba(0,0,0,.13);
                    overflow: hidden;
                    /* slide-down animation */
                    max-height: 0;
                    opacity: 0;
                    transform: translateY(-6px);
                    pointer-events: none;
                    transition: max-height .28s ease, opacity .22s ease, transform .22s ease;
                }
                .cat-dropdown-wrap.open .cat-dropdown-menu {
                    max-height: 520px;
                    opacity: 1;
                    transform: translateY(0);
                    pointer-events: auto;
                }
                .cat-dropdown-menu .cat-parent-link {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    padding: 10px 16px;
                    font-weight: 600;
                    color: #222;
                    text-decoration: none;
                    border-bottom: 1px solid #f0f0f0;
                    transition: background .15s, color .15s;
                }
                .cat-dropdown-menu .cat-parent-link:hover {
                    background: #f5f5ff;
                    color: var(--bs-primary, #0d6efd);
                }
                .cat-dropdown-menu .cat-parent-link .cat-icon {
                    width: 22px;
                    text-align: center;
                    color: var(--bs-primary, #0d6efd);
                    font-size: .85rem;
                }
                .cat-dropdown-menu .cat-children {
                    list-style: none;
                    margin: 0;
                    padding: 0;
                }
                .cat-dropdown-menu .cat-child-link {
                    display: block;
                    padding: 6px 16px 6px 42px;
                    font-size: .875rem;
                    color: #555;
                    text-decoration: none;
                    border-bottom: 1px solid #f8f8f8;
                    transition: background .15s, color .15s;
                }
                .cat-dropdown-menu .cat-child-link:hover {
                    background: #eef2ff;
                    color: var(--bs-primary, #0d6efd);
                }
                .cat-dropdown-menu .cat-togglebtn {
                    display: flex;
                    align-items: center;
                    width: 100%;
                    background: none;
                    border: 0;
                    padding: 10px 16px;
                    font-weight: 600;
                    color: #222;
                    text-align: left;
                    border-bottom: 1px solid #f0f0f0;
                    cursor: pointer;
                    gap: 8px;
                    transition: background .15s, color .15s;
                }
                .cat-dropdown-menu .cat-togglebtn:hover {
                    background: #f5f5ff;
                    color: var(--bs-primary, #0d6efd);
                }
                .cat-dropdown-menu .cat-togglebtn .cat-icon {
                    width: 22px;
                    text-align: center;
                    color: var(--bs-primary, #0d6efd);
                    font-size: .85rem;
                }
            `}</style>

            <div className="container-fluid nav-bar p-0">
                <div className="row gx-0 bg-primary px-5 align-items-center">

                    {/* ── LEFT COL: Category button + dropdown (desktop) ── */}
                    <div className="col-lg-3 d-none d-lg-block">
                        <div
                            ref={catRef}
                            className={`cat-dropdown-wrap${catOpen ? ' open' : ''}`}
                            style={{ maxWidth: 250 }}
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                        >
                            {/* Trigger button */}
                            <button
                                className="border-0 w-100 px-3 py-2 text-start bg-white text-primary rounded shadow-sm d-flex align-items-center gap-2"
                                style={{ cursor: 'pointer' }}
                                onClick={() => setCatOpen((v) => !v)}
                                aria-expanded={catOpen}
                            >
                                <i className="fa fa-bars fs-5"></i>
                                <span className="fw-bold fs-6">Danh Mục</span>
                                <i className={`fa fa-chevron-down ms-auto small transition-transform${catOpen ? ' rotate-180' : ''}`}
                                    style={{ transition: 'transform .25s', transform: catOpen ? 'rotate(180deg)' : 'rotate(0)' }}
                                />
                            </button>

                            {/* Slide-down menu */}
                            <div className="cat-dropdown-menu">
                                {categories.length === 0 && (
                                    <p className="text-muted text-center py-3 mb-0 small">Đang tải…</p>
                                )}
                                {categories.map((cat) =>
                                    cat.children && cat.children.length > 0 ? (
                                        <div key={cat.id}>
                                            {/* Parent as plain label, children are links */}
                                            <Link
                                                to={`/shop?category=${cat.id}`}
                                                className="cat-parent-link"
                                                onClick={() => setCatOpen(false)}
                                            >
                                                <span className="cat-icon"><i className="fas fa-tag" /></span>
                                                {cat.name}
                                            </Link>
                                            <ul className="cat-children">
                                                {cat.children.map((child) => (
                                                    <li key={child.id}>
                                                        <Link
                                                            to={`/shop?category=${child.id}`}
                                                            className="cat-child-link"
                                                            onClick={() => setCatOpen(false)}
                                                        >
                                                            <i className="fas fa-angle-right me-2 text-muted" />
                                                            {child.name}
                                                        </Link>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    ) : (
                                        <Link
                                            key={cat.id}
                                            to={`/shop?category=${cat.id}`}
                                            className="cat-parent-link"
                                            onClick={() => setCatOpen(false)}
                                        >
                                            <span className="cat-icon"><i className="fas fa-tag" /></span>
                                            {cat.name}
                                        </Link>
                                    )
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ── RIGHT COL: Main nav ── */}
                    <div className="col-12 col-lg-9">
                        <nav className="navbar navbar-expand-lg navbar-light bg-primary">

                            {/* Logo Mobile */}
                            <Link to="/" className="navbar-brand d-block d-lg-none">
                                <h1 className="display-5 text-white m-0 fw-bold">
                                    <i className="fas fa-satellite-dish text-white me-2"></i>SpaceLink
                                </h1>
                            </Link>

                            {/* Toggle Mobile */}
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
                                    <Link to="/" className={`nav-item nav-link px-3 ${isActive('/')}`}>Trang Chủ</Link>
                                    <Link to="/about" className={`nav-item nav-link px-3 ${isActive('/about')}`}>Giới Thiệu</Link>
                                    <Link to="/shop" className={`nav-item nav-link px-3 ${isActive('/shop')}`}>Sản Phẩm</Link>

                                    {/* Tin Tức dropdown */}
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

                                    <Link to="/contact" className={`nav-item nav-link px-3 me-2 ${isActive('/contact')}`}>Liên Hệ</Link>

                                    {/* Danh mục Mobile */}
                                    <div className="nav-item dropdown d-block d-lg-none mb-3">
                                        <a href="#" className="nav-link dropdown-toggle px-3 text-warning fw-bold" data-bs-toggle="dropdown">
                                            <i className="fas fa-list me-2"></i>Danh Mục Sản Phẩm
                                        </a>
                                        <div className="dropdown-menu m-0 shadow-sm border-0 rounded-0">
                                            {categories.map((cat) => (
                                                <React.Fragment key={cat.id}>
                                                    <Link
                                                        to={`/shop?category=${cat.id}`}
                                                        className="dropdown-item fw-semibold"
                                                    >
                                                        {cat.name}
                                                    </Link>
                                                    {cat.children?.map((child) => (
                                                        <Link
                                                            key={child.id}
                                                            to={`/shop?category=${child.id}`}
                                                            className="dropdown-item ps-4 small text-muted"
                                                        >
                                                            ↳ {child.name}
                                                        </Link>
                                                    ))}
                                                </React.Fragment>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Hotline button */}
                                <a href="tel:19001234" className="btn btn-secondary rounded-pill py-2 px-4 px-lg-3 mb-3 mb-md-3 mb-lg-0 fw-bold shadow-sm hover-up">
                                    <i className="fa fa-phone-alt me-2"></i>1900 1234
                                </a>
                            </div>
                        </nav>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Navbar;
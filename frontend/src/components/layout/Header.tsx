import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useWishlist } from '../../context/WishlistContext';
import { useUserNotifications } from '../../hooks/useUserNotifications';
import { axiosInstance } from '../../api/axios';

const formatVND = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

interface ProductSuggestion {
    id: number;
    name: string;
    slug: string;
    price: number;
    sale_price: number | null;
    thumbnail_url: string | null;
}

const Header: React.FC = () => {
    const { user, logout } = useAuth();
    const { totalItems } = useCart();
    const { totalItems: totalWishlistItems } = useWishlist();
    const { notifications, unreadCount, markAllRead, markRead } = useUserNotifications(!!user);
    const [notifOpen, setNotifOpen] = useState(false);
    const notifRef = useRef<HTMLDivElement>(null);


    // --- STATE CHO TÌM KIẾM ---
    const [keyword, setKeyword] = useState("");
    const [suggestions, setSuggestions] = useState<ProductSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const navigate = useNavigate();
    const wrapperRef = useRef<HTMLDivElement>(null);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // --- Debounce call API autocomplete ---
    const fetchSuggestions = useCallback(async (q: string) => {
        if (q.trim().length < 1) {
            setSuggestions([]);
            setShowSuggestions(false);
            return;
        }
        setIsLoading(true);
        try {
            const res = await axiosInstance.get<{ data: ProductSuggestion[] }>('/search/autocomplete', {
                params: { q: q.trim() },
            });
            const data = res.data.data ?? [];
            setSuggestions(data);
            setShowSuggestions(data.length > 0);
        } catch {
            setSuggestions([]);
            setShowSuggestions(false);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            fetchSuggestions(keyword);
        }, 300);
        return () => {
            if (debounceRef.current) clearTimeout(debounceRef.current);
        };
    }, [keyword, fetchSuggestions]);

    // --- Đóng dropdown khi click ra ngoài ---
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setShowSuggestions(false);
            }
            if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
                setNotifOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearch = () => {
        if (!keyword.trim()) return;
        setShowSuggestions(false);
        navigate(`/search?keyword=${encodeURIComponent(keyword)}`);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSearch();
    };

    const handleSuggestionClick = (id: number) => {
        setShowSuggestions(false);
        setKeyword("");
        navigate(`/product/${id}`);
    };

    return (
        <>
            <div className="container-fluid px-5 d-none border-bottom d-lg-block bg-light">
                <div className="row gx-0 align-items-center">
                    <div className="col-lg-4 text-center text-lg-start mb-lg-0">
                        <div className="d-inline-flex align-items-center" style={{ height: '45px' }}>
                            <small className="me-3 text-muted">
                                <i className="fa fa-map-marker-alt text-primary me-2"></i>
                                123 Cầu Giấy, Hà Nội
                            </small>
                            <small className="text-muted">
                                <i className="fa fa-envelope text-primary me-2"></i>
                                hotro@spacelink.vn
                            </small>
                        </div>
                    </div>

                    <div className="col-lg-4 text-center d-flex align-items-center justify-content-center">
                        <small className="text-dark me-2">Hotline:</small>
                        <a
                            href="tel:19001234"
                            className="text-primary fw-bold text-decoration-none"
                            style={{ letterSpacing: '1px' }}
                        >
                            1900 1234
                        </a>
                    </div>

                    <div className="col-lg-4 text-center text-lg-end">
                        <div className="d-inline-flex align-items-center" style={{ height: '45px' }}>
                            <Link to={user ? "/profile" : "/login"} state={{ tab: 'orders' }} className="text-muted me-2 text-decoration-none">
                                <small>Tra cứu đơn hàng</small>
                            </Link>

                            <span className="text-muted mx-2">|</span>

                            <div className="dropdown">
                                <span className="dropdown-toggle text-muted ms-2" data-bs-toggle="dropdown" style={{ cursor: 'pointer' }}>
                                    <small><i className="fa fa-user me-2"></i> {user ? `Xin Chào, ${user.fullname}` : 'Tài khoản'}</small>
                                </span>
                                <div className="dropdown-menu rounded">
                                    {!user ? (
                                        <>
                                            <Link to="/login" className="dropdown-item">Đăng nhập</Link>
                                            <Link to="/register" className="dropdown-item">Đăng ký</Link>
                                        </>
                                    ) : (
                                        <>
                                            <Link to="/profile" className="dropdown-item">Tài khoản của tôi</Link>
                                            <button onClick={logout} className="dropdown-item w-100 text-start bg-transparent border-0">Đăng xuất</button>
                                        </>
                                    )}
                                    <Link to="/wishlist" className="dropdown-item">Yêu thích</Link>
                                    <Link to="/cart" className="dropdown-item">Giỏ hàng</Link>
                                </div>
                            </div>
                        </div >
                    </div >
                </div >
            </div >

            <div
                className="container-fluid px-5 py-4 d-none d-lg-block bg-white shadow-sm position-relative"
                style={{ zIndex: 100 }}
            >
                <div className="row gx-0 align-items-center text-center">

                    <div className="col-md-4 col-lg-3 text-center text-lg-start">
                        <Link to="/" className="navbar-brand p-0">
                            <h1 className="display-5 text-primary m-0 fw-bold">
                                <i className="fas fa-satellite-dish text-secondary me-2"></i>
                                SpaceLink
                            </h1>
                            <span
                                className="text-muted small"
                                style={{ fontSize: '12px', letterSpacing: '2px', paddingLeft: '5px' }}
                            >
                                KẾT NỐI TƯƠNG LAI
                            </span>
                        </Link>
                    </div>

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
                                    className="btn btn-primary rounded-0 py-3 px-4 border-0"
                                    onClick={handleSearch}
                                >
                                    <i className="fas fa-search fs-5"></i>
                                </button>
                            </div>

                            {/* Loading indicator */}
                            {isLoading && keyword.trim().length >= 1 && (
                                <div
                                    className="position-absolute start-0 mt-1 bg-white shadow rounded-3 border text-center py-2 px-3"
                                    style={{ zIndex: 101, top: '100%', marginLeft: '24px', width: 'calc(100% - 24px)', fontSize: '0.875rem', color: '#888' }}
                                >
                                    <i className="fas fa-spinner fa-spin me-2"></i>Đang tìm kiếm...
                                </div>
                            )}

                            {/* Suggestions dropdown */}
                            {!isLoading && showSuggestions && suggestions.length > 0 && (
                                <div
                                    className="position-absolute start-0 mt-1 w-100 bg-white shadow-lg rounded-3 border overflow-hidden text-start"
                                    style={{ zIndex: 101, top: '100%', marginLeft: '24px', width: 'calc(100% - 24px)' }}
                                >
                                    <div className="list-group list-group-flush">

                                        {suggestions.map((prod) => (
                                            <div
                                                key={prod.id}
                                                className="list-group-item list-group-item-action d-flex align-items-center p-2"
                                                style={{ cursor: 'pointer' }}
                                                onClick={() => handleSuggestionClick(prod.id)}
                                            >
                                                <img
                                                    src={prod.thumbnail_url || "https://via.placeholder.com/50"}
                                                    alt={prod.name}
                                                    className="rounded me-3"
                                                    style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                                                />

                                                <div className="flex-grow-1">
                                                    <div
                                                        className="fw-bold text-dark text-truncate"
                                                        style={{ fontSize: '0.9rem' }}
                                                    >
                                                        {prod.name}
                                                    </div>

                                                    <div className="small text-danger">
                                                        {formatVND(prod.sale_price ?? prod.price)}
                                                        {prod.sale_price && prod.price > prod.sale_price && (
                                                            <del className="text-muted ms-2">
                                                                {formatVND(prod.price)}
                                                            </del>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}

                                        <div
                                            className="list-group-item list-group-item-action text-center text-primary small fw-bold py-2 bg-light"
                                            style={{ cursor: 'pointer' }}
                                            onClick={handleSearch}
                                        >
                                            <i className="fas fa-search me-1"></i>Xem tất cả kết quả cho "{keyword}"
                                        </div>

                                    </div>
                                </div>
                            )}

                        </div>
                    </div>

                    <div className="col-md-4 col-lg-3 text-center text-lg-end">
                        <div className="d-inline-flex align-items-center">

                            <Link to="/login" className="me-4 text-muted d-block d-lg-none">
                                <i className="fas fa-user fa-2x"></i>
                            </Link>

                            <Link to="/wishlist" className="d-flex align-items-center text-muted text-decoration-none me-4">
                                <div className="position-relative">
                                    <i className="fas fa-heart fa-2x text-primary"></i>
                                    <span
                                        className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-warning text-dark"
                                        style={{ fontSize: '10px', border: '2px solid #fff' }}
                                    >
                                        {totalWishlistItems > 0 ? (totalWishlistItems > 99 ? '99+' : totalWishlistItems) : ''}
                                    </span>
                                </div>
                            </Link>

                            {/* 🔔 Notification Bell */}
                            {user && (
                                <div className="position-relative me-4" ref={notifRef}>
                                    <button
                                        className="btn p-0 border-0 bg-transparent position-relative"
                                        onClick={() => setNotifOpen(!notifOpen)}
                                        title="Thông báo"
                                        id="client-notification-bell"
                                    >
                                        <i className={`fas fa-bell fa-2x ${unreadCount > 0 ? 'text-primary' : 'text-muted'}`}
                                           style={{ transition: 'color 0.2s' }} />
                                        {unreadCount > 0 && (
                                            <span
                                                className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-danger"
                                                style={{ fontSize: '10px', border: '2px solid #fff', minWidth: 18 }}
                                            >
                                                {unreadCount > 99 ? '99+' : unreadCount}
                                            </span>
                                        )}
                                    </button>

                                    {notifOpen && (
                                        <div
                                            className="position-absolute shadow-lg bg-white border"
                                            style={{
                                                top: 'calc(100% + 12px)', right: 0, width: 370, borderRadius: 14,
                                                zIndex: 9999, overflow: 'hidden',
                                                animation: 'fadeInDown 0.2s ease',
                                            }}
                                        >
                                            {/* Header */}
                                            <div className="d-flex align-items-center justify-content-between px-3 py-2"
                                                 style={{ borderBottom: '1px solid #f0f0f0', background: '#fafbfc' }}>
                                                <span style={{ fontWeight: 700, fontSize: 14, color: '#1a1a2e' }}>
                                                    🔔 Thông báo
                                                    {unreadCount > 0 && (
                                                        <span style={{
                                                            marginLeft: 8, background: '#ff4d4f', color: '#fff',
                                                            borderRadius: 10, padding: '1px 7px', fontSize: 11, fontWeight: 700,
                                                        }}>{unreadCount}</span>
                                                    )}
                                                </span>
                                                {unreadCount > 0 && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); markAllRead(); }}
                                                        className="btn btn-sm p-0 border-0 bg-transparent"
                                                        style={{ color: '#0d6efd', fontSize: 12, fontWeight: 600 }}
                                                    >
                                                        <i className="fas fa-check-double me-1" /> Đọc tất cả
                                                    </button>
                                                )}
                                            </div>

                                            {/* Notification List */}
                                            <div style={{ maxHeight: 400, overflowY: 'auto' }}>
                                                {notifications.length === 0 ? (
                                                    <div className="text-center py-5" style={{ color: '#adb5bd' }}>
                                                        <i className="fas fa-bell-slash" style={{ fontSize: 32, display: 'block', marginBottom: 8 }} />
                                                        Chưa có thông báo nào
                                                    </div>
                                                ) : notifications.map(n => {
                                                    const typeIcon: Record<string, string> = {
                                                        order_confirmed: '✅', order_processing: '📦', order_shipping: '🚚',
                                                        order_delivered: '📬', order_cancelled: '❌', order_completed: '🎉',
                                                        return_approved: '✅', return_rejected: '❌', payment_refunded: '💰',
                                                        cancel_approved: '✅', cancel_rejected: '❌', payment_success: '💳',
                                                    };
                                                    const icon = typeIcon[n.type] ?? '📋';
                                                    return (
                                                        <div
                                                            key={n.id}
                                                            onClick={() => {
                                                                if (!n.is_read) markRead(n.id);
                                                                if (n.order_id) navigate(`/order/${n.order_id}`);
                                                                setNotifOpen(false);
                                                            }}
                                                            className="notif-item"
                                                            style={{
                                                                display: 'flex', gap: 10, padding: '12px 16px',
                                                                background: n.is_read ? '#fff' : '#f0f6ff',
                                                                borderBottom: '1px solid #f5f5f5',
                                                                cursor: n.order_id ? 'pointer' : 'default',
                                                                transition: 'background 0.15s',
                                                            }}
                                                            onMouseEnter={e => (e.currentTarget.style.background = n.is_read ? '#f8f9fa' : '#e8f0fe')}
                                                            onMouseLeave={e => (e.currentTarget.style.background = n.is_read ? '#fff' : '#f0f6ff')}
                                                        >
                                                            <span style={{ fontSize: 18, flexShrink: 0, marginTop: 2 }}>{icon}</span>
                                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                                <div style={{
                                                                    fontWeight: n.is_read ? 500 : 700, fontSize: 13,
                                                                    color: '#1a1a2e', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                                                                }}>{n.title}</div>
                                                                <div style={{
                                                                    fontSize: 12, color: '#6c757d', marginTop: 2,
                                                                    lineHeight: 1.4, display: '-webkit-box',
                                                                    WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                                                }}>{n.content}</div>
                                                                <div style={{ fontSize: 11, color: '#adb5bd', marginTop: 4 }}>
                                                                    {new Date(n.created_at).toLocaleString('vi-VN')}
                                                                </div>
                                                            </div>
                                                            {!n.is_read && (
                                                                <span style={{
                                                                    width: 8, height: 8, borderRadius: '50%',
                                                                    background: '#0d6efd', flexShrink: 0, marginTop: 6,
                                                                }} />
                                                            )}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            <Link to="/cart" className="d-flex align-items-center text-muted text-decoration-none">
                                <div className="position-relative">
                                    <i className="fas fa-shopping-bag fa-2x text-primary"></i>

                                    <span
                                        className="position-absolute top-0 start-100 translate-middle badge rounded-pill bg-warning text-dark"
                                        style={{ fontSize: '10px', border: '2px solid #fff' }}
                                    >
                                        {totalItems > 0 ? (totalItems > 99 ? '99+' : totalItems) : ''}
                                    </span>
                                </div>

                                <div className="ms-2 d-none d-xl-block">
                                    <span
                                        className="fw-bold text-dark"
                                        style={{ fontSize: '0.9rem' }}
                                    >
                                        Giỏ hàng
                                    </span>
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
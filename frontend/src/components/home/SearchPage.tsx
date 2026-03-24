import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { axiosInstance } from '../../api/axios';

const formatVND = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

interface Product {
    id: number;
    name: string;
    slug: string;
    price: number;
    sale_price?: number | null;
    thumbnail_url?: string | null;
    category?: { id: number; name: string; slug: string } | null;
    brand?: { id: number; name: string } | null;
}

interface Pagination {
    total: number;
    per_page: number;
    current_page: number;
    last_page: number;
}

const SearchPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();

    const keyword = searchParams.get('keyword') || '';
    const currentPage = parseInt(searchParams.get('page') || '1', 10);

    const [products, setProducts] = useState<Product[]>([]);
    const [pagination, setPagination] = useState<Pagination | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [searchInput, setSearchInput] = useState(keyword);

    const fetchResults = useCallback(async (q: string, page: number) => {
        if (!q.trim()) {
            setProducts([]);
            setPagination(null);
            return;
        }
        setIsLoading(true);
        try {
            const res = await axiosInstance.get('/search', {
                params: { q: q.trim(), type: 'products', per_page: 12, page },
            });
            const productData = res.data?.data?.products;
            setProducts(productData?.data ?? []);
            setPagination(productData ? {
                total: productData.total,
                per_page: productData.per_page,
                current_page: productData.current_page,
                last_page: productData.last_page,
            } : null);
        } catch {
            setProducts([]);
            setPagination(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Sync search input với URL keyword
    useEffect(() => {
        setSearchInput(keyword);
    }, [keyword]);

    useEffect(() => {
        fetchResults(keyword, currentPage);
    }, [keyword, currentPage, fetchResults]);

    const handleSearch = () => {
        if (!searchInput.trim()) return;
        setSearchParams({ keyword: searchInput.trim(), page: '1' });
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleSearch();
    };

    const goToPage = (page: number) => {
        setSearchParams({ keyword, page: String(page) });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    return (
        <div className="container-fluid py-5 bg-light min-vh-100">
            <div className="container py-3">
                {/* Breadcrumb */}
                <nav aria-label="breadcrumb">
                    <ol className="breadcrumb">
                        <li className="breadcrumb-item"><Link to="/">Trang chủ</Link></li>
                        <li className="breadcrumb-item active">Tìm kiếm</li>
                    </ol>
                </nav>

                {/* Search bar on page */}
                <div className="d-flex gap-2 mb-4" style={{ maxWidth: 560 }}>
                    <input
                        type="text"
                        className="form-control border-2 border-primary rounded-pill px-4"
                        placeholder="Tìm kiếm sản phẩm..."
                        value={searchInput}
                        onChange={e => setSearchInput(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <button className="btn btn-primary rounded-pill px-4" onClick={handleSearch}>
                        <i className="fas fa-search me-1"/> 
                    </button>
                </div>

                {/* Tiêu đề */}
                <div className="mb-4 border-bottom pb-3">
                    <h3>
                        Kết quả tìm kiếm: <span className="text-primary fw-bold">"{keyword}"</span>
                    </h3>
                    {!isLoading && (
                        <p className="text-muted mb-0">
                            Tìm thấy <span className="fw-bold text-dark">{pagination?.total ?? 0}</span> sản phẩm.
                        </p>
                    )}
                </div>

                {/* Products grid */}
                {isLoading ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status">
                            <span className="visually-hidden">Đang tải...</span>
                        </div>
                    </div>
                ) : products.length > 0 ? (
                    <>
                        <div className="row g-4">
                            {products.map(product => {
                                const price = product.sale_price && product.sale_price < product.price
                                    ? product.sale_price
                                    : product.price;
                                const oldPrice = product.sale_price && product.sale_price < product.price
                                    ? product.price
                                    : undefined;

                                return (
                                    <div key={product.id} className="col-6 col-md-4 col-lg-3">
                                        <div
                                            className="card h-100 border-0 shadow-sm"
                                            style={{ borderRadius: 12, cursor: 'pointer', transition: 'transform .2s, box-shadow .2s' }}
                                            onClick={() => navigate(`/product/${product.id}`)}
                                            onMouseEnter={e => {
                                                (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                                                (e.currentTarget as HTMLDivElement).style.boxShadow = '0 8px 24px rgba(0,0,0,.12)';
                                            }}
                                            onMouseLeave={e => {
                                                (e.currentTarget as HTMLDivElement).style.transform = '';
                                                (e.currentTarget as HTMLDivElement).style.boxShadow = '';
                                            }}
                                        >
                                            {/* Product image */}
                                            <div
                                                className="d-flex align-items-center justify-content-center bg-white rounded-top"
                                                style={{ height: 200, overflow: 'hidden', borderRadius: '12px 12px 0 0' }}
                                            >
                                                <img
                                                    src={product.thumbnail_url || 'https://via.placeholder.com/200'}
                                                    alt={product.name}
                                                    style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', padding: 8 }}
                                                />
                                            </div>

                                            <div className="card-body p-3">
                                                {product.category && (
                                                    <div className="text-muted small text-uppercase mb-1" style={{ fontSize: '0.75rem' }}>
                                                        {product.category.name}
                                                    </div>
                                                )}
                                                <div
                                                    className="fw-semibold text-dark mb-2"
                                                    style={{ fontSize: '0.92rem', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                                                >
                                                    {product.name}
                                                </div>
                                                <div className="d-flex align-items-center gap-2 flex-wrap">
                                                    <span className="fw-bold text-danger" style={{ fontSize: '1rem' }}>
                                                        {formatVND(price)}
                                                    </span>
                                                    {oldPrice && (
                                                        <del className="text-muted" style={{ fontSize: '0.82rem' }}>
                                                            {formatVND(oldPrice)}
                                                        </del>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Pagination */}
                        {pagination && pagination.last_page > 1 && (
                            <div className="d-flex justify-content-center mt-5 gap-2">
                                <button
                                    className="btn btn-outline-primary rounded-pill px-3"
                                    disabled={currentPage <= 1}
                                    onClick={() => goToPage(currentPage - 1)}
                                >
                                    <i className="fas fa-chevron-left" />
                                </button>

                                {Array.from({ length: pagination.last_page }, (_, i) => i + 1).map(page => (
                                    <button
                                        key={page}
                                        className={`btn rounded-pill px-3 ${page === currentPage ? 'btn-primary' : 'btn-outline-secondary'}`}
                                        onClick={() => goToPage(page)}
                                    >
                                        {page}
                                    </button>
                                ))}

                                <button
                                    className="btn btn-outline-primary rounded-pill px-3"
                                    disabled={currentPage >= pagination.last_page}
                                    onClick={() => goToPage(currentPage + 1)}
                                >
                                    <i className="fas fa-chevron-right" />
                                </button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-5 bg-white rounded shadow-sm">
                        <i className="fas fa-search fa-4x text-muted mb-3 opacity-25" />
                        <h4 className="text-dark">Không tìm thấy sản phẩm nào!</h4>
                        <p className="text-muted">Thử tìm kiếm với từ khóa khác.</p>
                        <Link to="/shop" className="btn btn-primary rounded-pill px-4 mt-2">
                            Xem tất cả sản phẩm
                        </Link>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchPage;
import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCompare, type CompareProduct } from '../context/CompareContext';
import { useCart } from '../context/CartContext';
import { axiosInstance } from '../api/axios';
import { toast } from 'react-toastify';

interface DetailedProduct extends CompareProduct {
    brand?: string;
    stock?: number;
    sku?: string;
    variantId?: number;
}

const formatVND = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

const ComparePage: React.FC = () => {
    const { compareList, removeFromCompare, clearCompare } = useCompare();
    const { addToCart } = useCart();
    const navigate = useNavigate();
    const [details, setDetails] = useState<Record<string, DetailedProduct>>({});
    const [loading, setLoading] = useState(false);

    // Fetch detailed info for all products in compareList
    useEffect(() => {
        if (compareList.length === 0) return;

        const fetchDetails = async () => {
            setLoading(true);
            const results: Record<string, DetailedProduct> = {};

            await Promise.all(
                compareList.map(async (product) => {
                    try {
                        const res = await axiosInstance.get(`/products/${product.id}`);
                        const p = res.data.data;
                        results[product.id] = {
                            id: String(p.id),
                            name: p.name,
                            image: product.image, // use the already-resolved image
                            price: p.sale_price ? Number(p.sale_price) : Number(p.price),
                            oldPrice: p.sale_price ? Number(p.price) : undefined,
                            category: p.category?.name ?? '—',
                            brand: p.brand?.name ?? '—',
                            stock: p.quantity ?? 0,
                            sku: p.sku ?? '—',
                            rating: product.rating,
                            variantId: p.variants?.[0]?.id,
                        };
                    } catch {
                        results[product.id] = { ...product };
                    }
                })
            );

            setDetails(results);
            setLoading(false);
        };

        fetchDetails();
    }, [compareList]);

    const handleAddToCart = (product: DetailedProduct) => {
        if (product.variantId) {
            addToCart(product.variantId, 1);
            toast.success(`Đã thêm "${product.name}" vào giỏ hàng!`);
        } else {
            toast.error('Sản phẩm này không có biến thể, vui lòng xem trang chi tiết.');
        }
    };

    // ── Rows to compare ─────────────────────────────────────────────────
    const rows: { label: string; key: keyof DetailedProduct; render?: (val: any, p: DetailedProduct) => React.ReactNode }[] = [
        { label: 'Giá', key: 'price', render: (_, p) => (
            <div>
                <span className="fw-bold text-danger" style={{ fontSize: 18 }}>{formatVND(p.price)}</span>
                {p.oldPrice && p.oldPrice > p.price && (
                    <><br /><del className="text-muted small">{formatVND(p.oldPrice)}</del></>
                )}
            </div>
        )},
        { label: 'Danh mục', key: 'category' },
        { label: 'Thương hiệu', key: 'brand' },
        { label: 'Tồn kho', key: 'stock', render: (val) => (
            <span className={val > 0 ? 'text-success' : 'text-danger'}>
                {val > 0 ? `Còn ${val} sản phẩm` : 'Hết hàng'}
            </span>
        )},
        { label: 'SKU', key: 'sku' },
        { label: 'Đánh giá', key: 'rating', render: (val) => (
            <div className="d-flex gap-1 justify-content-center">
                {Array.from({ length: 5 }).map((_, i) => (
                    <i key={i} className={`fas fa-star small ${i < Math.round(val ?? 4) ? 'text-warning' : 'text-muted'}`} />
                ))}
            </div>
        )},
    ];

    // ─────────────────────────────────────────────────────────────────────
    return (
        <div style={{ minHeight: '80vh', background: '#f8f9fa', paddingBottom: 80 }}>
            {/* Header */}
            <div style={{ background: 'linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)', padding: '48px 0 32px' }}>
                <div className="container">
                    <nav className="mb-3">
                        <ol className="breadcrumb mb-0">
                            <li className="breadcrumb-item">
                                <Link to="/" className="text-white-50 text-decoration-none">Trang chủ</Link>
                            </li>
                            <li className="breadcrumb-item active text-white">So sánh sản phẩm</li>
                        </ol>
                    </nav>
                    <h1 className="text-white fw-bold mb-1" style={{ fontSize: 32 }}>
                        <i className="fas fa-balance-scale me-3" />
                        So Sánh Sản Phẩm
                    </h1>
                    <p className="text-white-50 mb-0">Tối đa 4 sản phẩm cùng lúc</p>
                </div>
            </div>

            <div className="container py-4">
                {/* Empty state */}
                {compareList.length === 0 && (
                    <div className="text-center py-5">
                        <i className="fas fa-balance-scale fa-4x text-muted mb-4" style={{ opacity: 0.3 }} />
                        <h4 className="text-muted mb-3">Chưa có sản phẩm nào để so sánh</h4>
                        <p className="text-muted mb-4">Hãy thêm sản phẩm từ trang cửa hàng bằng cách bấm nút <strong>"So sánh"</strong></p>
                        <button onClick={() => navigate('/shop')} className="btn btn-primary px-5 py-2" style={{ borderRadius: 10, fontWeight: 600 }}>
                            <i className="fas fa-store me-2" />Đến cửa hàng
                        </button>
                    </div>
                )}

                {/* Compare table */}
                {compareList.length > 0 && (
                    <>
                        {/* Controls */}
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <span className="text-muted">Đang so sánh <strong>{compareList.length}</strong> sản phẩm</span>
                            <div className="d-flex gap-2">
                                <button onClick={() => navigate('/shop')} className="btn btn-outline-primary btn-sm" style={{ borderRadius: 8 }}>
                                    <i className="fas fa-plus me-1" />Thêm sản phẩm
                                </button>
                                <button onClick={clearCompare} className="btn btn-outline-danger btn-sm" style={{ borderRadius: 8 }}>
                                    <i className="fas fa-trash me-1" />Xóa tất cả
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div className="text-center py-5">
                                <div className="spinner-border text-primary" />
                                <p className="mt-3 text-muted">Đang tải thông tin sản phẩm...</p>
                            </div>
                        ) : (
                            <div className="card border-0 shadow-sm" style={{ borderRadius: 16, overflow: 'hidden' }}>
                                <div className="table-responsive">
                                    <table className="table mb-0" style={{ minWidth: 600 }}>
                                        <thead>
                                            <tr style={{ background: '#f8f9fa' }}>
                                                <th style={{ width: 140, verticalAlign: 'middle', padding: '16px 20px', color: '#6c757d', fontWeight: 600, fontSize: 13 }}>
                                                    Thông tin
                                                </th>
                                                {compareList.map(product => {
                                                    const detail = details[product.id] || product;
                                                    return (
                                                        <th key={product.id} style={{ textAlign: 'center', padding: '20px 16px', verticalAlign: 'top', minWidth: 200 }}>
                                                            {/* Product card in header */}
                                                            <div style={{ position: 'relative' }}>
                                                                {/* Remove button */}
                                                                <button
                                                                    onClick={() => removeFromCompare(product.id)}
                                                                    style={{
                                                                        position: 'absolute', top: -8, right: -8,
                                                                        width: 24, height: 24,
                                                                        borderRadius: '50%',
                                                                        background: '#dc3545',
                                                                        border: 'none',
                                                                        color: '#fff',
                                                                        fontSize: 11,
                                                                        cursor: 'pointer',
                                                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                                        zIndex: 1,
                                                                    }}
                                                                    title="Xóa sản phẩm này"
                                                                >
                                                                    ✕
                                                                </button>

                                                                {/* Image */}
                                                                <div style={{ height: 140, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fff', borderRadius: 12, border: '1px solid #e9ecef', marginBottom: 10, overflow: 'hidden' }}>
                                                                    <img
                                                                        src={detail.image || ''}
                                                                        alt={detail.name}
                                                                        style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                                                                    />
                                                                </div>

                                                                {/* Name */}
                                                                <Link
                                                                    to={`/product/${product.id}`}
                                                                    className="text-decoration-none text-dark fw-bold"
                                                                    style={{ fontSize: 13, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4' }}
                                                                >
                                                                    {detail.name}
                                                                </Link>
                                                            </div>
                                                        </th>
                                                    );
                                                })}
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {rows.map(row => (
                                                <tr key={row.key} style={{ borderTop: '1px solid #f0f0f0' }}>
                                                    <td style={{ padding: '14px 20px', fontWeight: 600, fontSize: 13, color: '#495057', background: '#fafafa', verticalAlign: 'middle' }}>
                                                        {row.label}
                                                    </td>
                                                    {compareList.map(product => {
                                                        const detail = details[product.id] || product;
                                                        const val = detail[row.key];
                                                        return (
                                                            <td key={product.id} style={{ textAlign: 'center', padding: '14px 16px', verticalAlign: 'middle' }}>
                                                                {row.render ? row.render(val, detail) : (
                                                                    <span style={{ color: '#495057', fontSize: 14 }}>{String(val ?? '—')}</span>
                                                                )}
                                                            </td>
                                                        );
                                                    })}
                                                </tr>
                                            ))}

                                            {/* CTA row */}
                                            <tr style={{ borderTop: '2px solid #e9ecef', background: '#fafafa' }}>
                                                <td style={{ padding: '16px 20px', fontWeight: 600, fontSize: 13, color: '#495057' }}>Hành động</td>
                                                {compareList.map(product => {
                                                    const detail = details[product.id] || product;
                                                    return (
                                                        <td key={product.id} style={{ textAlign: 'center', padding: '16px 16px' }}>
                                                            <div className="d-flex flex-column gap-2 align-items-center">
                                                                <button
                                                                    className="btn btn-primary btn-sm w-100"
                                                                    style={{ borderRadius: 8, fontWeight: 600, maxWidth: 160 }}
                                                                    onClick={() => handleAddToCart(detail)}
                                                                    disabled={(detail.stock ?? 0) === 0}
                                                                >
                                                                    <i className="fas fa-cart-plus me-1" />
                                                                    {(detail.stock ?? 0) === 0 ? 'Hết hàng' : 'Thêm vào giỏ'}
                                                                </button>
                                                                <Link
                                                                    to={`/product/${product.id}`}
                                                                    className="btn btn-outline-secondary btn-sm w-100"
                                                                    style={{ borderRadius: 8, maxWidth: 160 }}
                                                                >
                                                                    <i className="fas fa-eye me-1" />Xem chi tiết
                                                                </Link>
                                                            </div>
                                                        </td>
                                                    );
                                                })}
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export default ComparePage;

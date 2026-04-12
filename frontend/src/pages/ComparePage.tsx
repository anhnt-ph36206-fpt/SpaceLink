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

const CSS = `
.cp-wrapper { min-height: 80vh; background: #f8f9fa; padding-bottom: 80px; font-family: 'Inter', sans-serif; }
.cp-header { background: #fff; padding: 16px 0; border-bottom: 1px solid #e2e8f0; }

.cp-empty-state { text-align: center; padding: 60px 20px; background: #fff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.04); }
.cp-empty-state img { width: 140px; opacity: 0.5; margin-bottom: 24px; }
.cp-empty-state h4 { color: #334155; font-weight: 700; margin-bottom: 8px; font-size: 20px; }
.cp-empty-state p { color: #64748b; margin-bottom: 24px; font-size: 14px; }
.cp-empty-btn { background: #ff7a00; color: #fff; padding: 10px 24px; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; transition: background 0.2s; }
.cp-empty-btn:hover { background: #e85d00; color: #fff; }

.cp-container { background: #fff; border-radius: 16px; box-shadow: 0 4px 24px rgba(0,0,0,0.04); padding: 24px; }
.cp-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
.cp-title { font-size: 20px; font-weight: 700; color: #1e293b; margin: 0; }
.cp-actions { display: flex; gap: 12px; }
.cp-btn-add { background: #fff; border: 1.5px solid #ff7a00; color: #ff7a00; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; gap: 6px; }
.cp-btn-add:hover { background: #fff8f0; }
.cp-btn-clear { background: #fee2e2; border: none; color: #dc2626; padding: 8px 16px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; }
.cp-btn-clear:hover { background: #fca5a5; }

.cp-table-wrap { border: 1px solid #e2e8f0; border-radius: 12px; overflow-x: auto; overflow-y: hidden; background: #fff; }
.cp-table { width: 100%; border-collapse: collapse; min-width: 900px; }
.cp-table th, .cp-table td { border: 1px solid #f1f5f9; padding: 16px; }

/* Sticky Header */
.cp-th-head { position: sticky; top: 0; background: #fff; z-index: 10; vertical-align: top; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.04); }
.cp-th-label { width: 15%; min-width: 150px; background: #f8f9fa; color: #ff7a00; font-weight: 700; text-align: center; font-size: 14px; vertical-align: middle; }
.cp-th-product { width: 28.33%; min-width: 250px; text-align: center; position: relative; }

/* Product Card in Header */
.cp-head-rm { position: absolute; top: 12px; right: 12px; width: 28px; height: 28px; border-radius: 50%; background: #f1f5f9; border: none; color: #64748b; font-size: 12px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.2s; z-index: 2; }
.cp-head-rm:hover { background: #fee2e2; color: #dc2626; transform: scale(1.1); }
.cp-head-img { height: 160px; display: flex; justify-content: center; align-items: center; margin-bottom: 16px; padding: 10px; background: #fff; border-radius: 8px; }
.cp-head-img img { max-width: 100%; max-height: 100%; object-fit: contain; }
.cp-head-name { font-size: 14.5px; font-weight: 700; color: #1e293b; text-decoration: none; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 42px; line-height: 1.4; margin-bottom: 16px; transition: color 0.2s; }
.cp-head-name:hover { color: #ff7a00; }
.cp-head-btn { width: 100%; background: #d70018; color: #fff; border: none; padding: 10px; border-radius: 8px; font-weight: 600; font-size: 14px; cursor: pointer; transition: background 0.2s; }
.cp-head-btn:hover { background: #b90014; }
.cp-head-btn:disabled { background: #cbd5e1; cursor: not-allowed; }

/* Empty Slot in Header */
.cp-head-empty { height: 100%; min-height: 260px; border: 2px dashed #cbd5e1; border-radius: 12px; display: flex; flex-direction: column; justify-content: center; align-items: center; cursor: pointer; transition: all 0.2s; color: #94a3b8; background: transparent; }
.cp-head-empty:hover { border-color: #ff7a00; color: #ff7a00; background: #fff8f0; }
.cp-head-empty i.icon-big { font-size: 40px; margin-bottom: 12px; }
.cp-head-empty span { font-weight: 600; font-size: 14px; }

/* Data Rows */
.cp-row:hover td { background: #fafafa; }
.cp-td-label { background: #f8f9fa; font-weight: 600; color: #475569; font-size: 13.5px; padding: 16px; }
.cp-td-val { text-align: center; color: #334155; font-size: 14px; vertical-align: middle; }

/* Price Row */
.cp-price { color: #d70018; font-size: 16px; font-weight: 700; margin-bottom: 4px; }
.cp-oldprice { color: #94a3b8; font-size: 12px; text-decoration: line-through; }

/* Spec Group */
.cp-group-row td { background: #f1f5f9 !important; color: #ff7a00; font-weight: 700; text-transform: uppercase; font-size: 13px; letter-spacing: 0.5px; padding: 12px 16px; border-top: 2px solid #e2e8f0; }

.cp-empty-td { background: #f8f9fa; }

/* Responsive Mobile */
@media (max-width: 768px) {
    .cp-top { flex-direction: column; align-items: stretch; gap: 16px; }
    .cp-title { text-align: center; }
    .cp-actions { width: 100%; justify-content: space-between; }
    .cp-btn-add, .cp-btn-clear { flex: 1; justify-content: center; text-align: center; font-size: 14px; }
    .cp-container { padding: 16px; min-height: 50vh; }
    .cp-wrapper { padding-bottom: 30px; }
    .cp-table-wrap {
        border-radius: 8px; /* Slightly smaller radius on mobile */
    }
    .cp-table th, .cp-table td { padding: 12px 8px; }
}
`;

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
                ) : (
                    <div className="cp-container">
                        <div className="cp-top">
                            <h2 className="cp-title">So sánh {compareList.length} sản phẩm</h2>
                            <div className="cp-actions">
                                <button 
                                    onClick={() => setShowPicker(true)} 
                                    className="cp-btn-add"
                                    disabled={compareList.length >= 3}
                                    style={{ 
                                        opacity: compareList.length >= 3 ? 0.5 : 1, 
                                        cursor: compareList.length >= 3 ? 'not-allowed' : 'pointer' 
                                    }}
                                >
                                    <i className="fas fa-plus" /> Thêm sản phẩm
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

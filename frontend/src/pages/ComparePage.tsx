import React, { useEffect, useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCompare, type CompareProduct } from '../context/CompareContext';
import { axiosInstance } from '../api/axios';
import { type ProductSpecification } from '../components/product/ProductTechSpecs';
import CompareMiniPicker from '../components/common/CompareMiniPicker';

interface DetailedProduct extends CompareProduct {
    brand?: string;
    stock?: number;
    sku?: string;
    variantId?: number;
    specifications?: ProductSpecification[];
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

.cp-table-wrap { border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #fff; }
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
`;

const ComparePage: React.FC = () => {
    const { compareList, removeFromCompare, clearCompare } = useCompare();
    const navigate = useNavigate();
    const [details, setDetails] = useState<Record<string, DetailedProduct>>({});
    const [loading, setLoading] = useState(false);
    const [showPicker, setShowPicker] = useState(false);

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
                            image: product.image,
                            price: p.sale_price ? Number(p.sale_price) : Number(p.price),
                            oldPrice: p.sale_price ? Number(p.price) : undefined,
                            category: p.category?.name ?? '—',
                            brand: p.brand?.name ?? '—',
                            stock: p.quantity ?? 0,
                            sku: p.sku ?? '—',
                            rating: product.rating,
                            variantId: p.variants?.[0]?.id,
                            specifications: p.specifications,
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

    const rows: { label: string; key: keyof DetailedProduct; render?: (val: any, p: DetailedProduct) => React.ReactNode }[] = [
        {
            label: 'Giá bán', key: 'price', render: (_, p) => (
                <div>
                    <div className="cp-price">{formatVND(p.price)}</div>
                    {p.oldPrice && p.oldPrice > p.price && (
                        <div className="cp-oldprice">{formatVND(p.oldPrice)}</div>
                    )}
                </div>
            )
        },
        {
            label: 'Đánh giá', key: 'rating', render: (val) => (
                <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                    {Array.from({ length: 5 }).map((_, i) => (
                        <i key={i} className={`fas fa-star ${i < Math.round(val ?? 5) ? 'text-warning' : 'text-muted'}`} style={{ fontSize: 13 }} />
                    ))}
                </div>
            )
        },
    ];

    const specMap = useMemo(() => {
        const map = new Map<string, Set<string>>();
        Object.values(details).forEach(detail => {
            detail.specifications?.forEach(spec => {
                const groupName = spec.group?.display_name || 'Thông số nổi bật';
                if (!map.has(groupName)) map.set(groupName, new Set());
                map.get(groupName)!.add(spec.name);
            });
        });
        return map;
    }, [details]);

    return (
        <div className="cp-wrapper">
            <style>{CSS}</style>

            {/* Header Breadcrumb */}
            <div className="cp-header">
                <div className="container">
                    <nav style={{ fontSize: 13, color: '#64748b' }}>
                        <Link to="/" style={{ color: '#64748b', textDecoration: 'none' }}><i className="fas fa-home me-1" />Trang chủ</Link>
                        <span className="mx-2">/</span>
                        <span style={{ color: '#ff7a00', fontWeight: 600 }}>So sánh sản phẩm</span>
                    </nav>
                </div>
            </div>

            <div className="container" style={{ marginTop: 24 }}>
                {compareList.length === 0 ? (
                    <div className="cp-container" style={{ padding: '60px 20px', textAlign: 'center', background: '#fff', borderRadius: 16 }}>
                        <h2 className="cp-title" style={{ marginBottom: 60, fontSize: 24, color: '#475569' }}>So sánh sản phẩm</h2>
                        <div style={{ display: 'flex', justifyContent: 'center', gap: 60, flexWrap: 'wrap' }}>
                            {Array.from({ length: 3 }).map((_, i) => (
                                <div key={i} className="cp-head-empty" style={{ width: 220, height: 220, border: 'none', cursor: 'pointer', background: 'transparent' }} onClick={() => setShowPicker(true)}>
                                    <svg width="140" height="140" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: 20 }}>
                                        <rect x="15" y="15" width="55" height="70" rx="4" stroke="#475569" strokeWidth="4" />
                                        <circle cx="42.5" cy="75" r="3" fill="#475569" />
                                        <rect x="55" y="35" width="30" height="50" rx="3" stroke="#475569" strokeWidth="4" fill="#fff" />
                                        <circle cx="70" cy="75" r="2.5" fill="#475569" />
                                    </svg>
                                    <div style={{ color: '#475569', fontWeight: 600, fontSize: 16 }}>Thêm sản phẩm để so sánh</div>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="cp-container">
                        <div className="cp-top">
                            <h2 className="cp-title">So sánh {compareList.length} sản phẩm</h2>
                            <div className="cp-actions">
                                <button onClick={() => setShowPicker(true)} className="cp-btn-add">
                                    <i className="fas fa-plus" /> Thêm sản phẩm
                                </button>
                                <button onClick={clearCompare} className="cp-btn-clear">
                                    Xóa tất cả
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '60px 0', color: '#ff7a00' }}>
                                <div className="spinner-border" />
                                <div style={{ marginTop: 12, color: '#64748b' }}>Đang tải dữ liệu...</div>
                            </div>
                        ) : (
                            <div className="cp-table-wrap">
                                <table className="cp-table">
                                    <thead>
                                        <tr>
                                            <th className="cp-th-head cp-th-label">Sản Phẩm</th>

                                            {compareList.map(product => {
                                                const detail = details[product.id] || product;
                                                return (
                                                    <th key={product.id} className="cp-th-head cp-th-product">
                                                        <button className="cp-head-rm" onClick={() => removeFromCompare(product.id)} title="Xóa">
                                                            <i className="fas fa-times" />
                                                        </button>

                                                        <div className="cp-head-img">
                                                            <img src={detail.image || ''} alt={detail.name} />
                                                        </div>

                                                        <Link to={`/product/${product.id}`} className="cp-head-name">
                                                            {detail.name}
                                                        </Link>

                                                        <button
                                                            className="cp-head-btn"
                                                            disabled={(detail.stock ?? 0) === 0}
                                                            onClick={() => navigate(`/product/${product.id}`)}
                                                        >
                                                            {(detail.stock ?? 0) === 0 ? 'Hết hàng' : 'Mua ngay'}
                                                        </button>
                                                    </th>
                                                );
                                            })}

                                            {Array.from({ length: 3 - compareList.length }).map((_, i) => (
                                                <th key={`empty-head-${i}`} className="cp-th-head cp-th-product">
                                                    <div className="cp-head-empty" onClick={() => setShowPicker(true)} style={{ border: '2px dashed #cbd5e1' }}>
                                                        <svg width="80" height="80" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ marginBottom: 12 }}>
                                                            <rect x="20" y="20" width="45" height="55" rx="4" stroke="#94a3b8" strokeWidth="4" />
                                                            <circle cx="42.5" cy="65" r="3" fill="#94a3b8" />
                                                            <rect x="55" y="35" width="25" height="40" rx="3" stroke="#94a3b8" strokeWidth="4" fill="#fff" />
                                                            <circle cx="67.5" cy="65" r="2.5" fill="#94a3b8" />
                                                        </svg>
                                                        <span style={{ color: '#64748b' }}>Thêm sản phẩm</span>
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>

                                    <tbody>
                                        {rows.map(row => (
                                            <tr key={row.key} className="cp-row">
                                                <td className="cp-td-label">{row.label}</td>
                                                {compareList.map(product => {
                                                    const detail = details[product.id] || product;
                                                    const val = detail[row.key];
                                                    return (
                                                        <td key={product.id} className="cp-td-val">
                                                            {row.render ? row.render(val, detail) : ((val as React.ReactNode) ?? '—')}
                                                        </td>
                                                    );
                                                })}
                                                {Array.from({ length: 3 - compareList.length }).map((_, i) => (
                                                    <td key={`empty-td-${i}`} className="cp-empty-td"></td>
                                                ))}
                                            </tr>
                                        ))}

                                        {Array.from(specMap.entries()).map(([groupName, specNames]) => (
                                            <React.Fragment key={groupName}>
                                                <tr className="cp-group-row">
                                                    <td colSpan={compareList.length + 1 + (3 - compareList.length)}>
                                                        {groupName}
                                                    </td>
                                                </tr>
                                                {Array.from(specNames).map(specName => (
                                                    <tr key={specName} className="cp-row">
                                                        <td className="cp-td-label">{specName}</td>
                                                        {compareList.map(product => {
                                                            const detail = details[product.id];
                                                            const spec = detail?.specifications?.find(s => s.name === specName);
                                                            return (
                                                                <td key={product.id} className="cp-td-val">
                                                                    {spec ? spec.value : '—'}
                                                                </td>
                                                            );
                                                        })}
                                                        {Array.from({ length: 3 - compareList.length }).map((_, i) => (
                                                            <td key={`empty-td2-${i}`} className="cp-empty-td"></td>
                                                        ))}
                                                    </tr>
                                                ))}
                                            </React.Fragment>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {showPicker && (
                <CompareMiniPicker
                    onClose={() => setShowPicker(false)}
                    categoryId={(compareList[0] as any)?.categoryId || (compareList[0] as any)?.category_id}
                    placement="center"
                />
            )}
        </div>
    );
};

export default ComparePage;

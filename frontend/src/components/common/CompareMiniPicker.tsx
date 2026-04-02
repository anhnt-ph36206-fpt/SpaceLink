import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useCompare } from '../../context/CompareContext';
import { axiosInstance } from '../../api/axios';
import { toast } from 'react-toastify';

export interface PickItem {
    id: string;
    name: string;
    image: string;
    price: number;
    oldPrice?: number;
    category?: string;
    categoryId?: number;
    brand?: string;
}

const fmt = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

const CSS = `
@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
@keyframes spin { to { transform: rotate(360deg); } }

.cb-overlay {
    position: fixed; inset: 0; background: rgba(0,0,0,0.5); z-index: 1199;
    display: flex; align-items: center; justify-content: center; backdrop-filter: blur(2px);
}

.cb-popup {
    background: #fff; border-radius: 12px; width: 1000px; max-width: 95vw; max-height: 90vh;
    display: flex; flex-direction: column; overflow: hidden;
    box-shadow: 0 20px 50px rgba(0,0,0,0.2); animation: fadeIn 0.3s ease;
}

.cb-popup-header {
    background: #f8f9fa; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center;
    border-bottom: 1px solid #e2e8f0;
}
.cb-popup-title { font-size: 18px; font-weight: 600; color: #475569; }
.cb-popup-close {
    background: #e2e8f0; border: none; width: 28px; height: 28px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; font-size: 14px;
    color: #64748b; cursor: pointer; transition: background 0.2s;
}
.cb-popup-close:hover { background: #cbd5e1; }

.cb-popup-search-wrap { padding: 16px 20px; border-bottom: 1px solid #f1f5f9; position: relative; }
.cb-popup-search-wrap i { position: absolute; left: 32px; top: 50%; transform: translateY(-50%); color: #94a3b8; }
.cb-popup-search-wrap input {
    width: 100%; border: 1px solid #cbd5e1; border-radius: 20px;
    padding: 10px 16px 10px 42px; outline: none; font-size: 14px; transition: border-color 0.2s;
}
.cb-popup-search-wrap input:focus { border-color: #ff7a00; }

.cb-popup-grid {
    display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr));
    gap: 16px; padding: 20px; overflow-y: auto; background: #fff;
    max-height: calc(90vh - 140px);
}
.cb-popup-grid::-webkit-scrollbar { width: 6px; }
.cb-popup-grid::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

.cb-card {
    border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px;
    display: flex; flex-direction: column; text-align: left; transition: box-shadow 0.2s;
    background: #fff;
}
.cb-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.05); border-color: #cbd5e1; }
.cb-card-img {
    width: 100%; height: 140px; display: flex; justify-content: center; align-items: center;
    margin-bottom: 12px; padding: 10px;
}
.cb-card-img img { max-width: 100%; max-height: 100%; object-fit: contain; }
.cb-card-name {
    font-size: 13px; font-weight: 600; color: #334155; margin-bottom: 8px; line-height: 1.4;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; height: 36px;
}
.cb-card-oldprice { font-size: 12px; color: #94a3b8; margin-bottom: 2px; }
.cb-card-price { font-size: 13px; font-weight: 700; color: #ff7a00; margin-bottom: 12px; }

.cb-card-btn {
    background: #ff7a00; color: #fff; padding: 8px; border-radius: 6px; font-size: 12.5px;
    font-weight: 600; text-align: center; border: none; cursor: pointer; margin-top: auto;
    transition: background 0.2s; display: flex; justify-content: center; align-items: center; gap: 4px;
}
.cb-card-btn:hover { background: #e66e00; }
.cb-card-btn.added { background: #f1f5f9; color: #94a3b8; cursor: not-allowed; }

.cb-empty { grid-column: 1 / -1; text-align: center; padding: 40px; color: #94a3b8; font-size: 14px; }
.cb-loading { grid-column: 1 / -1; text-align: center; padding: 40px; }
.cb-spinner { width: 28px; height: 28px; border: 3px solid #f1f5f9; border-top-color: #ff7a00; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto; }
.cb-loadmore-wrap { grid-column: 1 / -1; text-align: center; padding-top: 10px; }
.cb-loadmore-btn { background: none; border: none; color: #ff7a00; font-size: 14px; font-weight: 600; cursor: pointer; }
`;

interface CompareMiniPickerProps {
    onClose: () => void;
    categoryId?: number;
    categoryName?: string;
    placement?: 'bottom' | 'center';
}

const CompareMiniPicker: React.FC<CompareMiniPickerProps> = ({ onClose, categoryId, categoryName, placement = 'center' }) => {
    const { compareList, addToCompare, isInCompare } = useCompare();
    const [items, setItems] = useState<PickItem[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [limit, setLimit] = useState(10);
    const popupRef = useRef<HTMLDivElement>(null);

    // Prevent body scroll when open
    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = 'auto'; };
    }, []);

    const getComparableCategoryId = useCallback((cId: number | undefined, sourceCats: any[]) => {
        if (!cId) return undefined;
        let currentId = Number(cId);
        const path: number[] = [currentId];
        let maxDepth = 5;

        while (maxDepth > 0) {
            const cat = sourceCats.find((c: any) => Number(c.id) === currentId);
            if (!cat || !cat.parent_id) break;
            currentId = Number(cat.parent_id);
            path.push(currentId);
            maxDepth--;
        }

        const rootId = path[path.length - 1];
        const rootCat = sourceCats.find((c: any) => Number(c.id) === rootId);

        if (rootCat && rootCat.name && rootCat.name.toLowerCase().includes('phụ kiện')) {
            if (path.length >= 2) return path[path.length - 2];
        }
        return rootId;
    }, []);

    const fetchList = useCallback(async (kw: string) => {
        setLoading(true);
        try {
            let cats = categories;
            if (cats.length === 0) {
                const catRes = await axiosInstance.get('/categories');
                cats = catRes.data.data || [];
                setCategories(cats);
            }

            let rootCatId: number | undefined = undefined;
            if (categoryId) {
                rootCatId = getComparableCategoryId(categoryId, cats);
            }

            const params: Record<string, string | number> = { per_page: 50 };
            if (kw.trim()) params.keyword = kw.trim();
            if (rootCatId) params.category_id = rootCatId;

            const res = await axiosInstance.get('/products', { params });
            const rawData = res.data.data ?? [];

            setItems(rawData.map((p: any) => ({
                id: String(p.id),
                name: p.name,
                image: p.image || p.images?.find((i: any) => i.is_primary)?.image_url || p.images?.[0]?.image_url || '',
                price: Number(p.sale_price || p.price || 0),
                oldPrice: p.sale_price ? Number(p.price) : undefined,
                category: p.category?.name,
                categoryId: p.category_id || p.category?.id,
                brand: p.brand?.name,
            })));
        } catch { /* ignore */ }
        finally { setLoading(false); }
    }, [categoryId, categories, getComparableCategoryId]);

    useEffect(() => { fetchList(''); }, [fetchList]);

    useEffect(() => {
        setLimit(10);
        const t = setTimeout(() => fetchList(search), 350);
        return () => clearTimeout(t);
    }, [search, fetchList]);

    const handleAdd = (item: PickItem) => {
        const rootCatId = getComparableCategoryId(categoryId, categories);
        const itemRootCatId = getComparableCategoryId(item.categoryId, categories);

        if (rootCatId && itemRootCatId && rootCatId !== itemRootCatId) {
            toast.error('Chỉ được so sánh các sản phẩm cùng danh mục!');
            return;
        }
        if (!rootCatId && !itemRootCatId && categoryName && item.category && item.category !== categoryName) {
            toast.error('Chỉ được so sánh các sản phẩm cùng danh mục!');
            return;
        }

        if (isInCompare(item.id)) return;
        const ok = addToCompare({
            id: item.id, name: item.name, image: item.image,
            price: item.price, category: item.category,
            categoryId: item.categoryId
        });

        if (!ok) toast.warning('Chỉ so sánh tối đa 3 sản phẩm!');
        else { toast.success(`Đã thêm "${item.name}"`); onClose(); }
    };

    const full = compareList.length >= 3;

    return (
        <>
            <style>{CSS}</style>
            <div className="cb-overlay" onClick={onClose}>
                <div className="cb-popup" ref={popupRef} onClick={e => e.stopPropagation()}>
                    {/* Header */}
                    <div className="cb-popup-header">
                        <div className="cb-popup-title">Tìm sản phẩm để so sánh</div>
                        <button className="cb-popup-close" onClick={onClose}><i className="fas fa-times" /></button>
                    </div>

                    {/* Search */}
                    <div className="cb-popup-search-wrap">
                        <i className="fas fa-search" />
                        <input
                            autoFocus
                            placeholder="Nhập tên sản phẩm muốn so sánh..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    {/* Grid */}
                    <div className="cb-popup-grid">
                        {loading ? (
                            <div className="cb-loading"><div className="cb-spinner" /></div>
                        ) : items.length === 0 ? (
                            <div className="cb-empty">Không tìm thấy sản phẩm. Vui lòng thử từ khóa khác.</div>
                        ) : (
                            <>
                                {items.slice(0, limit).map(item => {
                                    const added = isInCompare(item.id);
                                    const isDisabled = added || (full && !added);

                                    return (
                                        <div key={item.id} className="cb-card">
                                            <div className="cb-card-img">
                                                {item.image ? (
                                                    <img src={item.image} alt={item.name} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                                                ) : (
                                                    <i className="fas fa-image" style={{ color: '#cbd5e1', fontSize: 32 }} />
                                                )}
                                            </div>
                                            <div className="cb-card-name" title={item.name}>{item.name}</div>
                                            
                                            <div>
                                                <div className="cb-card-oldprice">Giá niêm yết: {item.oldPrice ? fmt(item.oldPrice) : fmt(item.price)}</div>
                                                <div className="cb-card-price">Giá khuyến mãi: {fmt(item.price)}</div>
                                            </div>

                                            <button
                                                className={`cb-card-btn ${added ? 'added' : ''}`}
                                                onClick={() => !isDisabled && handleAdd(item)}
                                                disabled={isDisabled}
                                            >
                                                {added ? 'Đã thêm' : '+ Chọn để so sánh'}
                                            </button>
                                        </div>
                                    );
                                })}
                                {items.length > limit && (
                                    <div className="cb-loadmore-wrap">
                                        <button className="cb-loadmore-btn" onClick={() => setLimit(prev => prev + 10)}>
                                            Xem thêm <i className="fas fa-chevron-down" style={{ fontSize: 12, marginLeft: 4 }} />
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};

export default CompareMiniPicker;

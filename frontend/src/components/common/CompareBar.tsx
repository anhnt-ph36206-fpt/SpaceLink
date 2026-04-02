import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
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

/* ─── Styles ─────────────────────────────────────────────── */
const CSS = `
@keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes fadeIn { from { opacity: 0; transform: translate(-50%, 10px); } to { opacity: 1; transform: translate(-50%, 0); } }

.cb-container {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 1050;
    background: #fff; border-top: 1px solid #e2e8f0;
    box-shadow: 0 -10px 40px rgba(0,0,0,0.08);
    display: flex; justify-content: center;
    font-family: 'Inter', sans-serif;
    animation: slideUp 0.3s ease;
}
.cb-inner {
    max-width: 1200px; width: 100%;
    display: flex; align-items: center; justify-content: space-between;
    padding: 16px 20px;
    position: relative; /* relative for absolutely positioning the popup */
}

/* -- Slots -- */
.cb-slots { display: flex; gap: 16px; }

.cb-slot {
    width: 180px; height: 110px; background: #fff;
    border: 1px solid #e2e8f0; border-radius: 8px;
    padding: 10px; position: relative;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.03);
}
.cb-slot-img-wrap {
    width: 50px; height: 50px; display: flex; align-items: center; justify-content: center;
}
.cb-slot-img { max-width: 100%; max-height: 100%; object-fit: contain; }
.cb-slot-name {
    font-size: 11.5px; text-align: center; color: #475569; line-height: 1.35;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
}
.cb-slot-rm {
    position: absolute; top: 6px; right: 6px;
    background: #f1f5f9; border: none; width: 22px; height: 22px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 11px; color: #1e293b; cursor: pointer; transition: all 0.2s;
}
.cb-slot-rm:hover { background: #e2e8f0; transform: scale(1.1); }

.cb-slot-empty {
    width: 180px; height: 110px; background: #fff;
    border: 1.5px dashed #d70018; border-radius: 8px;
    display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;
    cursor: pointer; transition: background 0.2s;
}
.cb-slot-empty:hover { background: #fdf2f2; }
.cb-slot-plus {
    width: 28px; height: 28px; border: 1.5px solid #94a3b8; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    color: #94a3b8; font-size: 14px; transition: all 0.2s;
}
.cb-slot-empty-text { font-size: 12px; color: #64748b; }

/* -- Actions -- */
.cb-actions { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; }
.cb-summary { font-size: 14px; color: #475569; font-weight: 500; }
.cb-actions-row { display: flex; gap: 12px; }
.cb-btn-outline {
    padding: 10px 20px; border: 1px solid #cbd5e1; background: #fff; border-radius: 6px;
    font-size: 13.5px; font-weight: 600; color: #475569; cursor: pointer; transition: background 0.2s;
}
.cb-btn-outline:hover { background: #f8f9fa; }
.cb-btn-primary {
    padding: 10px 24px; background: #d70018; color: #fff; border: none; border-radius: 6px;
    font-size: 13.5px; font-weight: 700; cursor: pointer; transition: background 0.2s;
}
.cb-btn-primary:hover { background: #b90014; }
.cb-btn-primary:disabled { background: #e2e8f0; color: #94a3b8; cursor: not-allowed; }

/* -- Inline Popup -- */
.cb-popup {
    position: absolute; bottom: calc(100% + 20px); left: 50%; transform: translateX(-50%);
    width: 600px; max-width: 95vw; background: #fff; border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0,0,0,0.15); z-index: 1200;
    border: 1px solid #e2e8f0; animation: fadeIn 0.2s ease forwards;
    display: flex; flex-direction: column;
}
.cb-popup-search { padding: 16px 16px 10px; position: relative; }
.cb-popup-search i {
    position: absolute; left: 32px; top: 31px; color: #64748b; font-size: 16px;
}
.cb-popup-search input {
    width: 100%; border: 1px solid #cbd5e1; border-radius: 8px;
    padding: 12px 14px 12px 42px; outline: none; font-size: 14px;
    transition: border-color 0.2s;
}
.cb-popup-search input:focus { border-color: #d70018; }
.cb-popup-list { max-height: 480px; overflow-y: auto; padding: 0 8px 16px; }
.cb-popup-list::-webkit-scrollbar { width: 6px; }
.cb-popup-list::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }

.cb-item {
    display: flex; align-items: center; padding: 14px 12px;
    border-bottom: 1px solid #f1f5f9; gap: 16px;
}
.cb-item:last-child { border-bottom: none; }
.cb-item-img { width: 50px; height: 50px; flex-shrink: 0; display: flex; justify-content: center; }
.cb-item-img img { max-width: 100%; max-height: 100%; object-fit: contain; }
.cb-item-info { flex: 1; min-width: 0; }
.cb-item-name {
    font-size: 13.5px; font-weight: 600; color: #334155; margin-bottom: 6px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.cb-item-price-row { display: flex; align-items: baseline; gap: 8px; }
.cb-item-price { color: #d70018; font-weight: 700; font-size: 14px; }
.cb-item-oldprice { color: #94a3b8; text-decoration: line-through; font-size: 12px; }

.cb-item-btn {
    padding: 8px 18px; background: #ffe5e5; color: #d70018;
    border: none; border-radius: 6px; font-size: 13px; font-weight: 600;
    cursor: pointer; transition: background 0.2s; white-space: nowrap;
}
.cb-item-btn:hover { background: #fcd5d5; }
.cb-item-btn.added { background: #f1f5f9; color: #94a3b8; cursor: default; }

.cb-popup-more { text-align: center; padding: 10px 20px; }
.cb-popup-more-btn {
    border: 1px solid #d70018; background: #fff; color: #d70018;
    border-radius: 20px; padding: 8px 32px; font-size: 13.5px; font-weight: 500;
    cursor: pointer; transition: background 0.2s; width: 200px;
}
.cb-popup-more-btn:hover { background: #fdf2f2; }

.cb-empty { text-align: center; padding: 40px; color: #94a3b8; font-size: 14px; }
.cb-loading { text-align: center; padding: 40px; }
.cb-spinner {
    width: 28px; height: 28px; border: 3px solid #f1f5f9; border-top-color: #d70018;
    border-radius: 50%; animation: spin 0.7s linear infinite; margin: 0 auto;
}
@keyframes spin { to { transform: rotate(360deg); } }
`;

/* ─── Inline MiniPicker Component ────────────────────────── */
const InlineMiniPicker: React.FC<{
    onClose: () => void;
    categoryId?: number;
    categoryName?: string;
    popupRef: React.Ref<HTMLDivElement>;
}> = ({ onClose, categoryId, categoryName, popupRef }) => {
    const { compareList, addToCompare, isInCompare } = useCompare();
    const [items, setItems] = useState<PickItem[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [limit, setLimit] = useState(5);

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

            const params: Record<string, string | number> = { per_page: 30 };
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
        setLimit(5);
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
        <div className="cb-popup" ref={popupRef}>
            <div className="cb-popup-search">
                <i className="fas fa-search" />
                <input
                    autoFocus
                    placeholder="Tìm sản phẩm muốn so sánh"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>
            <div className="cb-popup-list">
                {loading ? (
                    <div className="cb-loading"><div className="cb-spinner" /></div>
                ) : items.length === 0 ? (
                    <div className="cb-empty">Không tìm thấy sản phẩm</div>
                ) : (
                    <>
                        {items.slice(0, limit).map(item => {
                            const added = isInCompare(item.id);
                            const isDisabled = added || (full && !added);

                            return (
                                <div key={item.id} className="cb-item">
                                    <div className="cb-item-img">
                                        {item.image ? (
                                            <img src={item.image} alt={item.name} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                                        ) : (
                                            <i className="fas fa-image" style={{ color: '#cbd5e1', fontSize: 24 }} />
                                        )}
                                    </div>
                                    <div className="cb-item-info">
                                        <div className="cb-item-name" title={item.name}>{item.name}</div>
                                        <div className="cb-item-price-row">
                                            <span className="cb-item-price">{fmt(item.price)}</span>
                                            {item.oldPrice && (
                                                <span className="cb-item-oldprice">{fmt(item.oldPrice)}</span>
                                            )}
                                        </div>
                                    </div>
                                    <button
                                        className={`cb-item-btn ${added ? 'added' : ''}`}
                                        onClick={() => !isDisabled && handleAdd(item)}
                                        disabled={isDisabled}
                                    >
                                        {added ? 'Đã thêm' : 'Chọn'}
                                    </button>
                                </div>
                            );
                        })}
                        {items.length > limit && (
                            <div className="cb-popup-more">
                                <button className="cb-popup-more-btn" onClick={() => setLimit(p => p + 5)}>
                                    Xem thêm
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

/* ─── CompareBar ─────────────────────────────────────────── */
const CompareBar: React.FC = () => {
    const { compareList, removeFromCompare, clearCompare } = useCompare();
    const navigate = useNavigate();
    const location = useLocation();
    const [popupOpen, setPopupOpen] = useState(false);
    const popupRef = useRef<HTMLDivElement>(null);
    const [hiddenOnRoute, setHiddenOnRoute] = useState(false);
    const prevListLength = useRef(compareList.length);

    // Bật lại thanh so sánh nếu người dùng THÊM sản phẩm mới
    useEffect(() => {
        if (compareList.length > prevListLength.current) {
            setHiddenOnRoute(false);
        }
        prevListLength.current = compareList.length;
    }, [compareList.length]);

    // Ẩn thanh CompareBar (chỉ ẩn UI, KHÔNG xóa dữ liệu) và đóng popup khi chuyển trang
    useEffect(() => {
        setPopupOpen(false);
        setHiddenOnRoute(true);
    }, [location.pathname]);

    // Close popup on click outside
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            // Check if clicking inside popup, or clicking on empty slots (handled by stopPropagation)
            if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
                setPopupOpen(false);
            }
        };
        if (popupOpen) {
            document.addEventListener('mousedown', handler);
        }
        return () => document.removeEventListener('mousedown', handler);
    }, [popupOpen]);

    // Các trang không hiển thị thanh CompareBar bám đáy
    const isHidden =
        location.pathname.startsWith('/compare') ||
        location.pathname.startsWith('/cart') ||
        location.pathname.startsWith('/checkout') ||
        location.pathname.startsWith('/login') ||
        location.pathname.startsWith('/register') ||
        location.pathname.startsWith('/profile') ||
        location.pathname.startsWith('/order') ||
        location.pathname.startsWith('/contact');

    if (isHidden) {
        return null;
    }

    const catId = (compareList[0] as any)?.categoryId as number | undefined
        || (compareList[0] as any)?.category_id as number | undefined;
    const catName = compareList[0]?.category;

    if (compareList.length === 0 || hiddenOnRoute) return null;

    // Hide bar entirely if hidden property is true (like a "Thu gọn" mode)
    // Actually the user screenshot doesn't show it hidden, just the "Thu gọn" button.
    const emptySlotsCount = 3 - compareList.length;

    return (
        <>
            <style>{CSS}</style>
            <div className="cb-container">
                <div className="cb-inner">

                    {/* Left: Product Slots */}
                    <div className="cb-slots">
                        {/* Filled Slots */}
                        {compareList.map(p => (
                            <div key={p.id} className="cb-slot">
                                <button className="cb-slot-rm" onClick={(e) => { e.stopPropagation(); removeFromCompare(p.id); }} title="Xóa">
                                    <i className="fas fa-times" />
                                </button>
                                <div className="cb-slot-img-wrap">
                                    {p.image ? (
                                        <img className="cb-slot-img" src={p.image} alt={p.name} onError={e => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
                                    ) : (
                                        <i className="fas fa-image" style={{ color: '#cbd5e1', fontSize: 24 }} />
                                    )}
                                </div>
                                <div className="cb-slot-name" title={p.name}>{p.name}</div>
                            </div>
                        ))}

                        {/* Empty Slots */}
                        {Array.from({ length: emptySlotsCount }).map((_, i) => (
                            <div
                                key={`empty-${i}`}
                                className="cb-slot-empty"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setPopupOpen(prev => !prev);
                                }}
                            >
                                <div className="cb-slot-plus"><i className="fas fa-plus" /></div>
                                <div className="cb-slot-empty-text">Chọn sản phẩm so sánh</div>
                            </div>
                        ))}
                    </div>

                    {/* Right: Actions */}
                    <div className="cb-actions">
                        <span className="cb-summary">Đã chọn {compareList.length} sản phẩm</span>
                        <div className="cb-actions-row">
                            <button className="cb-btn-outline" onClick={() => clearCompare()}>Xóa tất cả</button>
                            <button
                                className="cb-btn-primary"
                                onClick={() => navigate('/compare')}
                                disabled={compareList.length < 2}
                            >
                                So sánh
                            </button>
                        </div>
                    </div>

                    {/* Inline Vertical Popup */}
                    {popupOpen && (
                        <InlineMiniPicker
                            onClose={() => setPopupOpen(false)}
                            categoryId={catId}
                            categoryName={catName}
                            popupRef={popupRef}
                        />
                    )}

                </div>
            </div>
        </>
    );
};

export default CompareBar;
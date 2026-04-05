import React, { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import ProductCard from "../components/common/ProductCard";
import { axiosInstance } from "../api/axios";
import type { Product } from "../types";

const formatVND = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

/* =======================
   TYPES
======================= */

interface CategoryNode {
    id: number;
    name: string;
    children?: CategoryNode[];
}

interface ProductResponse {
    id: number;
    name: string;
    image: string;
    price: number;
    sale_price?: number;
    is_featured: boolean;
    category?: { name: string };
}

/* =======================
   COMPONENT
======================= */

const ShopPage: React.FC = () => {
    const [searchParams, setSearchParams] = useSearchParams();

    const [products, setProducts]       = useState<Product[]>([]);
    const [categories, setCategories]   = useState<CategoryNode[]>([]);

    const [loading, setLoading]         = useState(false);
    const [page, setPage]               = useState(1);
    const [totalPages, setTotalPages]   = useState(1);
    const [sort, setSort]               = useState("");
    const [priceRange, setPriceRange]   = useState(50000000);
    const [debouncePrice, setDebouncePrice] = useState(priceRange);
    const [expandedCats, setExpandedCats] = useState<Record<number, boolean>>({});
    const [totalProducts, setTotalProducts] = useState(0);

    // Read ?category= from URL (stays in sync with React Router)
    const selectedCategory = searchParams.get("category")
        ? Number(searchParams.get("category"))
        : null;

    /* ── Debounce price ─────────────────────────────────── */
    useEffect(() => {
        const t = setTimeout(() => setDebouncePrice(priceRange), 400);
        return () => clearTimeout(t);
    }, [priceRange]);

    /* ── Fetch products ─────────────────────────────────── */
    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true);
            const params: Record<string, any> = { page, max_price: debouncePrice };
            if (selectedCategory !== null) params.category_id = selectedCategory;
            if (sort) params.sort_by = sort;

            const res = await axiosInstance.get("/products", { params });
            const data: ProductResponse[] = res.data.data;

            setProducts(data.map((item) => ({
                id: String(item.id),
                name: item.name,
                image: item.image,
                category: item.category?.name ?? "",
                price: item.sale_price ? Number(item.sale_price) : Number(item.price),
                oldPrice: item.sale_price ? Number(item.price) : undefined,
                rating: 4,
                isNew: item.is_featured,
                isSale: !!item.sale_price,
            })));
            setTotalPages(res.data.meta?.last_page ?? 1);
            setTotalProducts(res.data.meta?.total ?? data.length);
        } catch (e) {
            console.error("Lỗi tải sản phẩm:", e);
        } finally {
            setLoading(false);
        }
    }, [page, selectedCategory, sort, debouncePrice]);

    /* ── Fetch filter data (categories tree) ──────────────── */
    const fetchFilters = async () => {
        try {
            const catRes = await axiosInstance.get("/categories", { params: { type: "tree" } });
            setCategories(catRes.data.data ?? []);
        } catch (e) {
            console.error("Lỗi tải filters:", e);
        }
    };

    useEffect(() => { fetchProducts(); }, [fetchProducts]);
    useEffect(() => { fetchFilters(); }, []);

    /* ── Helpers ────────────────────────────────────────── */
    const handleCategoryChange = (id: number | null) => {
        setPage(1);
        if (id !== null) {
            setSearchParams({ category: String(id) });
        } else {
            setSearchParams({});
        }
    };

    const clearFilters = () => {
        handleCategoryChange(null);
        setSort("");
        setPriceRange(50000000);
        setPage(1);
    };

    /* ── Find selected category name for breadcrumb ─────── */
    const findCatName = (nodes: CategoryNode[], id: number): string => {
        for (const n of nodes) {
            if (n.id === id) return n.name;
            if (n.children) {
                const found = findCatName(n.children, id);
                if (found) return found;
            }
        }
        return "";
    };
    const activeCatName = selectedCategory ? findCatName(categories, selectedCategory) : "";

    /* ── Render ─────────────────────────────────────────── */
    return (
        <div className="container py-5">

            {/* Breadcrumb / title */}
            {activeCatName && (
                <div className="mb-4 d-flex align-items-center gap-2">
                    <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() => handleCategoryChange(null)}
                    >
                        ← Tất cả sản phẩm
                    </button>
                    <span className="text-muted small">›</span>
                    <h5 className="mb-0">{activeCatName}</h5>
                </div>
            )}

            <div className="row">

                {/* ── SIDEBAR ────────────────────────────── */}
                <div className="col-lg-3">

                    {/* Category animation styles */}
                    <style>{`
                        @keyframes catSlideDown {
                            from { opacity: 0; transform: translateY(-8px); }
                            to   { opacity: 1; transform: translateY(0); }
                        }
                        @keyframes catSlideUp {
                            from { opacity: 1; transform: translateY(0); }
                            to   { opacity: 0; transform: translateY(-8px); }
                        }
                        .cat-children-wrap {
                            overflow: hidden;
                            border-left: 2px solid #dbeafe;
                            margin-left: 16px;
                        }
                        .cat-children-wrap.expanding {
                            animation: catSlideDown 0.28s ease forwards;
                        }
                        .cat-children-wrap.collapsed {
                            display: none;
                        }
                        .cat-child-item {
                            opacity: 0;
                            transform: translateX(-6px);
                            animation: catChildFadeIn 0.25s ease forwards;
                        }
                        @keyframes catChildFadeIn {
                            to { opacity: 1; transform: translateX(0); }
                        }
                        .cat-parent-row {
                            transition: background 0.2s, box-shadow 0.2s;
                            cursor: pointer;
                        }
                        .cat-parent-row:hover {
                            background: #f0f4ff !important;
                            box-shadow: 0 1px 4px rgba(13,110,253,.08);
                        }
                        .cat-toggle-btn {
                            transition: all 0.25s ease;
                        }
                        .cat-toggle-btn:hover {
                            transform: scale(1.15);
                        }
                        .cat-toggle-icon {
                            transition: transform 0.3s ease;
                            display: inline-block;
                        }
                        .cat-toggle-icon.open {
                            transform: rotate(180deg);
                        }
                    `}</style>

                    {/* Category tree */}
                    <div className="border rounded p-4 mb-4" style={{ background: '#fafbfc' }}>
                        <h5 className="mb-3 fw-bold d-flex align-items-center gap-2">
                            <i className="fas fa-th-list text-primary" />
                            Danh mục sản phẩm
                        </h5>

                        <div
                            className="form-check mb-2 py-2 px-2 rounded cat-parent-row"
                            style={{
                                background: selectedCategory === null ? '#e8f0fe' : 'transparent',
                            }}
                        >
                            <input
                                type="radio"
                                className="form-check-input"
                                id="cat-all"
                                checked={selectedCategory === null}
                                onChange={() => handleCategoryChange(null)}
                            />
                            <label className="form-check-label fw-semibold" htmlFor="cat-all" style={{ cursor: 'pointer' }}>
                                <i className="fas fa-border-all me-2 text-primary small" />
                                Tất cả sản phẩm
                            </label>
                        </div>

                        <hr className="my-2" style={{ borderColor: '#e2e8f0' }} />

                        {categories.map((cat) => {
                            const isExpanded = expandedCats[cat.id];
                            const hasChildren = cat.children && cat.children.length > 0;
                            const isParentActive = selectedCategory === cat.id;
                            const isChildActive = hasChildren && cat.children!.some(c => c.id === selectedCategory);
                            return (
                                <div key={cat.id} className="mb-1">
                                    {/* Parent */}
                                    <div
                                        className="d-flex align-items-center justify-content-between py-2 px-2 rounded cat-parent-row"
                                        style={{
                                            background: isParentActive || isChildActive ? '#e8f0fe' : 'transparent',
                                        }}
                                    >
                                        <div className="form-check m-0">
                                            <input
                                                type="radio"
                                                className="form-check-input"
                                                id={`cat-${cat.id}`}
                                                checked={selectedCategory === cat.id}
                                                onChange={() => handleCategoryChange(cat.id)}
                                            />
                                            <label className="form-check-label fw-semibold" htmlFor={`cat-${cat.id}`} style={{ cursor: 'pointer' }}>
                                                {cat.name}
                                            </label>
                                        </div>
                                        {hasChildren && (
                                            <button
                                                className="btn btn-sm p-0 border-0 cat-toggle-btn"
                                                style={{
                                                    boxShadow: 'none',
                                                    width: 26, height: 26,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    borderRadius: '50%',
                                                    background: isExpanded ? '#dbeafe' : '#f1f5f9',
                                                    color: isExpanded ? '#0d6efd' : '#94a3b8',
                                                }}
                                                onClick={() => setExpandedCats(prev => ({ ...prev, [cat.id]: !prev[cat.id] }))}
                                            >
                                                <i
                                                    className={`fas fa-chevron-down cat-toggle-icon${isExpanded ? ' open' : ''}`}
                                                    style={{ fontSize: 10 }}
                                                />
                                            </button>
                                        )}
                                    </div>
                                    {/* Children */}
                                    {hasChildren && (
                                        <div className={`cat-children-wrap${isExpanded ? ' expanding' : ' collapsed'}`}>
                                            {isExpanded && cat.children!.map((child, idx) => (
                                                <div
                                                    key={child.id}
                                                    className="form-check ms-3 py-1 px-2 rounded cat-child-item"
                                                    style={{
                                                        background: selectedCategory === child.id ? '#dbeafe' : 'transparent',
                                                        animationDelay: `${idx * 0.05}s`,
                                                        marginTop: idx === 0 ? 4 : 2,
                                                    }}
                                                >
                                                    <input
                                                        type="radio"
                                                        className="form-check-input"
                                                        id={`cat-${child.id}`}
                                                        checked={selectedCategory === child.id}
                                                        onChange={() => handleCategoryChange(child.id)}
                                                    />
                                                    <label
                                                        className="form-check-label small"
                                                        htmlFor={`cat-${child.id}`}
                                                        style={{
                                                            cursor: 'pointer',
                                                            color: selectedCategory === child.id ? '#0d6efd' : '#64748b',
                                                            fontWeight: selectedCategory === child.id ? 600 : 400,
                                                            transition: 'color 0.2s, font-weight 0.2s',
                                                        }}
                                                    >
                                                        {child.name}
                                                    </label>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Price range */}
                    <div className="border rounded p-4">
                        <h5 className="mb-3 fw-bold">Khoảng giá</h5>
                        <input
                            type="range" min={0} max={50000000} step={500000}
                            className="form-range"
                            value={priceRange}
                            onChange={(e) => { setPriceRange(Number(e.target.value)); setPage(1); }}
                        />
                        <p className="mt-2 fw-bold">0₫ — {formatVND(priceRange)}</p>
                    </div>

                    <button className="btn btn-outline-secondary w-100 mt-3" onClick={clearFilters}>
                        Xóa bộ lọc
                    </button>
                </div>

                {/* ── PRODUCTS ───────────────────────────── */}
                <div className="col-lg-9">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <p className="mb-0">Tìm thấy <b>{totalProducts}</b> sản phẩm</p>
                        <select
                            className="form-select w-auto"
                            value={sort}
                            onChange={(e) => { setSort(e.target.value); setPage(1); }}
                        >
                            <option value="">Mặc định</option>
                            <option value="price_asc">Giá tăng dần</option>
                            <option value="price_desc">Giá giảm dần</option>
                            <option value="latest">Mới nhất</option>
                            <option value="view_count">Xem nhiều nhất</option>
                        </select>
                    </div>

                    <div className="product row g-4 align-items-stretch">
                        {loading ? (
                            <div className="col-12 text-center py-5">
                                <div className="spinner-border text-primary" role="status" />
                                <p className="mt-2 text-muted">Đang tải sản phẩm...</p>
                            </div>
                        ) : products.length ? (
                            products.map((product) => <ProductCard key={product.id} product={product} />)
                        ) : (
                            <div className="col-12 text-center py-5 text-muted">
                                <i className="fas fa-box-open fs-1 mb-3 d-block opacity-50" />
                                Không tìm thấy sản phẩm nào
                            </div>
                        )}
                    </div>

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="d-flex justify-content-center mt-5">
                            <ul className="pagination">
                                {Array.from({ length: totalPages }, (_, i) => (
                                    <li key={i} className={`page-item ${page === i + 1 ? "active" : ""}`}>
                                        <button className="page-link" onClick={() => setPage(i + 1)}>
                                            {i + 1}
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default ShopPage;
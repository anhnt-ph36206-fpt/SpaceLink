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

interface Brand {
    id: number;
    name: string;
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
    const [brands, setBrands]           = useState<Brand[]>([]);
    const [loading, setLoading]         = useState(false);
    const [page, setPage]               = useState(1);
    const [totalPages, setTotalPages]   = useState(1);
    const [sort, setSort]               = useState("");
    const [priceRange, setPriceRange]   = useState(50000000);
    const [debouncePrice, setDebouncePrice] = useState(priceRange);

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
        } catch (e) {
            console.error("Lỗi tải sản phẩm:", e);
        } finally {
            setLoading(false);
        }
    }, [page, selectedCategory, sort, debouncePrice]);

    /* ── Fetch filter data (categories tree + brands) ───── */
    const fetchFilters = async () => {
        try {
            const [catRes, brandRes] = await Promise.all([
                axiosInstance.get("/categories", { params: { type: "tree" } }),
                axiosInstance.get("/brands"),
            ]);
            setCategories(catRes.data.data ?? []);
            setBrands(brandRes.data.data ?? brandRes.data ?? []);
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

                    {/* Category tree */}
                    <div className="border rounded p-4 mb-4">
                        <h5 className="mb-3 fw-bold">Danh mục</h5>

                        <div className="form-check mb-2">
                            <input
                                type="radio"
                                className="form-check-input"
                                id="cat-all"
                                checked={selectedCategory === null}
                                onChange={() => handleCategoryChange(null)}
                            />
                            <label className="form-check-label fw-semibold" htmlFor="cat-all">
                                Tất cả sản phẩm
                            </label>
                        </div>

                        {categories.map((cat) => (
                            <div key={cat.id} className="mb-1">
                                {/* Parent */}
                                <div className="form-check">
                                    <input
                                        type="radio"
                                        className="form-check-input"
                                        id={`cat-${cat.id}`}
                                        checked={selectedCategory === cat.id}
                                        onChange={() => handleCategoryChange(cat.id)}
                                    />
                                    <label className="form-check-label fw-semibold" htmlFor={`cat-${cat.id}`}>
                                        {cat.name}
                                    </label>
                                </div>
                                {/* Children */}
                                {cat.children?.map((child) => (
                                    <div key={child.id} className="form-check ms-3 mt-1">
                                        <input
                                            type="radio"
                                            className="form-check-input"
                                            id={`cat-${child.id}`}
                                            checked={selectedCategory === child.id}
                                            onChange={() => handleCategoryChange(child.id)}
                                        />
                                        <label className="form-check-label text-muted small" htmlFor={`cat-${child.id}`}>
                                            ↳ {child.name}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>

                    {/* Brand */}
                    <div className="border rounded p-4 mb-4">
                        <h5 className="mb-3 fw-bold">Thương hiệu</h5>
                        {brands.map((brand) => (
                            <div key={brand.id} className="form-check mb-2">
                                <input
                                    type="radio"
                                    className="form-check-input"
                                    id={`brand-${brand.id}`}
                                    checked={false}
                                    onChange={() => setPage(1)}
                                />
                                <label className="form-check-label" htmlFor={`brand-${brand.id}`}>
                                    {brand.name}
                                </label>
                            </div>
                        ))}
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
                        <p className="mb-0">Tìm thấy <b>{products.length}</b> sản phẩm</p>
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
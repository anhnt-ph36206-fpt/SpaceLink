import React, { useEffect, useState, useCallback } from "react";
import ProductCard from "../components/common/ProductCard";
import { axiosInstance } from "../api/axios";
import type { Product } from "../types";

const formatVND = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

/* =======================
   TYPES
======================= */

interface Category {
    id: number;
    name: string;
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
    category?: {
        name: string;
    };
}

/* =======================
   COMPONENT
======================= */

const ShopPage: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);

    const [loading, setLoading] = useState(false);

    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
    const [selectedBrand, setSelectedBrand] = useState<number | null>(null);
    const [sort, setSort] = useState("");

    const [priceRange, setPriceRange] = useState(50000000);
    const [debouncePrice, setDebouncePrice] = useState(priceRange);

    /* =======================
       DEBOUNCE PRICE
    ======================= */

    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncePrice(priceRange);
        }, 400);

        return () => clearTimeout(timer);
    }, [priceRange]);

    /* =======================
       FETCH PRODUCTS
    ======================= */

    const fetchProducts = useCallback(async () => {
        try {
            setLoading(true);

            const params: Record<string, any> = {
                page,
                max_price: debouncePrice,
            };

            if (selectedCategory !== null) params.category_id = selectedCategory;
            if (selectedBrand !== null) params.brand_id = selectedBrand;
            if (sort) params.sort = sort;

            const res = await axiosInstance.get("/products", { params });

            const data: ProductResponse[] = res.data.data;

            const formattedProducts: Product[] = data.map((item) => ({
                id: String(item.id),
                name: item.name,
                image: item.image,
                category: item.category?.name ?? "",

                price: item.sale_price ? Number(item.sale_price) : Number(item.price),

                oldPrice: item.sale_price ? Number(item.price) : undefined,

                rating: 4,
                isNew: item.is_featured,
                isSale: !!item.sale_price,
            }));

            setProducts(formattedProducts);
            setTotalPages(res.data.meta?.last_page ?? 1);
        } catch (error) {
            console.error("Lỗi tải sản phẩm:", error);
        } finally {
            setLoading(false);
        }
    }, [page, selectedCategory, selectedBrand, sort, debouncePrice]);

    /* =======================
       FETCH FILTERS
    ======================= */

    const fetchFilters = async () => {
        try {
            const [catRes, brandRes] = await Promise.all([
                axiosInstance.get("/categories"),
                axiosInstance.get("/brands"),
            ]);

            setCategories(catRes.data.data || catRes.data);
            setBrands(brandRes.data.data || brandRes.data);
        } catch (error) {
            console.error("Lỗi tải filters:", error);
        }
    };

    /* =======================
       EFFECT
    ======================= */

    useEffect(() => {
        fetchProducts();
    }, [fetchProducts]);

    useEffect(() => {
        fetchFilters();
    }, []);

    /* =======================
       CLEAR FILTER
    ======================= */

    const clearFilters = () => {
        setSelectedCategory(null);
        setSelectedBrand(null);
        setSort("");
        setPriceRange(50000000);
        setPage(1);
    };

    /* =======================
       RENDER
    ======================= */

    return (
        <div className="container py-5">
            <div className="row">

                {/* SIDEBAR */}
                <div className="col-lg-3">

                    {/* CATEGORY */}
                    <div className="border rounded p-4 mb-4">
                        <h5 className="mb-3">Danh mục</h5>

                        {categories.map((cat) => (
                            <div key={cat.id} className="form-check mb-2">

                                <input
                                    type="radio"
                                    className="form-check-input"
                                    checked={selectedCategory === cat.id}
                                    onChange={() => {
                                        setSelectedCategory(cat.id);
                                        setPage(1);
                                    }}
                                />

                                <label className="form-check-label">
                                    {cat.name}
                                </label>

                            </div>
                        ))}
                    </div>

                    {/* BRAND */}
                    <div className="border rounded p-4 mb-4">
                        <h5 className="mb-3">Thương hiệu</h5>

                        {brands.map((brand) => (
                            <div key={brand.id} className="form-check mb-2">

                                <input
                                    type="radio"
                                    className="form-check-input"
                                    checked={selectedBrand === brand.id}
                                    onChange={() => {
                                        setSelectedBrand(brand.id);
                                        setPage(1);
                                    }}
                                />

                                <label className="form-check-label">
                                    {brand.name}
                                </label>

                            </div>
                        ))}
                    </div>

                    {/* PRICE */}
                    <div className="border rounded p-4">

                        <h5 className="mb-3">Khoảng giá</h5>

                        <input
                            type="range"
                            min={0}
                            max={50000000}
                            step={500000}
                            className="form-range"
                            value={priceRange}
                            onChange={(e) => {
                                setPriceRange(Number(e.target.value));
                                setPage(1);
                            }}
                        />

                        <p className="mt-2 fw-bold">
                            0₫ — {formatVND(priceRange)}
                        </p>

                    </div>

                    <button
                        className="btn btn-outline-secondary w-100 mt-3"
                        onClick={clearFilters}
                    >
                        Xóa bộ lọc
                    </button>

                </div>

                {/* PRODUCTS */}
                <div className="col-lg-9">

                    <div className="d-flex justify-content-between mb-4">

                        <p>
                            Tìm thấy <b>{products.length}</b> sản phẩm
                        </p>

                        <select
                            className="form-select w-auto"
                            value={sort}
                            onChange={(e) => {
                                setSort(e.target.value);
                                setPage(1);
                            }}
                        >
                            <option value="">Mặc định</option>
                            <option value="price_asc">Giá tăng dần</option>
                            <option value="price_desc">Giá giảm dần</option>
                        </select>

                    </div>

                    {/* GRID */}

                    <div className="product row g-4 align-items-stretch">

                        {loading ? (
                            <p>Đang tải sản phẩm...</p>
                        ) : products.length ? (
                            products.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))
                        ) : (
                            <p>Không tìm thấy sản phẩm</p>
                        )}

                    </div>

                    {/* PAGINATION */}

                    <div className="d-flex justify-content-center mt-5">

                        <ul className="pagination">

                            {Array.from({ length: totalPages }, (_, i) => (

                                <li
                                    key={i}
                                    className={`page-item ${page === i + 1 ? "active" : ""}`}
                                >

                                    <button
                                        className="page-link"
                                        onClick={() => setPage(i + 1)}
                                    >
                                        {i + 1}
                                    </button>

                                </li>

                            ))}

                        </ul>

                    </div>

                </div>
            </div>
        </div>
    );
};

export default ShopPage;
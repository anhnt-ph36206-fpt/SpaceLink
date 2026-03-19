import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { axiosInstance } from "../../api/axios";
import { useCart } from "../../context/CartContext";
import ProductCard from "../common/ProductCard";
import VariantSelectorModal from "../product/VariantSelectorModal";
import { toast } from "react-toastify";

interface ApiProduct {
    id: number;
    name: string;
    price: number;
    sale_price?: number | null;
    quantity?: number;
    is_featured: boolean;
    is_active: boolean;
    image?: string | null;
    images?: { id: number; image_path: string; image_url?: string; is_primary: boolean }[];
    category?: { id: number; name: string } | null;
    variants?: { id: number; price: number; sale_price?: number; quantity: number }[];
}

interface ApiCategory {
    id: number;
    name: string;
    slug: string;
    parent_id: number | null;
}

interface ProductDisplay {
    id: number;
    name: string;
    categoryId: number;
    categoryName: string;
    image: string;
    price: number;
    oldPrice: number;
    isSale: boolean;
    isFeatured: boolean;
    stock: number;
    rawProduct: any;
}

interface SectionState {
    products: ProductDisplay[];      // currently displayed (after filter)
    baseCount: number;               // total products in section (never changes) — used to decide visibility
    loading: boolean;
    activeCatId: number | 'all';
}

const resolveImage = (p: ApiProduct): string => {
    if (p.image) return p.image;
    const primary = p.images?.find(i => i.is_primary) || p.images?.[0];
    if (!primary) return '';
    return primary.image_url || `http://localhost:8000/storage/${primary.image_path}`;
};

const mapProduct = (p: ApiProduct): ProductDisplay => {
    const displayPrice = p.sale_price && Number(p.sale_price) < Number(p.price) ? Number(p.sale_price) : Number(p.price);
    return {
        id: p.id,
        name: p.name,
        categoryId: p.category?.id ?? 0,
        categoryName: p.category?.name ?? '',
        image: resolveImage(p),
        price: displayPrice,
        oldPrice: Number(p.price),
        isSale: !!(p.sale_price && Number(p.sale_price) < Number(p.price)),
        isFeatured: p.is_featured,
        stock: p.quantity ?? 0,
        rawProduct: p,
    };
};

/* ── Skeleton ── */
const SkeletonCards: React.FC = () => (
    <div className="row g-3 g-md-4">
        {[...Array(4)].map((_, i) => (
            <div key={i} className="col-6 col-sm-6 col-md-4 col-lg-3">
                <div className="rounded" style={{
                    height: 280, background: 'linear-gradient(90deg,#ececec 25%,#f5f5f5 50%,#ececec 75%)',
                    backgroundSize: '200% 100%', animation: 'ptShimmer 1.4s infinite',
                }} />
            </div>
        ))}
    </div>
);

/* ── Section Header với sub-category pills ── */
interface SectionHeaderProps {
    category: ApiCategory;
    subCategories: ApiCategory[];
    activeCatId: number | 'all';
    onPillClick: (id: number | 'all') => void;
}
const SectionHeader: React.FC<SectionHeaderProps> = ({ category, subCategories, activeCatId, onPillClick }) => (
    <div className="d-flex flex-column flex-md-row align-items-md-center justify-content-between mb-4 pb-3"
        style={{ borderBottom: '2px solid var(--bs-primary)' }}>
        <h4 className="fw-bold text-dark mb-2 mb-md-0" style={{ fontFamily: "'Roboto', sans-serif", fontSize: '1.15rem' }}>
            {category.name}
        </h4>
        {subCategories.length > 0 && (
            <div className="d-flex flex-wrap gap-2">
                <button
                    className={`btn btn-sm rounded-pill px-3 ${activeCatId === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                    style={{ fontFamily: "'Roboto', sans-serif", fontWeight: 500, fontSize: '0.82rem' }}
                    onClick={() => onPillClick('all')}
                >
                    Tất cả
                </button>
                {subCategories.map(sub => (
                    <button
                        key={sub.id}
                        className={`btn btn-sm rounded-pill px-3 ${activeCatId === sub.id ? 'btn-primary' : 'btn-outline-primary'}`}
                        style={{ fontFamily: "'Roboto', sans-serif", fontWeight: 500, fontSize: '0.82rem' }}
                        onClick={() => onPillClick(sub.id)}
                    >
                        {sub.name}
                    </button>
                ))}
            </div>
        )}
    </div>
);

/* ── Main Component ── */
const ProductTabs: React.FC = () => {
    const { addToCart } = useCart();
    const [parentCategories, setParentCategories] = useState<ApiCategory[]>([]);
    const [allCategories, setAllCategories] = useState<ApiCategory[]>([]);
    const [sections, setSections] = useState<Record<number, SectionState>>({});
    const [initialLoading, setInitialLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);

    /* Fetch products for a specific category_id from API */
    const fetchProductsByCat = useCallback(async (categoryId: number | null): Promise<ProductDisplay[]> => {
        const params: any = { per_page: 100 };
        if (categoryId !== null) params.category_id = categoryId;
        const res = await axiosInstance.get('/products', { params });
        const raw: ApiProduct[] = res.data?.data || [];
        return raw.map(mapProduct);
    }, []);

    /* Initial load: fetch categories + all products */
    useEffect(() => {
        const fetchAll = async () => {
            setInitialLoading(true);
            try {
                const [catRes, prodRes] = await Promise.all([
                    axiosInstance.get('/client/categories'),
                    axiosInstance.get('/products', { params: { per_page: 100 } }),
                ]);

                const rawCats: ApiCategory[] = catRes.data?.data || [];
                setAllCategories(rawCats);

                const parents = rawCats.filter(c => c.parent_id === null);
                setParentCategories(parents);

                const allProducts: ProductDisplay[] = (prodRes.data?.data || []).map(mapProduct);

                /* Build initial sections — distribute products to matching parent */
                const initSections: Record<number, SectionState> = {};
                parents.forEach(parent => {
                    const subIds = rawCats.filter(c => c.parent_id === parent.id).map(c => c.id);
                    // products that belong to this parent directly OR via sub-cat
                    const matching = allProducts.filter(p =>
                        p.categoryId === parent.id || subIds.includes(p.categoryId)
                    );
                    initSections[parent.id] = {
                        products: matching,
                        baseCount: matching.length,
                        loading: false,
                        activeCatId: 'all',
                    };
                });
                setSections(initSections);
            } catch (e) {
                console.error('Lỗi tải ProductTabs', e);
            } finally {
                setInitialLoading(false);
            }
        };
        fetchAll();
    }, []);

    /* When pill clicked: call API with category_id to get exact products */
    const handlePillClick = async (parentId: number, catId: number | 'all') => {
        setSections(prev => ({
            ...prev,
            [parentId]: { ...prev[parentId], loading: true, activeCatId: catId },
        }));

        try {
            let products: ProductDisplay[];
            if (catId === 'all') {
                const subIds = allCategories.filter(c => c.parent_id === parentId).map(c => c.id);
                const all = await fetchProductsByCat(null);
                products = all.filter(p =>
                    p.categoryId === parentId || subIds.includes(p.categoryId)
                );
            } else {
                products = await fetchProductsByCat(catId);
            }
            // Preserve baseCount! không thay đổi — chỉ update products + activeCatId
            setSections(prev => ({
                ...prev,
                [parentId]: { ...prev[parentId], products, loading: false, activeCatId: catId },
            }));
        } catch {
            setSections(prev => ({
                ...prev,
                [parentId]: { ...prev[parentId], loading: false },
            }));
        }
    };


    const handleQuickAdd = async (p: ProductDisplay) => {
        const t = toast.info('Đang tải thông tin sản phẩm...', { autoClose: false });
        try {
            const res = await axiosInstance.get(`/products/${p.id}`);
            if (res.data?.data) {
                setSelectedProduct(res.data.data);
                setModalVisible(true);
            } else toast.error('Không tìm thấy dữ liệu sản phẩm');
        } catch {
            toast.error('Không thể lấy thông tin sản phẩm');
        } finally {
            toast.dismiss(t);
        }
    };

    /* Only show sections that have at least 1 product in total (baseCount), regardless of current filter */
    const activeSections = parentCategories.filter(p => (sections[p.id]?.baseCount ?? 0) > 0);

    if (initialLoading) {
        return (
            <div className="container-fluid py-5 bg-light">
                <style>{`@keyframes ptShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
                <div className="container"><SkeletonCards /></div>
            </div>
        );
    }

    if (activeSections.length === 0) return null;

    return (
        <div className="container-fluid py-5" style={{ background: '#f8f9fa' }}>
            <style>{`@keyframes ptShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
            <div className="container">

                {/* Page title */}
                <div className="text-center mb-5">
                    <h5 className="text-primary text-uppercase fw-bold mb-1"
                        style={{ fontFamily: "'Roboto', sans-serif", letterSpacing: '2px', fontSize: '0.82rem' }}>
                        <i className="fas fa-box me-2" />Sản phẩm
                    </h5>
                    <h2 className="fw-bold text-dark"
                        style={{ fontFamily: "'Roboto', sans-serif", fontSize: 'clamp(1.5rem,2.5vw,2.2rem)' }}>
                        Sản Phẩm Của Chúng Tôi
                    </h2>
                </div>

                {/* Sections */}
                {activeSections.map((parentCat, sectionIdx) => {
                    const sec = sections[parentCat.id];
                    const subCats = allCategories.filter(c => c.parent_id === parentCat.id);
                    const LIMIT = 8;
                    const displayed = sec.products.slice(0, LIMIT);

                    return (
                        <div key={parentCat.id}
                            className={sectionIdx > 0 ? 'mt-5 pt-4' : ''}
                            style={sectionIdx > 0 ? { borderTop: '1px solid #e9ecef' } : {}}>

                            <SectionHeader
                                category={parentCat}
                                subCategories={subCats}
                                activeCatId={sec.activeCatId}
                                onPillClick={(id) => handlePillClick(parentCat.id, id)}
                            />

                            {sec.loading ? (
                                <SkeletonCards />
                            ) : displayed.length === 0 ? (
                                <div className="text-center py-4 text-muted"
                                    style={{ fontFamily: "'Roboto', sans-serif" }}>
                                    <i className="fas fa-box-open fa-2x mb-2 d-block" />
                                    Không có sản phẩm nào trong danh mục này.
                                </div>
                            ) : (
                                <>
                                    <div className="row g-3 g-md-4">
                                        {displayed.map((p, index) => (
                                            <ProductCard
                                                key={p.id}
                                                index={index}
                                                product={{
                                                    id: p.id.toString(),
                                                    name: p.name,
                                                    image: p.image,
                                                    price: p.price,
                                                    oldPrice: p.oldPrice,
                                                    category: p.categoryName,
                                                    isSale: p.isSale,
                                                    rating: 5,
                                                    isNew: false,
                                                }}
                                                onAddToCart={() => handleQuickAdd(p)}
                                            />
                                        ))}
                                    </div>

                                    {sec.products.length > LIMIT && (
                                        <div className="text-center mt-4">
                                            <Link
                                                to={`/shop?category=${parentCat.id}`}
                                                className="btn btn-outline-primary rounded-pill px-4 py-2"
                                                style={{ fontFamily: "'Roboto', sans-serif", fontWeight: 500 }}>
                                                Xem thêm {parentCat.name} <i className="fas fa-arrow-right ms-2" />
                                            </Link>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    );
                })}

                {/* View all */}
                <div className="text-center mt-5 pt-4" style={{ borderTop: '1px solid #e9ecef' }}>
                    <Link to="/shop" className="btn btn-primary rounded-pill py-2 px-5"
                        style={{ fontFamily: "'Roboto', sans-serif", fontWeight: 600 }}>
                        Xem tất cả sản phẩm <i className="fas fa-arrow-right ms-2" />
                    </Link>
                </div>

            </div>

            <VariantSelectorModal
                visible={modalVisible}
                product={selectedProduct}
                onCancel={() => setModalVisible(false)}
                onAddToCart={(vId, q) => addToCart(vId, q)}
            />
        </div>
    );
};

export default ProductTabs;
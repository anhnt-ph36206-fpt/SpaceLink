import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { axiosInstance } from "../api/axios";
import { useCart } from "../context/CartContext";
import { useCompare } from "../context/CompareContext";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";
import ProductCard from "../components/common/ProductCard";
import { toast } from "react-toastify";
import { Spin } from "antd";
import MDEditor from '@uiw/react-md-editor';

// ─── Types ───────────────────────────────────────────────────────────────
interface AttrInfo {
    id: number;
    value: string;
    color_code?: string;
    group?: string;
}

interface Variant {
    id: number;
    sku?: string;
    price: number;
    sale_price?: number | null;
    quantity: number;
    image?: string | null;
    attributes: AttrInfo[];
}

interface ProductImage {
    id: number;
    image_path: string;
    image_url?: string;
    is_primary: boolean;
}

interface Product {
    id: number;
    name: string;
    slug: string;
    sku?: string;
    description?: string;
    content?: string;
    price: number;
    sale_price?: number | null;
    quantity: number;
    is_featured: boolean;
    is_active: boolean;
    category?: { id: number; name: string };
    brand?: { id: number; name: string };
    images?: ProductImage[];
    variants?: Variant[];
}

// ─── Review Types ─────────────────────────────────────────────────────────
interface ReviewItem {
    id: number;
    rating: number;
    content?: string;
    admin_reply?: string;
    replied_at?: string;
    created_at: string;
    user?: { id: number; fullname: string };
}

interface ReviewStats {
    average_rating: number;
    total_reviews: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────
const imgUrl = (img: ProductImage | null | undefined) =>
    img?.image_url || (img?.image_path ? `http://localhost:8000/storage/${img.image_path}` : null);

const varImgUrl = (v: Variant | null) => {
    if (!v?.image) return null;
    return v.image.startsWith('http') ? v.image : `http://localhost:8000/storage/${v.image}`;
};

const formatVND = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);



// ─── Component ───────────────────────────────────────────────────────────
const ProductDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { addToCart } = useCart();
    const { addToCompare, removeFromCompare, isInCompare, compareList } = useCompare();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();

    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
    const [selectedAttrs, setSelectedAttrs] = useState<Record<string, number>>({}); // groupName -> attrId
    const [mainImg, setMainImg] = useState<string | null>(null);
    const [defaultMainImg, setDefaultMainImg] = useState<string | null>(null);
    const [qty, setQty] = useState(1);
    const [activeTab, setActiveTab] = useState<'desc' | 'content' | 'specs' | 'reviews'>('desc');
    const [relatedProducts, setRelatedProducts] = useState<{ id: string; name: string; image: string; price: number; oldPrice?: number; category?: string; rating?: number; isSale?: boolean; isNew?: boolean }[]>([]);
    const { isAuthenticated } = useAuth();

    // ── Reviews state ──────────────────────────────────────────────────
    const [reviews, setReviews] = useState<ReviewItem[]>([]);
    const [reviewStats, setReviewStats] = useState<ReviewStats>({ average_rating: 0, total_reviews: 0 });
    const [reviewPage, setReviewPage] = useState(1);
    const [reviewLastPage, setReviewLastPage] = useState(1);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    // Eligible order_item for submitting a review (null = not purchased/already reviewed)
    const [eligibleOrderItemId, setEligibleOrderItemId] = useState<number | null | 'loading'>('loading');
    // Write form
    const [writeRating, setWriteRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [writeContent, setWriteContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // ── Fetch reviews ──────────────────────────────────────────────────
    const fetchReviews = (page = 1) => {
        if (!id) return;
        setReviewsLoading(true);
        axiosInstance.get(`/products/${id}/reviews`, { params: { page } })
            .then(res => {
                setReviews(res.data.data?.data ?? []);
                setReviewLastPage(res.data.data?.last_page ?? 1);
                setReviewStats(res.data.stats ?? { average_rating: 0, total_reviews: 0 });
            })
            .catch(() => {})
            .finally(() => setReviewsLoading(false));
    };

    useEffect(() => { fetchReviews(reviewPage); }, [id, reviewPage]);

    // ── Check if user can review this product ──────────────────────────
    useEffect(() => {
        if (!isAuthenticated || !id) {
            setEligibleOrderItemId(null);
            return;
        }
        setEligibleOrderItemId('loading');
        axiosInstance.get('/client/orders')
            .then(res => {
                const orders: any[] = res.data.data?.data ?? res.data.data ?? [];
                let found: number | null = null;
                for (const order of orders) {
                    if (!['delivered', 'completed'].includes(order.status)) continue;
                    const items: any[] = order.order_items ?? order.items ?? [];
                    const item = items.find((i: any) =>
                        String(i.product_id) === String(id) && !i.is_reviewed
                    );
                    if (item) { found = item.id; break; }
                }
                setEligibleOrderItemId(found);
            })
            .catch(() => setEligibleOrderItemId(null));
    }, [isAuthenticated, id]);

    // ── Submit review ──────────────────────────────────────────────────
    const handleSubmitReview = async () => {
        if (!eligibleOrderItemId || eligibleOrderItemId === 'loading') return;
        setSubmitting(true);
        try {
            await axiosInstance.post('/client/reviews', {
                order_item_id: eligibleOrderItemId,
                rating: writeRating,
                content: writeContent || null,
            });
            toast.success('Cảm ơn bạn đã đánh giá sản phẩm!');
            setEligibleOrderItemId(null);
            setWriteContent('');
            setWriteRating(5);
            // Refresh reviews list
            setReviewPage(1);
            fetchReviews(1);
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? 'Không thể gửi đánh giá.');
        } finally {
            setSubmitting(false);
        }
    };

    // ── Fetch related products ─────────────────────────────────────────
    useEffect(() => {
        if (!product?.category?.id) return;
        axiosInstance.get('/products', {
            params: { category_id: product.category.id, per_page: 9 }
        }).then(res => {
            const items = res.data.data ?? [];
            setRelatedProducts(
                items
                    .filter((p: any) => String(p.id) !== String(product.id))
                    .slice(0, 8)
                    .map((p: any) => ({
                        id: String(p.id),
                        name: p.name,
                        image: p.image,
                        price: p.sale_price ? Number(p.sale_price) : Number(p.price),
                        oldPrice: p.sale_price ? Number(p.price) : undefined,
                        category: p.category?.name ?? '',
                        rating: 4,
                        isSale: !!p.sale_price,
                        isNew: p.is_featured,
                    }))
            );
        }).catch(() => {});
    }, [product]);

    // ── Fetch ──────────────────────────────────────────────────────────
    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            try {
                const res = await axiosInstance.get(`/products/${id}`);
                const p: Product = res.data.data;
                setProduct(p);

                // Set default image
                const primary = p.images?.find(i => i.is_primary) || p.images?.[0];
                const defaultUrl = imgUrl(primary);
                setDefaultMainImg(defaultUrl);
                setMainImg(defaultUrl);

                // If variants exist, select the first one
                if (p.variants && p.variants.length > 0) {
                    const firstVariant = p.variants[0];
                    setSelectedVariant(firstVariant);
                    // Build selected attrs map
                    const attrsMap: Record<string, number> = {};
                    firstVariant.attributes.forEach(a => {
                        if (a.group) attrsMap[a.group] = a.id;
                    });
                    setSelectedAttrs(attrsMap);
                    const vi = varImgUrl(firstVariant);
                    if (vi) setMainImg(vi);
                }
            } catch {
                navigate('/shop');
            } finally {
                setLoading(false);
            }
        };
        fetch();
        window.scrollTo(0, 0);
    }, [id]);

    // ── Attribute groups ───────────────────────────────────────────────
    const attrGroups = useMemo(() => {
        if (!product?.variants?.length) return [];
        const groupMap = new Map<string, AttrInfo[]>();
        product.variants.forEach(v => {
            v.attributes.forEach(a => {
                if (!a.group) return;
                if (!groupMap.has(a.group)) groupMap.set(a.group, []);
                const existing = groupMap.get(a.group)!;
                if (!existing.find(e => e.id === a.id)) existing.push(a);
            });
        });
        return Array.from(groupMap.entries()).map(([group, attrs]) => ({ group, attrs }));
    }, [product]);

    // ── Select attribute ───────────────────────────────────────────────
    const handleSelectAttr = (group: string, attrId: number) => {
        const isSelected = selectedAttrs[group] === attrId;
        const newSelected: Record<string, number> = { ...selectedAttrs };

        if (isSelected) {
            delete newSelected[group];
        } else {
            newSelected[group] = attrId;
        }

        setSelectedAttrs(newSelected);

        const allNextSelected =
            attrGroups.length === 0 ? true : attrGroups.every(({ group }) => !!newSelected[group]);

        if (!allNextSelected) {
            setSelectedVariant(null);
            setQty(1);
            setMainImg(defaultMainImg);
            return;
        }

        const selectedIds = Object.values(newSelected);
        const match = product?.variants?.find((v) => {
            if (v.quantity <= 0) return false;
            return selectedIds.every((sid) => v.attributes.some((a) => a.id === sid));
        }) ?? null;

        setSelectedVariant(match);
        setQty(1);
        const vi = match ? varImgUrl(match) : null;
        setMainImg(vi ?? defaultMainImg);
    };

    // ── Derived ────────────────────────────────────────────────────────
    const displayPrice = selectedVariant
        ? (selectedVariant.sale_price && selectedVariant.sale_price < selectedVariant.price
            ? selectedVariant.sale_price
            : selectedVariant.price)
        : (product?.sale_price && product.sale_price < product.price
            ? product.sale_price
            : product?.price ?? 0);

    const originalPrice = selectedVariant?.price ?? product?.price ?? 0;
    const discountPct = originalPrice > displayPrice
        ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
        : 0;

    const stock = selectedVariant?.quantity ?? 0;
    const maxQty = Math.max(1, stock);

    // ── Add to cart ────────────────────────────────────────────────────
    const handleAddToCart = (goToCart = false) => {
        if (!product) return;

        if (!selectedVariant) {
            toast.warning('Vui lòng chọn đầy đủ thuộc tính sản phẩm!');
            return;
        }

        if (stock <= 0) {
            toast.error('Sản phẩm này hiện đang hết hàng!');
            return;
        }

        if (qty > stock) {
            toast.error('Số lượng trong kho không đủ!');
            return;
        }

        addToCart(selectedVariant.id, qty);

        if (goToCart) {
            navigate('/cart');
        }
    };

    // ── Buy Now (Direct Checkout) ─────────────────────────────────────────
    const [isChecking, setIsChecking] = useState(false);
    const handleBuyNow = async () => {
        if (!product || !selectedVariant) {
            toast.warning('Vui lòng chọn các thuộc tính sản phẩm!');
            return;
        }

        if (stock < qty) {
            toast.error('Số lượng trong kho không đủ!');
            return;
        }

        setIsChecking(true);
        try {
            // "Call data check như web bán hàng thực tế"
            // Re-fetch latest data to ensure no stock changes or product deletions
            const res = await axiosInstance.get(`/products/${id}`);
            const latestProduct = res.data.data;

            // Check if product is still active
            if (!latestProduct.is_active) {
                toast.error('Sản phẩm này hiện không còn kinh doanh.');
                return;
            }

            // Find current selected variant in the latest data
            const latestVariant = latestProduct.variants?.find((v: Variant) => v.id === selectedVariant.id);
            if (!latestVariant) {
                toast.error('Phân loại sản phẩm này không còn tồn tại.');
                return;
            }

            if (latestVariant.quantity < qty) {
                toast.error(`Số lượng tồn kho không đủ (còn ${latestVariant.quantity} sản phẩm)`);
                // Update local state to reflect latest reality
                setProduct(latestProduct);
                return;
            }

            // If all good, navigate directly to checkout with this item (Buy Now flow)
            // Passing state so checkout page knows to use this item instead of cart
            navigate('/checkout', {
                state: {
                    buyNowItem: {
                        productId: product.id,
                        variantId: selectedVariant.id,
                        name: product.name,
                        image: varImgUrl(selectedVariant) || imgUrl(product.images?.[0]) || '',
                        price: displayPrice,
                        quantity: qty,
                        attributes: selectedVariant.attributes.map(a => a.value).join(' / '),
                        sku: selectedVariant.sku || product.sku,
                        stock: latestVariant.quantity
                    }
                }
            });

        } catch (error: any) {
            console.error('Buy Now Check Failed:', error);
            toast.error('Không thể kiểm tra sản phẩm lúc này. Vui lòng thử lại.');
        } finally {
            setIsChecking(false);
        }
    };

    // ─────────────────────────────────────────────────────────────────
    if (loading) return (
        <div className="container py-5">
            <div className="row g-4">
                <div className="col-md-5">
                    <div style={{ height: 420, background: '#f0f0f0', borderRadius: 16 }} />
                </div>
                <div className="col-md-7">
                    {[300, 200, 100, 150, 80, 200].map((w, i) => (
                        <div key={i} style={{ height: 20, background: '#eee', borderRadius: 4, width: w, marginBottom: 16 }} />
                    ))}
                </div>
            </div>
        </div>
    );

    if (!product) return null;

    const allImages = product.images || [];

    return (
        <div className="bg-light min-vh-100">
            {/* Breadcrumb */}
            <div className="container py-3">
                <nav>
                    <ol className="breadcrumb mb-0">
                        <li className="breadcrumb-item">
                            <Link to="/" className="text-decoration-none text-muted">Trang chủ</Link>
                        </li>
                        {product.category && (
                            <li className="breadcrumb-item">
                                <Link to="/shop" className="text-decoration-none text-muted">{product.category.name}</Link>
                            </li>
                        )}
                        <li className="breadcrumb-item active">{product.name}</li>
                    </ol>
                </nav>
            </div>

            <div className="container mb-5">
                {/* ── Product Main ─────────────────────────────────────── */}
                <div className="card border-0 shadow-sm mb-4" style={{ borderRadius: 16, overflow: 'hidden' }}>
                    <div className="row g-0">
                        {/* Images */}
                        <div className="col-lg-5 p-3 p-lg-4 d-flex flex-column align-items-center bg-white border-end">
                            {/* Main image */}
                            <div
                                className="position-relative w-100 text-center mb-3"
                                style={{ height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', borderRadius: 12 }}
                            >
                                {discountPct > 0 && (
                                    <span
                                        className="position-absolute top-0 start-0 m-3 badge bg-danger rounded-pill"
                                        style={{ fontSize: 14, padding: '6px 12px' }}
                                    >
                                        -{discountPct}%
                                    </span>
                                )}
                                {mainImg ? (
                                    <img
                                        src={mainImg}
                                        alt={product.name}
                                        style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                                    />
                                ) : (
                                    <i className="fas fa-box fa-5x text-muted" />
                                )}
                            </div>

                            {/* Thumbnails */}
                            {allImages.length > 1 && (
                                <div className="d-flex gap-2 flex-wrap justify-content-center">
                                    {allImages.map(img => {
                                        const url = imgUrl(img);
                                        return url ? (
                                            <img
                                                key={img.id}
                                                src={url}
                                                alt=""
                                                onClick={() => setMainImg(url)}
                                                style={{
                                                    width: 64, height: 64, objectFit: 'cover', borderRadius: 8,
                                                    cursor: 'pointer', border: mainImg === url ? '2px solid #0d6efd' : '2px solid #dee2e6',
                                                    transition: 'border .2s',
                                                }}
                                            />
                                        ) : null;
                                    })}
                                </div>
                            )}
                        </div>

                        {/* Info */}
                        <div className="col-lg-7 p-4 p-lg-5">
                            {/* Badges */}
                            <div className="d-flex gap-2 mb-2">
                                {product.brand && (
                                    <span className="badge bg-secondary rounded-pill">{product.brand.name}</span>
                                )}
                                {product.is_featured && (
                                    <span className="badge bg-warning text-dark rounded-pill">⭐ Nổi bật</span>
                                )}
                            </div>

                            <h1 className="h2 fw-bold mb-2">{product.name}</h1>

                            {product.description && (
                                <div 
                                    data-color-mode="light" 
                                    className="mb-3 description-preview text-muted"
                                    style={{ fontSize: '14.5px', lineHeight: '1.6' }}
                                >
                                    <MDEditor.Markdown source={product.description} />
                                </div>
                            )}

                            {/* Price */}
                            <div className="bg-light rounded-3 p-3 mb-4 d-flex align-items-center gap-3">
                                <span className="fw-bold" style={{ fontSize: 30, color: '#ff7a00' }}>
                                    {formatVND(displayPrice)}
                                </span>
                                {discountPct > 0 && (
                                    <>
                                        <del className="text-muted fs-6">{formatVND(originalPrice)}</del>
                                        <span className="badge rounded-pill" style={{ backgroundColor: '#ff7a00' }}>
                                            Tiết kiệm {discountPct}%
                                        </span>
                                    </>
                                )}
                            </div>

                            {/* Attribute selectors */}
                            {attrGroups.map(({ group, attrs }) => (
                                <div key={group} className="mb-3">
                                    <label className="fw-semibold mb-2 d-block text-uppercase small text-muted">{group}</label>
                                    <div className="d-flex flex-wrap gap-2">
                                        {attrs.map(attr => {
                                            const isSelected = selectedAttrs[group] === attr.id;
                                            const isColorGroup = /color|mau|màu|colour/i.test(group);
                                            const isColor = !!attr.color_code && isColorGroup;

                                            // Check if this attr is available given other selections
                                            const isAvailable = product.variants?.some(v => {
                                                const hasThisAttr = v.attributes.some(a => a.id === attr.id);
                                                const otherGroupsMatch = Object.entries(selectedAttrs).every(
                                                    ([g, sid]) => g === group || v.attributes.some(a => a.id === sid)
                                                );
                                                return hasThisAttr && otherGroupsMatch && v.quantity > 0;
                                            });

                                            return isColor ? (
                                                <button
                                                    key={attr.id}
                                                    title={attr.value}
                                                    onClick={() => {
                                                        if (isSelected) handleSelectAttr(group, attr.id);
                                                        else if (isAvailable) handleSelectAttr(group, attr.id);
                                                    }}
                                                    style={{
                                                        width: 32, height: 32, borderRadius: '50%',
                                                        background: attr.color_code,
                                                        border: isSelected ? '3px solid #ff7a00' : '2px solid #dee2e6',
                                                        cursor: isAvailable ? 'pointer' : 'not-allowed',
                                                        opacity: isAvailable ? 1 : 0.35,
                                                        transition: 'all .2s',
                                                        transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                                                        boxShadow: isSelected ? '0 0 10px rgba(255,122,0,0.3)' : 'none'
                                                    }}
                                                />
                                            ) : (
                                                <button
                                                    key={attr.id}
                                                    className="btn btn-sm"
                                                    style={{
                                                        borderRadius: 8, 
                                                        fontWeight: isSelected ? 700 : 400,
                                                        opacity: isAvailable ? 1 : 0.4,
                                                        cursor: isAvailable ? 'pointer' : 'not-allowed',
                                                        borderColor: isSelected ? '#ff7a00' : '#dee2e6',
                                                        backgroundColor: isSelected ? '#fffcf8' : 'transparent',
                                                        color: isSelected ? '#ff7a00' : '#6c757d',
                                                        borderWidth: 2,
                                                        transition: 'all .2s'
                                                    }}
                                                    onClick={() => {
                                                        if (isSelected) handleSelectAttr(group, attr.id);
                                                        else if (isAvailable) handleSelectAttr(group, attr.id);
                                                    }}
                                                >
                                                    {attr.value}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            {/* Stock status */}
                            <p className={`small mb-3 ${selectedVariant ? (stock > 0 ? 'text-success' : 'text-danger') : 'text-muted'}`}>
                                {selectedVariant && (
                                    stock > 0 ? (
                                        <><i className="fas fa-check-circle me-1" />Còn {stock} sản phẩm</>
                                    ) : (
                                        <><i className="fas fa-times-circle me-1" />Hết hàng</>
                                    )
                                )}
                            </p>

                            <div className="d-flex align-items-center gap-3 pt-4 border-top mt-4 flex-wrap">
                                {/* Qty picker - Premium Styled */}
                                <div 
                                    className="d-flex align-items-center" 
                                    style={{ 
                                        height: 48, 
                                        border: '1px solid #dee2e6', 
                                        borderRadius: 12,
                                        overflow: 'hidden',
                                        background: '#fff'
                                    }}
                                >
                                    <button
                                        className="btn btn-link text-dark text-decoration-none px-3 h-100 shadow-none"
                                        style={{ border: 'none', background: 'transparent' }}
                                        onClick={() => setQty(q => Math.max(1, q - 1))}
                                        disabled={qty <= 1}
                                    >
                                        <i className="fas fa-minus small" />
                                    </button>
                                    <input
                                        type="text"
                                        className="form-control text-center border-0 fw-bold shadow-none"
                                        style={{ width: 45, background: 'transparent', fontSize: 16 }}
                                        value={qty}
                                        onChange={e => {
                                            const v = parseInt(e.target.value) || 1;
                                            setQty(Math.min(maxQty, Math.max(1, v)));
                                        }}
                                    />
                                    <button
                                        className="btn btn-link text-dark text-decoration-none px-3 h-100 shadow-none"
                                        style={{ border: 'none', background: 'transparent' }}
                                        onClick={() => setQty(q => Math.min(maxQty, q + 1))}
                                        disabled={qty >= maxQty}
                                    >
                                        <i className="fas fa-plus small" />
                                    </button>
                                </div>

                                <button
                                    className="btn btn-lg flex-grow-1 shop-btn-outline-orange"
                                    style={{
                                        borderRadius: 12,
                                        fontWeight: 600,
                                        height: 48,
                                        border: '2px solid #ff7a00',
                                        color: '#ff7a00',
                                        transition: 'all .3s ease'
                                    }}
                                    disabled={stock === 0}
                                    onClick={() => handleAddToCart(false)}
                                >
                                    <i className="fas fa-cart-plus me-2" />Giỏ hàng
                                </button>

                                <button
                                    className="btn btn-lg shop-btn-orange"
                                    style={{
                                        borderRadius: 12,
                                        fontWeight: 700,
                                        height: 48,
                                        padding: '0 32px',
                                        background: '#ff7a00',
                                        borderColor: '#ff7a00',
                                        color: '#fff',
                                        transition: 'all .3s ease',
                                        boxShadow: '0 4px 15px rgba(255,122,0,0.2)'
                                    }}
                                    disabled={stock === 0 || isChecking}
                                    onClick={handleBuyNow}
                                >
                                    {isChecking ? <Spin size="small" className="me-2" /> : 'Mua Ngay'}
                                </button>
                            </div>

                            {/* Compare and Wishlist buttons */}
                            <div className="d-flex gap-2 w-100 mt-3 flex-column flex-sm-row">
                                {(() => {
                                    const pid = String(product.id);
                                    const inCompare = isInCompare(pid);
                                    const isFull = compareList.length >= 4 && !inCompare;
                                    const handleCompareToggle = () => {
                                        if (inCompare) {
                                            removeFromCompare(pid);
                                            toast.info(`Đã xóa "${product.name}" khỏi so sánh`);
                                        } else {
                                            const primaryImg = product.images?.find(i => i.is_primary) || product.images?.[0];
                                            const success = addToCompare({
                                                id: pid,
                                                name: product.name,
                                                image: varImgUrl(selectedVariant) || imgUrl(primaryImg) || '',
                                                price: displayPrice,
                                                oldPrice: discountPct > 0 ? originalPrice : undefined,
                                                category: product.category?.name,
                                                rating: undefined,
                                            });
                                            if (!success) {
                                                toast.warning('Chỉ có thể so sánh tối đa 4 sản phẩm!');
                                            } else {
                                                toast.success(`Đã thêm "${product.name}" vào so sánh`);
                                            }
                                        }
                                    };
                                    return (
                                        <button
                                            className={`btn flex-grow-1 d-flex align-items-center justify-content-center transition-all`}
                                            style={{ 
                                                borderRadius: 12, 
                                                fontWeight: 600, 
                                                fontSize: 14,
                                                height: 44,
                                                border: inCompare ? '2px solid #ffc107' : '2px solid #edeff2',
                                                backgroundColor: inCompare ? '#fffef2' : '#f8f9fa',
                                                color: inCompare ? '#856404' : '#6c757d',
                                            }}
                                            onClick={handleCompareToggle}
                                            disabled={isFull}
                                            title={isFull ? 'Đã đủ 4 sản phẩm so sánh' : inCompare ? 'Xóa khỏi so sánh' : 'Thêm vào so sánh'}
                                        >
                                            <i className={`fas fa-${inCompare ? 'check' : 'balance-scale'} me-2`} style={{ color: inCompare ? '#ffc107' : 'inherit' }} />
                                            {inCompare ? 'Đang so sánh' : isFull ? 'Đủ 4 sản phẩm' : 'So sánh'}
                                        </button>
                                    );
                                })()}
                                
                                {(() => {
                                    const pid = String(product.id);
                                    const inWishlist = isInWishlist(pid);
                                    return (
                                        <button
                                            className="btn flex-grow-1 d-flex align-items-center justify-content-center transition-all"
                                            style={{
                                                borderRadius: 12,
                                                fontWeight: 600,
                                                fontSize: 14,
                                                height: 44,
                                                border: inWishlist ? '2px solid #dc3545' : '2px solid #edeff2',
                                                backgroundColor: inWishlist ? '#fff5f5' : '#f8f9fa',
                                                color: inWishlist ? '#dc3545' : '#6c757d',
                                            }}
                                            onClick={() => {
                                                if (inWishlist) removeFromWishlist(pid);
                                                else addToWishlist(pid);
                                            }}
                                            title={inWishlist ? 'Xóa khỏi yêu thích' : 'Thêm vào yêu thích'}
                                        >
                                            <i className={`${inWishlist ? 'fas' : 'far'} fa-heart me-2`} />
                                            {inWishlist ? 'Đã Yêu thích' : 'Yêu thích'}
                                        </button>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Tabs: Description / Content / Specs ─────────────── */}
                <div className="card border-0 shadow-sm p-4" style={{ borderRadius: 16 }}>
                    <ul className="nav nav-tabs mb-4">
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === 'desc' ? 'active' : ''}`}
                                onClick={() => setActiveTab('desc')}
                            >
                                Mô tả
                            </button>
                        </li>
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === 'content' ? 'active' : ''}`}
                                onClick={() => setActiveTab('content')}
                            >
                                Nội dung chi tiết
                            </button>
                        </li>
                        {selectedVariant && (
                            <li className="nav-item">
                                <button
                                    className={`nav-link ${activeTab === 'specs' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('specs')}
                                >
                                    Thông số biến thể
                                </button>
                            </li>
                        )}
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === 'reviews' ? 'active' : ''}`}
                                onClick={() => setActiveTab('reviews')}
                            >
                                <i className="fas fa-star me-1 text-warning" style={{ fontSize: 12 }} />
                                Đánh giá ({reviewStats.total_reviews})
                            </button>
                        </li>
                    </ul>

                    {activeTab === 'desc' && (
                        <div data-color-mode="light" style={{ padding: '8px 0' }}>
                            {product.description
                                ? <MDEditor.Markdown source={product.description} />
                                : <p className="text-muted">Chưa có mô tả.</p>
                            }
                        </div>
                    )}
                    {activeTab === 'content' && (
                        <div data-color-mode="light" style={{ padding: '8px 0' }}>
                            {product.content
                                ? <MDEditor.Markdown source={product.content} />
                                : <p className="text-muted">Chưa có nội dung chi tiết.</p>
                            }
                        </div>
                    )}
                    {activeTab === 'specs' && selectedVariant && (
                        <table className="table table-bordered w-auto">
                            <tbody>
                                {selectedVariant.sku && (
                                    <tr><th>SKU</th><td>{selectedVariant.sku}</td></tr>
                                )}
                                {selectedVariant.attributes.map(a => (
                                    <tr key={a.id}>
                                        <th>{a.group || 'Thuộc tính'}</th>
                                        <td>
                                            {a.color_code && (
                                                <span
                                                    style={{ width: 16, height: 16, borderRadius: '50%', background: a.color_code, display: 'inline-block', marginRight: 8, border: '1px solid #ccc' }}
                                                />
                                            )}
                                            {a.value}
                                        </td>
                                    </tr>
                                ))}
                                <tr><th>Tồn kho</th><td>{selectedVariant.quantity}</td></tr>
                            </tbody>
                        </table>
                    )}

                    {/* ── Reviews Tab ────────────────────────────────── */}
                    {activeTab === 'reviews' && (
                        <div>
                            {/* Stats overview */}
                            <div className="row g-4 mb-5 align-items-center">
                                <div className="col-auto text-center">
                                    <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1, color: '#ff7a00' }}>
                                        {reviewStats.average_rating > 0 ? reviewStats.average_rating.toFixed(1) : '—'}
                                    </div>
                                    <div className="d-flex gap-1 justify-content-center my-1">
                                        {[1,2,3,4,5].map(s => (
                                            <i key={s} className={`fas fa-star ${s <= Math.round(reviewStats.average_rating) ? 'text-warning' : 'text-muted'}`} style={{ fontSize: 18 }} />
                                        ))}
                                    </div>
                                    <div className="text-muted small">{reviewStats.total_reviews} đánh giá</div>
                                </div>
                                <div className="col">
                                    {[5,4,3,2,1].map(star => {
                                        const count = reviews.filter(r => r.rating === star).length;
                                        const pct = reviewStats.total_reviews > 0 ? Math.round((count / reviewStats.total_reviews) * 100) : 0;
                                        return (
                                            <div key={star} className="d-flex align-items-center gap-2 mb-1">
                                                <span className="text-muted small" style={{ width: 12 }}>{star}</span>
                                                <i className="fas fa-star text-warning small" />
                                                <div className="flex-grow-1 bg-light rounded-pill" style={{ height: 8, overflow: 'hidden' }}>
                                                    <div style={{ width: `${pct}%`, height: '100%', background: '#ffc107', borderRadius: 99, transition: 'width .4s' }} />
                                                </div>
                                                <span className="text-muted small" style={{ width: 24 }}>{count}</span>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Write review form */}
                            <div className="card border-0 mb-4" style={{ background: '#f8f9ff', borderRadius: 12, padding: '20px 24px' }}>
                                <h6 className="fw-bold mb-3"><i className="fas fa-pen me-2 text-primary" />Viết đánh giá của bạn</h6>
                                {!isAuthenticated ? (
                                    <p className="text-muted mb-0">
                                        <Link to="/login" className="text-primary fw-bold">Đăng nhập</Link> để đánh giá sản phẩm này.
                                    </p>
                                ) : eligibleOrderItemId === 'loading' ? (
                                    <div className="text-muted small"><Spin size="small" className="me-2" />Đang kiểm tra lịch sử mua hàng...</div>
                                ) : eligibleOrderItemId === null ? (
                                    <p className="text-muted mb-0 small">
                                        <i className="fas fa-info-circle me-1" />
                                        Bạn cần <strong>mua và nhận hàng thành công</strong> sản phẩm này để có thể đánh giá.
                                    </p>
                                ) : (
                                    <div>
                                        {/* Star picker */}
                                        <div className="d-flex gap-1 mb-3">
                                            {[1,2,3,4,5].map(s => (
                                                <i
                                                    key={s}
                                                    className={`fas fa-star ${s <= (hoverRating || writeRating) ? 'text-warning' : 'text-muted'}`}
                                                    style={{ fontSize: 28, cursor: 'pointer', transition: 'color .15s' }}
                                                    onMouseEnter={() => setHoverRating(s)}
                                                    onMouseLeave={() => setHoverRating(0)}
                                                    onClick={() => setWriteRating(s)}
                                                />
                                            ))}
                                            <span className="ms-2 text-muted align-self-center small">
                                                {['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Xuất sắc'][hoverRating || writeRating]}
                                            </span>
                                        </div>
                                        <textarea
                                            className="form-control mb-3"
                                            rows={3}
                                            placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này... (tuỳ chọn)"
                                            value={writeContent}
                                            onChange={e => setWriteContent(e.target.value)}
                                            maxLength={1000}
                                            style={{ borderRadius: 10, resize: 'none' }}
                                        />
                                        <div className="d-flex justify-content-between align-items-center">
                                            <span className="text-muted small">{writeContent.length}/1000</span>
                                            <button
                                                className="btn btn-primary px-4"
                                                style={{ borderRadius: 8, fontWeight: 600 }}
                                                onClick={handleSubmitReview}
                                                disabled={submitting}
                                            >
                                                {submitting ? <Spin size="small" className="me-2" /> : <i className="fas fa-paper-plane me-2" />}
                                                Gửi đánh giá
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Reviews list */}
                            {reviewsLoading ? (
                                <div className="text-center py-4"><Spin /></div>
                            ) : reviews.length === 0 ? (
                                <div className="text-center py-4 text-muted">
                                    <i className="fas fa-comment-slash fa-2x mb-3" style={{ opacity: .3 }} />
                                    <p className="mb-0">Chưa có đánh giá nào. Hãy là người đầu tiên!</p>
                                </div>
                            ) : (
                                <>
                                    {reviews.map(review => (
                                        <div key={review.id} className="border-bottom pb-4 mb-4">
                                            <div className="d-flex align-items-center gap-3 mb-2">
                                                {/* Avatar */}
                                                <div style={{
                                                    width: 40, height: 40, borderRadius: '50%',
                                                    background: 'linear-gradient(135deg,#0d6efd,#6610f2)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: '#fff', fontWeight: 700, flexShrink: 0,
                                                }}>
                                                    {(review.user?.fullname ?? 'A').charAt(0).toUpperCase()}
                                                </div>
                                                <div>
                                                    <div className="fw-bold" style={{ fontSize: 14 }}>{review.user?.fullname ?? 'Ẩn danh'}</div>
                                                    <div className="d-flex gap-1 align-items-center">
                                                        {[1,2,3,4,5].map(s => (
                                                            <i key={s} className={`fas fa-star small ${s <= review.rating ? 'text-warning' : 'text-muted'}`} />
                                                        ))}
                                                        <span className="text-muted ms-2" style={{ fontSize: 12 }}>
                                                            {new Date(review.created_at).toLocaleDateString('vi-VN')}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                            {review.content && (
                                                <p className="text-muted mb-2" style={{ fontSize: 14, lineHeight: 1.6 }}>{review.content}</p>
                                            )}
                                            {/* Admin reply */}
                                            {review.admin_reply && (
                                                <div style={{ background: '#fff9f2', borderLeft: '3px solid #ff7a00', borderRadius: '0 8px 8px 0', padding: '10px 14px', marginTop: 8 }}>
                                                    <div className="fw-bold mb-1" style={{ fontSize: 12, color: '#ff7a00' }}>
                                                        <i className="fas fa-store me-1" />Phản hồi từ Shop
                                                    </div>
                                                    <p className="mb-0" style={{ fontSize: 13, color: '#1a1a2e' }}>{review.admin_reply}</p>
                                                </div>
                                            )}
                                        </div>
                                    ))}

                                    {/* Pagination */}
                                    {reviewLastPage > 1 && (
                                        <div className="d-flex justify-content-center gap-2 mt-2">
                                            {Array.from({ length: reviewLastPage }, (_, i) => i + 1).map(p => (
                                                <button
                                                    key={p}
                                                    className={`btn btn-sm ${reviewPage === p ? 'btn-primary' : 'btn-outline-secondary'}`}
                                                    style={{ borderRadius: 8, width: 36 }}
                                                    onClick={() => setReviewPage(p)}
                                                >
                                                    {p}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    )}
                </div>

                {/* ── Related Products ─────────────────────────────── */}
                {relatedProducts.length > 0 && (
                    <div className="mt-5">
                        <div className="d-flex align-items-center gap-3 mb-4">
                            <div style={{ width: 4, height: 28, background: '#ff7a00', borderRadius: 4 }} />
                            <h4 className="fw-bold mb-0">Sản phẩm liên quan</h4>
                            <Link to="/shop" className="ms-auto text-decoration-none small text-muted">
                                Xem tất cả <i className="fas fa-arrow-right ms-1" />
                            </Link>
                        </div>
                        <div className="product row g-4 align-items-stretch">
                            {relatedProducts.map((p, idx) => (
                                <ProductCard key={p.id} product={p} index={idx} />
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductDetailPage;
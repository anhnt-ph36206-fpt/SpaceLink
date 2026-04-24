import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate, useSearchParams } from "react-router-dom";
import { axiosInstance } from "../api/axios";
import { useCart } from "../context/CartContext";
import { useCompare } from "../context/CompareContext";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";

import ProductCard from "../components/common/ProductCard";
import ProductTechSpecs from "../components/product/ProductTechSpecs";
import type { ProductSpecification } from "../components/product/ProductTechSpecs";
import ProductReviews from "../components/product/ProductReviews";
import type { ReviewStats } from "../components/product/ProductReviews";
import ProductDescription from "../components/product/ProductDescription";
import ProductContent from "../components/product/ProductContent";
import ProductComments from "../components/product/ProductComments";
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
    specifications?: ProductSpecification[];
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
    const [searchParams] = useSearchParams();
    const variantIdFromUrl = searchParams.get('variant');
    const { addToCart } = useCart();
    const { addToCompare, removeFromCompare, isInCompare, compareList } = useCompare();
    const { addToWishlist, removeFromWishlist, isInWishlist } = useWishlist();
    const { isAuthenticated } = useAuth();

    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
    const [selectedAttrs, setSelectedAttrs] = useState<Record<string, number>>({}); // groupName -> attrId
    const [mainImg, setMainImg] = useState<string | null>(null);
    const [defaultMainImg, setDefaultMainImg] = useState<string | null>(null);
    const [qty, setQty] = useState(1);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxIndex, setLightboxIndex] = useState(0);

    // Open lightbox at a given index
    const openLightbox = (index: number) => {
        setLightboxIndex(index);
        setLightboxOpen(true);
    };
    const closeLightbox = () => setLightboxOpen(false);
    const lightboxPrev = () => setLightboxIndex(i => (i - 1 + (product?.images?.length ?? 1)) % (product?.images?.length ?? 1));
    const lightboxNext = () => setLightboxIndex(i => (i + 1) % (product?.images?.length ?? 1));

    // Close on ESC key
    useEffect(() => {
        if (!lightboxOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeLightbox();
            if (e.key === 'ArrowLeft') lightboxPrev();
            if (e.key === 'ArrowRight') lightboxNext();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [lightboxOpen, product?.images?.length]);
    const [relatedProducts, setRelatedProducts] = useState<{ id: string; name: string; image: string; price: number; oldPrice?: number; category?: string; rating?: number; isSale?: boolean; isNew?: boolean }[]>([]);

    // ── Reviews state ──────────────────────────────────────────────────
    const [reviewStats, setReviewStats] = useState<ReviewStats>({ average_rating: 0, total_reviews: 0 });

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
        }).catch(() => { });
    }, [product]);

    // ── Fetch ──────────────────────────────────────────────────────────
    useEffect(() => {
        const fetch = async () => {
            setLoading(true);
            try {
                const res = await axiosInstance.get(`/products/${id}`);
                const p: Product = res.data.data;
                setProduct(p);

                // Fetch review stats immediately to show on the tab before it's clicked
                axiosInstance.get(`/products/${id}/reviews`, { params: { per_page: 1 } })
                    .then(r => {
                        if (r.data?.stats) setReviewStats(r.data.stats);
                    }).catch(() => { });

                // Set default image
                const primary = p.images?.find(i => i.is_primary) || p.images?.[0];
                const defaultUrl = imgUrl(primary);
                setDefaultMainImg(defaultUrl);
                setMainImg(defaultUrl);

                // If variants exist, select the one from URL or the first one
                if (p.variants && p.variants.length > 0) {
                    // Ưu tiên biến thể từ URL query param ?variant=ID
                    let targetVariant = p.variants[0];
                    if (variantIdFromUrl) {
                        const fromUrl = p.variants.find(v => String(v.id) === variantIdFromUrl);
                        if (fromUrl) targetVariant = fromUrl;
                    }
                    setSelectedVariant(targetVariant);
                    // Build selected attrs map
                    const attrsMap: Record<string, number> = {};
                    targetVariant.attributes.forEach(a => {
                        if (a.group) attrsMap[a.group] = a.id;
                    });
                    setSelectedAttrs(attrsMap);
                    const vi = varImgUrl(targetVariant);
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
        if (!isAuthenticated) {
            toast.warning('Vui lòng đăng nhập để đặt hàng!');
            return;
        }

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
            const res = await axiosInstance.get(`/products/${id}`);
            const latestProduct = res.data.data;

            if (!latestProduct.is_active) {
                toast.error('Sản phẩm này hiện không còn kinh doanh.');
                return;
            }

            const latestVariant = latestProduct.variants?.find((v: Variant) => v.id === selectedVariant.id);
            if (!latestVariant) {
                toast.error('Phân loại sản phẩm này không còn tồn tại.');
                return;
            }

            if (latestVariant.quantity < qty) {
                toast.error(`Số lượng tồn kho không đủ (còn ${latestVariant.quantity} sản phẩm)`);
                setProduct(latestProduct);
                return;
            }

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
                            {/* Main image — click để phóng to */}
                            <div
                                className="position-relative w-100 text-center mb-3"
                                style={{ height: 380, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', borderRadius: 12, cursor: mainImg ? 'zoom-in' : 'default' }}
                                onClick={() => {
                                    if (!mainImg) return;
                                    const idx = allImages.findIndex(img => imgUrl(img) === mainImg);
                                    openLightbox(idx >= 0 ? idx : 0);
                                }}
                                title={mainImg ? 'Nhấn để xem ảnh lớn' : ''}
                            >
                                {discountPct > 0 && (
                                    <span
                                        className="position-absolute top-0 start-0 m-3 badge bg-danger rounded-pill"
                                        style={{ fontSize: 14, padding: '6px 12px', zIndex: 1 }}
                                    >
                                        -{discountPct}%
                                    </span>
                                )}
                                {/* Zoom hint icon */}
                                {mainImg && (
                                    <span
                                        className="position-absolute bottom-0 end-0 m-2"
                                        style={{ background: 'rgba(0,0,0,0.45)', borderRadius: 8, padding: '4px 8px', color: '#fff', fontSize: 13, pointerEvents: 'none' }}
                                    >
                                        <i className="fas fa-expand me-1" />Phóng to
                                    </span>
                                )}
                                {mainImg ? (
                                    <img
                                        src={mainImg}
                                        alt={product.name}
                                        style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain', transition: 'transform .2s' }}
                                    />
                                ) : (
                                    <i className="fas fa-box fa-5x text-muted" />
                                )}
                            </div>

                            {/* Thumbnails */}
                            {allImages.length > 1 && (
                                <div className="d-flex gap-2 flex-wrap justify-content-center">
                                    {allImages.map((img, idx) => {
                                        const url = imgUrl(img);
                                        return url ? (
                                            <img
                                                key={img.id}
                                                src={url}
                                                alt=""
                                                onClick={() => setMainImg(url)}
                                                title="Xem ảnh này"
                                                style={{
                                                    width: 64, height: 64, objectFit: 'cover', borderRadius: 8,
                                                    cursor: 'pointer',
                                                    border: mainImg === url ? '2px solid #0d6efd' : '2px solid #dee2e6',
                                                    transition: 'border .2s, transform .15s',
                                                    transform: mainImg === url ? 'scale(1.06)' : 'scale(1)',
                                                }}
                                            />
                                        ) : null;
                                    })}
                                </div>
                            )}

                            {/* ── Lightbox Modal ── */}
                            {lightboxOpen && allImages.length > 0 && (() => {
                                const lb = allImages[lightboxIndex];
                                const lbUrl = imgUrl(lb) || mainImg;
                                return (
                                    <div
                                        onClick={closeLightbox}
                                        style={{
                                            position: 'fixed', inset: 0, zIndex: 9999,
                                            background: 'rgba(0,0,0,0.88)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            animation: 'lbFadeIn .2s ease',
                                        }}
                                    >
                                        <style>{`
                                            @keyframes lbFadeIn { from { opacity: 0 } to { opacity: 1 } }
                                            .lb-img { max-height: 88vh; max-width: 88vw; object-fit: contain; border-radius: 12px; box-shadow: 0 8px 48px rgba(0,0,0,.6); animation: lbFadeIn .25s ease; }
                                            .lb-btn { position: fixed; top: 50%; transform: translateY(-50%); background: rgba(255,255,255,0.15); border: none; color: #fff; font-size: 24px; padding: 14px 18px; border-radius: 50%; cursor: pointer; transition: background .2s; z-index: 10000; }
                                            .lb-btn:hover { background: rgba(255,255,255,0.3); }
                                            .lb-close { position: fixed; top: 18px; right: 24px; background: rgba(255,255,255,0.15); border: none; color: #fff; font-size: 20px; padding: 8px 14px; border-radius: 50%; cursor: pointer; transition: background .2s; z-index: 10000; }
                                            .lb-close:hover { background: rgba(255,255,255,0.3); }
                                            .lb-counter { position: fixed; bottom: 24px; left: 50%; transform: translateX(-50%); color: rgba(255,255,255,0.7); font-size: 14px; z-index: 10000; }
                                        `}</style>

                                        {/* Close */}
                                        <button className="lb-close" onClick={closeLightbox} title="Đóng (ESC)">
                                            <i className="fas fa-times" />
                                        </button>

                                        {/* Prev */}
                                        {allImages.length > 1 && (
                                            <button className="lb-btn" style={{ left: 16 }}
                                                onClick={e => { e.stopPropagation(); lightboxPrev(); }}>
                                                <i className="fas fa-chevron-left" />
                                            </button>
                                        )}

                                        {/* Image */}
                                        <img
                                            key={lbUrl}
                                            src={lbUrl || ''}
                                            alt={product.name}
                                            className="lb-img"
                                            onClick={e => e.stopPropagation()}
                                        />

                                        {/* Next */}
                                        {allImages.length > 1 && (
                                            <button className="lb-btn" style={{ right: 16 }}
                                                onClick={e => { e.stopPropagation(); lightboxNext(); }}>
                                                <i className="fas fa-chevron-right" />
                                            </button>
                                        )}

                                        {/* Counter */}
                                        {allImages.length > 1 && (
                                            <div className="lb-counter">{lightboxIndex + 1} / {allImages.length}</div>
                                        )}
                                    </div>
                                );
                            })()}
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
                            <div className="bg-light rounded-3 p-3 mb-4 d-flex align-items-center flex-wrap gap-2 gap-md-3">
                                <span className="fw-bold" style={{ fontSize: 'clamp(24px, 5vw, 30px)', color: '#e00429' }}>
                                    {formatVND(displayPrice)}
                                </span>
                                {discountPct > 0 && (
                                    <>
                                        <del className="text-muted" style={{ fontSize: 'clamp(14px, 3vw, 16px)' }}>
                                            {formatVND(originalPrice)}
                                        </del>
                                        <span className="badge rounded-pill" style={{ backgroundColor: '#e00429', fontSize: '13px', padding: '6px 10px' }}>
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
                                                        border: isSelected ? '3px solid #e00429' : '2px solid #dee2e6',
                                                        cursor: isAvailable ? 'pointer' : 'not-allowed',
                                                        opacity: isAvailable ? 1 : 0.35,
                                                        transition: 'all .2s',
                                                        transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                                                        boxShadow: isSelected ? '0 0 10px rgba(224,4,41,0.3)' : 'none'
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
                                                        borderColor: isSelected ? '#e00429' : '#dee2e6',
                                                        backgroundColor: isSelected ? '#fffcf8' : 'transparent',
                                                        color: isSelected ? '#e00429' : '#6c757d',
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

                            <div className="pt-4 border-top mt-4">
                                <div className="d-flex align-items-center gap-3 mb-3">
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
                                        className="btn btn-lg flex-grow-1 shop-btn-outline-red bg-white"
                                        style={{
                                            borderRadius: 12,
                                            fontWeight: 600,
                                            height: 48,
                                            border: '2px solid #e00429',
                                            color: '#e00429',
                                            transition: 'all .3s ease'
                                        }}
                                        disabled={stock === 0}
                                        onClick={() => handleAddToCart(false)}
                                    >
                                        <i className="fas fa-cart-plus me-2" />Giỏ hàng
                                    </button>
                                </div>

                                <button
                                    className="btn btn-lg shop-btn-red w-100"
                                    style={{
                                        borderRadius: 12,
                                        fontWeight: 700,
                                        height: 48,
                                        background: '#e00429',
                                        borderColor: '#e00429',
                                        color: '#fff',
                                        transition: 'all .3s ease',
                                        boxShadow: '0 4px 15px rgba(224,4,41,0.2)'
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
                                                categoryId: product.category?.id,
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

                {/* ── Content Sections (Vertical Layout) ─────────────── */}
                <div className="card border-0 shadow-sm p-4 p-md-5" style={{ borderRadius: 16 }}>

                    {/* 1. Mô tả */}
                    <div className="mb-5 pb-4 border-bottom">
                        <div className="d-flex align-items-center gap-2 mb-4">
                            <div style={{ width: 4, height: 24, background: '#e00429', borderRadius: 4 }} />
                            <h3 className="fw-bold mb-0 h4">Mô tả sản phẩm</h3>
                        </div>
                        <ProductDescription description={product.description} />
                    </div>

                    {/* 2. Nội dung chi tiết */}
                    <div className="mb-5 pb-4 border-bottom">
                        <div className="d-flex align-items-center gap-2 mb-4">
                            <div style={{ width: 4, height: 24, background: '#e00429', borderRadius: 4 }} />
                            <h3 className="fw-bold mb-0 h4">Nội dung chi tiết</h3>
                        </div>
                        <ProductContent content={product.content} />
                    </div>

                    {/* 3. Thông số kỹ thuật */}
                    <div className="mb-5 pb-4 border-bottom">
                        <div className="d-flex align-items-center gap-2 mb-4">
                            <div style={{ width: 4, height: 24, background: '#e00429', borderRadius: 4 }} />
                            <h3 className="fw-bold mb-0 h4">Thông số kỹ thuật</h3>
                        </div>
                        <ProductTechSpecs specifications={product.specifications} />
                    </div>

                    {/* 4. Đánh giá */}
                    <div className="mb-5 pb-4 border-bottom">
                        <div className="d-flex align-items-center gap-2 mb-4">
                            <div style={{ width: 4, height: 24, background: '#e00429', borderRadius: 4 }} />
                            <h3 className="fw-bold mb-0 h4">Đánh giá sản phẩm ({reviewStats.total_reviews})</h3>
                        </div>
                        <ProductReviews
                            productId={id!}
                            onStatsChange={setReviewStats}
                        />
                    </div>

                    {/* 5. Hỏi đáp */}
                    <div>
                        <div className="d-flex align-items-center gap-2 mb-4">
                            <div style={{ width: 4, height: 24, background: '#e00429', borderRadius: 4 }} />
                            <h3 className="fw-bold mb-0 h4">Hỏi & Đáp</h3>
                        </div>
                        <ProductComments productId={id!} />
                    </div>

                </div>

                {/* ── Related Products ─────────────────────────────── */}
                {relatedProducts.length > 0 && (
                    <div className="mt-5">
                        <div className="d-flex align-items-center gap-3 mb-4">
                            <div style={{ width: 4, height: 28, background: '#e00429', borderRadius: 4 }} />
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
import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { axiosInstance } from "../api/axios";
import { useCart } from "../context/CartContext";
import { toast } from "react-toastify";
import { Spin } from "antd";

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

    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
    const [selectedAttrs, setSelectedAttrs] = useState<Record<string, number>>({}); // groupName -> attrId
    const [mainImg, setMainImg] = useState<string | null>(null);
    const [qty, setQty] = useState(1);
    const [activeTab, setActiveTab] = useState<'desc' | 'content' | 'specs'>('desc');

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
                setMainImg(imgUrl(primary));

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
                    if (varImgUrl(firstVariant)) setMainImg(varImgUrl(firstVariant));
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
        const newSelected = { ...selectedAttrs, [group]: attrId };
        setSelectedAttrs(newSelected);

        // Find best matching variant
        const selectedIds = Object.values(newSelected);
        const match = product?.variants?.find(v =>
            selectedIds.every(sid => v.attributes.some(a => a.id === sid))
        );

        if (match) {
            setSelectedVariant(match);
            setQty(1);
            const vi = varImgUrl(match);
            if (vi) setMainImg(vi);
        }
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

    const stock = selectedVariant?.quantity ?? product?.quantity ?? 0;
    const maxQty = Math.max(1, stock);

    // ── Add to cart ────────────────────────────────────────────────────
    const handleAddToCart = (goToCart = false) => {
        if (!product || stock === 0) return;

        if (!selectedVariant) {
            toast.warning('Vui lòng chọn các thuộc tính sản phẩm!');
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

                            <h1 className="h2 fw-bold mb-1">{product.name}</h1>

                            {product.sku && (
                                <p className="text-muted small mb-3">SKU: {product.sku}</p>
                            )}

                            {/* Price */}
                            <div className="bg-light rounded-3 p-3 mb-4 d-flex align-items-end gap-3">
                                <span className="text-danger fw-bold" style={{ fontSize: 28 }}>
                                    {formatVND(displayPrice)}
                                </span>
                                {discountPct > 0 && (
                                    <>
                                        <del className="text-muted fs-6">{formatVND(originalPrice)}</del>
                                        <span className="badge bg-danger">Tiết kiệm {discountPct}%</span>
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
                                            const isColor = !!attr.color_code;

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
                                                    onClick={() => handleSelectAttr(group, attr.id)}
                                                    style={{
                                                        width: 32, height: 32, borderRadius: '50%',
                                                        background: attr.color_code,
                                                        border: isSelected ? '3px solid #0d6efd' : '2px solid #dee2e6',
                                                        cursor: isAvailable ? 'pointer' : 'not-allowed',
                                                        opacity: isAvailable ? 1 : 0.35,
                                                        transition: 'transform .15s',
                                                        transform: isSelected ? 'scale(1.2)' : 'scale(1)',
                                                    }}
                                                />
                                            ) : (
                                                <button
                                                    key={attr.id}
                                                    className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline-secondary'}`}
                                                    style={{
                                                        borderRadius: 8, fontWeight: isSelected ? 700 : 400,
                                                        opacity: isAvailable ? 1 : 0.4,
                                                        cursor: isAvailable ? 'pointer' : 'not-allowed',
                                                    }}
                                                    onClick={() => isAvailable && handleSelectAttr(group, attr.id)}
                                                >
                                                    {attr.value}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            ))}

                            {/* Stock */}
                            <p className={`small mb-3 ${stock > 0 ? 'text-success' : 'text-danger'}`}>
                                {stock > 0 ? (
                                    <><i className="fas fa-check-circle me-1" />Còn {stock} sản phẩm</>
                                ) : (
                                    <><i className="fas fa-times-circle me-1" />Hết hàng</>
                                )}
                            </p>

                            {/* Qty + CTA */}
                            <div className="d-flex align-items-center gap-3 pt-3 border-top flex-wrap">
                                {/* Qty picker */}
                                <div className="input-group" style={{ width: 130 }}>
                                    <button
                                        className="btn btn-outline-secondary"
                                        onClick={() => setQty(q => Math.max(1, q - 1))}
                                        disabled={qty <= 1}
                                    >-</button>
                                    <input
                                        type="text"
                                        className="form-control text-center bg-white"
                                        value={qty}
                                        onChange={e => {
                                            const v = parseInt(e.target.value) || 1;
                                            setQty(Math.min(maxQty, Math.max(1, v)));
                                        }}
                                    />
                                    <button
                                        className="btn btn-outline-secondary"
                                        onClick={() => setQty(q => Math.min(maxQty, q + 1))}
                                        disabled={qty >= maxQty}
                                    >+</button>
                                </div>

                                <button
                                    className="btn flex-grow-1 btn-outline-primary"
                                    style={{ borderRadius: 10, fontWeight: 600 }}
                                    disabled={stock === 0}
                                    onClick={() => handleAddToCart(false)}
                                >
                                    <i className="fas fa-cart-plus me-2" />Thêm vào giỏ hàng
                                </button>

                                <button
                                    className="btn btn-primary"
                                    style={{ borderRadius: 10, fontWeight: 700, padding: '10px 24px' }}
                                    disabled={stock === 0 || isChecking}
                                    onClick={handleBuyNow}
                                >
                                    {isChecking ? <Spin size="small" className="me-2" /> : 'Mua Ngay →'}
                                </button>
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
                    </ul>

                    {activeTab === 'desc' && (
                        <div className="lh-lg text-muted" style={{ whiteSpace: 'pre-wrap' }}>
                            {product.description || 'Chưa có mô tả.'}
                        </div>
                    )}
                    {activeTab === 'content' && (
                        <div
                            className="lh-lg"
                            dangerouslySetInnerHTML={{ __html: product.content || '<p>Chưa có nội dung chi tiết.</p>' }}
                        />
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
                </div>
            </div>
        </div>
    );
};

export default ProductDetailPage;
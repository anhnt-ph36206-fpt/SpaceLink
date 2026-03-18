import React, { useState, useEffect, useMemo } from 'react';
import { Modal, Divider, Typography } from 'antd';
import { toast } from 'react-toastify';

const { Title } = Typography;

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

interface Product {
    id: number;
    name: string;
    price: number;
    sale_price?: number | null;
    image: string;
    images?: { id: number; image_path: string; image_url?: string; is_primary: boolean }[];
    variants: Variant[];
}

interface VariantSelectorModalProps {
    visible: boolean;
    product: Product | null;
    onCancel: () => void;
    onAddToCart: (variantId: number, quantity: number) => void;
}

const VariantSelectorModal: React.FC<VariantSelectorModalProps> = ({
    visible,
    product,
    onCancel,
    onAddToCart
}) => {
    const [selectedAttrs, setSelectedAttrs] = useState<Record<string, number>>({});
    const [qty, setQty] = useState(1);

    // Group attributes by group name
    const attrGroups = useMemo(() => {
        if (!product?.variants?.length) return [];
        const groupMap = new Map<string, AttrInfo[]>();
        product.variants?.forEach(v => {
            v.attributes?.forEach(a => {
                if (!a.group) return;
                if (!groupMap.has(a.group)) groupMap.set(a.group, []);
                const existing = groupMap.get(a.group)!;
                if (!existing.find(e => e.id === a.id)) existing.push(a);
            });
        });
        return Array.from(groupMap.entries()).map(([group, attrs]) => ({ group, attrs }));
    }, [product]);

    // Initialize selections when product changes
    useEffect(() => {
        if (product && product.variants?.length > 0) {
            const firstVariant = product.variants[0];
            const initial: Record<string, number> = {};
            firstVariant.attributes?.forEach(a => {
                if (a.group) initial[a.group] = a.id;
            });
            setSelectedAttrs(initial);
            setQty(1);
        }
    }, [product]);

    // Find current selected variant
    const selectedVariant = useMemo(() => {
        if (!product) return null;
        const selectedIds = Object.values(selectedAttrs);
        if (selectedIds.length === 0 && attrGroups.length > 0) return null;

        return product.variants?.find(v =>
            selectedIds.every(sid => v.attributes?.some(a => a.id === sid))
        ) || null;
    }, [product, selectedAttrs, attrGroups]);

    // Check if everything is selected
    const allSelected = useMemo(() => {
        const groups = attrGroups || [];
        if (groups.length === 0) return true;
        return groups.every(g => !!selectedAttrs[g.group]);
    }, [attrGroups, selectedAttrs]);

    const formatVND = (v: any) => {
        try {
            if (v === null || v === undefined) return '0 ₫';
            const value = typeof v === 'number' ? v : parseFloat(String(v));
            return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(isNaN(value) ? 0 : value);
        } catch (e) {
            return '0 ₫';
        }
    };

    const resolveUrl = (path: string | null | undefined) => {
        if (!path) return '';
        if (typeof path !== 'string') return '';
        if (path.startsWith('http')) return path;
        return `http://localhost:8000/storage/${path}`;
    };

    const productImage = useMemo(() => {
        if (!product) return '';
        if (product.image) return resolveUrl(product.image);
        const images = product.images || [];
        const primary = images.find((i: any) => i.is_primary) || images[0];
        return resolveUrl(primary?.image_url || primary?.image_path);
    }, [product]);

    const variantImg = useMemo(() => {
        if (!selectedVariant?.image) return null;
        return resolveUrl(selectedVariant.image);
    }, [selectedVariant]);

    const handleAdd = () => {
        if (!allSelected || !selectedVariant) {
            toast.warning('Vui lòng chọn đầy đủ các tùy chọn sản phẩm!');
            return;
        }
        const stockCount = selectedVariant.quantity ?? 0;
        if (stockCount <= 0) {
            toast.error('Sản phẩm này hiện đang hết hàng!');
            return;
        }
        onAddToCart(selectedVariant.id, qty);
        onCancel();
    };

    if (!product) return null;

    // Safety calculations
    const getSafePrice = (p: any) => {
        if (!p) return 0;
        const price = p.price ? parseFloat(String(p.price)) : 0;
        const salePrice = p.sale_price ? parseFloat(String(p.sale_price)) : null;

        if (salePrice !== null && salePrice < price) {
            return salePrice;
        }
        return price;
    };

    const displayPrice = selectedVariant ? getSafePrice(selectedVariant) : getSafePrice(product);
    const originalPrice = selectedVariant?.price ? parseFloat(String(selectedVariant.price)) : (product?.price ? parseFloat(String(product.price)) : 0);
    const discountPct = (originalPrice > displayPrice && originalPrice > 0)
        ? Math.round(((originalPrice - displayPrice) / originalPrice) * 100)
        : 0;

    const stock = selectedVariant?.quantity ?? 0;

    return (
        <Modal
            title={<div style={{ paddingBottom: 10, fontWeight: 600 }}>Thông tin sản phẩm</div>}
            open={visible}
            onCancel={onCancel}
            footer={null}
            width={500}
            centered
        >
            <div className="d-flex gap-3 mb-4">
                <div style={{ width: 120, height: 120, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', borderRadius: 12, border: '1px solid #eee', position: 'relative' }}>
                    {discountPct > 0 && (
                        <span className="position-absolute top-0 start-0 m-1 badge bg-danger rounded-pill" style={{ fontSize: 10, zIndex: 1 }}>
                            -{discountPct}%
                        </span>
                    )}
                    <img
                        src={variantImg || productImage || undefined}
                        alt={product.name}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                </div>
                <div className="flex-grow-1">
                    <Title level={4} style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>{product.name}</Title>
                    <div className="mt-2 d-flex align-items-center gap-2">
                        <span className="text-danger fw-bold fs-4">{formatVND(displayPrice)}</span>
                        {discountPct > 0 && (
                            <del className="text-muted small">{formatVND(originalPrice)}</del>
                        )}
                    </div>
                    <div className={`small mt-1 ${stock > 0 ? 'text-success' : 'text-danger'}`}>
                        {stock > 0 ? (
                            <><i className="fas fa-check-circle me-1" />Còn {stock} sản phẩm</>
                        ) : (
                            <><i className="fas fa-times-circle me-1" />Hết hàng</>
                        )}
                    </div>
                </div>
            </div>

            <Divider style={{ margin: '16px 0' }} />

            {attrGroups.map(({ group, attrs }) => (
                <div key={group} className="mb-4">
                    <label className="fw-semibold mb-2 d-block text-uppercase small text-muted">{group}</label>
                    <div className="d-flex flex-wrap gap-2">
                        {attrs.map(attr => {
                            const isSelected = selectedAttrs[group] === attr.id;
                            const isColorGroup = /color|mau|màu|colour/i.test(group);
                            const isColor = !!attr.color_code && isColorGroup;

                            // Check availability based on other selections (simplified for modal)
                            const isAvailable = product.variants?.some(v =>
                                v.attributes.some(a => a.id === attr.id) && v.quantity > 0
                            );

                            return isColor ? (
                                <button
                                    key={attr.id}
                                    title={attr.value}
                                    onClick={() => isAvailable && setSelectedAttrs(prev => ({ ...prev, [group]: attr.id }))}
                                    style={{
                                        width: 32, height: 32, borderRadius: '50%',
                                        background: attr.color_code,
                                        border: isSelected ? '3px solid #F28B00' : '2px solid #dee2e6',
                                        cursor: isAvailable ? 'pointer' : 'not-allowed',
                                        opacity: isAvailable ? 1 : 0.35,
                                        transition: 'all .2s',
                                        transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                                        boxShadow: isSelected ? '0 0 8px rgba(242, 139, 0, 0.3)' : 'none'
                                    }}
                                />
                            ) : (
                                <button
                                    key={attr.id}
                                    className="btn btn-sm"
                                    style={{
                                        borderRadius: 8,
                                        padding: '6px 16px',
                                        fontWeight: isSelected ? 700 : 400,
                                        opacity: isAvailable ? 1 : 0.4,
                                        cursor: isAvailable ? 'pointer' : 'not-allowed',
                                        borderWidth: 2,
                                        borderStyle: 'solid',
                                        borderColor: isSelected ? '#ff7a00' : '#dee2e6',
                                        backgroundColor: isSelected ? '#fffcf8' : 'transparent',
                                        color: isSelected ? '#ff7a00' : '#6c757d',
                                        boxShadow: isSelected ? '0 0 0 2px rgba(255,122,0,0.15)' : 'none',
                                        transition: 'all 0.2s'
                                    }}
                                    onClick={() => isAvailable && setSelectedAttrs(prev => ({ ...prev, [group]: attr.id }))}
                                >
                                    {attr.value}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}

            <div className="mt-4 pt-3 border-top d-flex align-items-center gap-3">
                <div className="input-group" style={{ width: 120 }}>
                    <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => setQty(q => Math.max(1, q - 1))}
                        disabled={qty <= 1}
                    >-</button>
                    <input
                        type="text"
                        className="form-control form-control-sm text-center bg-white border-secondary-subtle"
                        value={qty}
                        readOnly
                    />
                    <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => setQty(q => Math.min(stock || 1, q + 1))}
                        disabled={qty >= (stock || 1)}
                    >+</button>
                </div>

                <button
                    className={`btn btn-primary flex-grow-1 d-flex align-items-center justify-content-center gap-2`}
                    style={{ height: 42, borderRadius: 10, fontWeight: 600 }}
                    disabled={!allSelected || stock <= 0}
                    onClick={handleAdd}
                >
                    <i className="fas fa-cart-plus" />
                    {stock <= 0 ? 'Hết hàng' : (allSelected ? 'Thêm vào giỏ' : 'Chọn thuộc tính')}
                </button>
            </div>
        </Modal>
    );
};

export default VariantSelectorModal;

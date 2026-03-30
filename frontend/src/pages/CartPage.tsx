import React, { useState, useMemo, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart, type CartItem } from '../context/CartContext';
import { axiosInstance } from '../api/axios';
import { Modal, Button, Spin, Tag, Tooltip, Divider, Typography, Checkbox, Popconfirm, Alert } from 'antd';
import { ShoppingOutlined, CloseOutlined, InfoCircleOutlined, SwapOutlined, MinusOutlined, PlusOutlined, CheckCircleOutlined, ExclamationCircleOutlined, DeleteOutlined, ShoppingCartOutlined, WarningOutlined } from '@ant-design/icons';

const { Title } = Typography;

const formatVND = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

const imgUrl = (path?: string) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    return `http://localhost:8000/storage/${path}`;
};

const CartPage: React.FC = () => {
    const { items, removeFromCart, updateQty, loading, updatingItems } = useCart();
    const navigate = useNavigate();

    // Chỉ dùng để hiển thị banner thông báo (không block)
    const [pendingOrderId, setPendingOrderId] = useState<string | null>(
        () => sessionStorage.getItem('vnpay_pending_order_id')
    );

    // Auto-validate: kiểm tra server xem pendingOrderId còn thực sự pending/unpaid không
    useEffect(() => {
        if (!pendingOrderId) return;
        let cancelled = false;
        axiosInstance.get(`/client/orders/${pendingOrderId}`)
            .then(res => {
                if (cancelled) return;
                const order = res.data?.data ?? res.data;
                const stillPending = order &&
                    order.status === 'pending' &&
                    order.payment_status === 'unpaid' &&
                    order.payment_method === 'vnpay';
                if (!stillPending) {
                    sessionStorage.removeItem('vnpay_pending_order_id');
                    setPendingOrderId(null);
                }
            })
            .catch(() => {
                if (cancelled) return;
                sessionStorage.removeItem('vnpay_pending_order_id');
                setPendingOrderId(null);
            });
        return () => { cancelled = true; };
    }, [pendingOrderId]);

    // -- Checkbox State --
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    useEffect(() => {
        setSelectedIds(prev => {
            const existingIds = new Set(items.map(i => i.id));
            const next = new Set<number>();
            prev.forEach(id => { if (existingIds.has(id)) next.add(id); });
            return next;
        });
    }, [items]);

    useEffect(() => {
        if (items.length > 0 && selectedIds.size === 0) {
            setSelectedIds(new Set(items.map(i => i.id)));
        }
    }, [items]);

    const isAllSelected = items.length > 0 && selectedIds.size === items.length;
    const isIndeterminate = selectedIds.size > 0 && selectedIds.size < items.length;

    const toggleAll = () => {
        if (isAllSelected) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(items.map(i => i.id)));
        }
    };

    const toggleItem = (id: number) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const selectedItems = useMemo(() => items.filter(i => selectedIds.has(i.id)), [items, selectedIds]);
    const selectedTotalPrice = useMemo(() => selectedItems.reduce((s, i) => s + i.lineTotal, 0), [selectedItems]);
    const selectedTotalQty = useMemo(() => selectedItems.reduce((s, i) => s + i.quantity, 0), [selectedItems]);

    // -- State for Variant Switching --
    const [editingItem, setEditingItem] = useState<CartItem | null>(null);
    const [selectedAttrs, setSelectedAttrs] = useState<Record<string, number>>({});
    const [isUpdating, setIsUpdating] = useState(false);

    const handleDeleteSelected = async () => {
        for (const id of selectedIds) {
            await removeFromCart(id);
        }
    };

    const attrGroups = useMemo(() => {
        if (!editingItem?.availableVariants) return [];
        const groupMap = new Map<string, any[]>();
        editingItem.availableVariants.forEach(v => {
            v.attributes.forEach((a: any) => {
                if (!groupMap.has(a.group)) groupMap.set(a.group, []);
                const list = groupMap.get(a.group)!;
                if (!list.find(item => item.id === a.id)) {
                    list.push(a);
                }
            });
        });
        return Array.from(groupMap.entries()).map(([group, attrs]) => ({ group, attrs }));
    }, [editingItem]);

    const matchingVariant = useMemo(() => {
        if (!editingItem || !editingItem.availableVariants) return null;
        const selectedIds2 = Object.values(selectedAttrs);
        return editingItem.availableVariants.find(v =>
            selectedIds2.every(sid => v.attributes.some((a: any) => a.id === sid)) && v.quantity > 0
        ) || null;
    }, [editingItem, selectedAttrs]);

    const handleOpenEdit = (item: CartItem) => {
        setEditingItem(item);
        if (item.availableVariants) {
            const currentVariant = item.availableVariants.find(v => v.id === item.variantId);
            if (currentVariant) {
                const initial: Record<string, number> = {};
                currentVariant.attributes.forEach((a: any) => {
                    initial[a.group] = a.id;
                });
                setSelectedAttrs(initial);
            }
        }
    };

    const handleUpdateVariant = async () => {
        if (!editingItem || !matchingVariant) return;
        setIsUpdating(true);
        try {
            await updateQty(editingItem.id, editingItem.quantity, matchingVariant.id);
            setEditingItem(null);
        } finally {
            setIsUpdating(false);
        }
    };

    const handleCheckout = () => {
        if (selectedItems.length === 0) return;
        navigate('/checkout', {
            state: {
                selectedCartItemIds: Array.from(selectedIds),
            }
        });
    };

    if (loading && items.length === 0) {
        return (
            <div className="container py-5 text-center">
                <Spin size="large" />
                <p className="mt-3 text-muted">Đang tải giỏ hàng...</p>
            </div>
        );
    }

    if (items.length === 0) {
        return (
            <div className="container py-5 text-center">
                <div className="mb-4">
                    <ShoppingOutlined style={{ fontSize: 64, color: '#ccc' }} />
                </div>
                <h3>Giỏ hàng của bạn đang trống</h3>
                <p className="text-muted">Hãy chọn thêm sản phẩm để tiếp tục mua sắm.</p>
                <Link to="/" className="btn btn-primary px-4 rounded-pill mt-3">
                    Tiếp tục mua sắm
                </Link>
            </div>
        );
    }

    return (
        <div className="container py-4">
            <h1 className="h4 mb-4 fw-bold d-flex align-items-center gap-2">
                <ShoppingOutlined className="text-primary" />
                Giỏ hàng của tôi ({items.length})
            </h1>

            {/* Banner thông báo đơn VNPAY đang chờ (chỉ informational, không block) */}
            {pendingOrderId && (
                <Alert
                    type="info"
                    showIcon
                    icon={<WarningOutlined />}
                    className="mb-4"
                    style={{ borderRadius: 10 }}
                    message={
                        <span style={{ fontWeight: 600 }}>
                            Bạn đang có đơn hàng chờ thanh toán VNPAY
                        </span>
                    }
                    description={
                        <span>
                            Đơn hàng đang chờ thanh toán qua VNPAY.{' '}
                            <Button
                                type="link"
                                style={{ padding: 0, height: 'auto', fontWeight: 600 }}
                                onClick={() => navigate(`/orders/${pendingOrderId}`)}
                            >
                                → Xem đơn hàng
                            </Button>
                        </span>
                    }
                />
            )}

            <div className="row g-4">
                {/* Product List */}
                <div className="col-lg-8">
                    <div className="card border-0 shadow-sm rounded-4 overflow-hidden">
                        {/* Header row */}
                        <div className="px-3 py-2 d-flex align-items-center justify-content-between border-bottom bg-light">
                            <div className="d-flex align-items-center gap-2">
                                <Checkbox
                                    checked={isAllSelected}
                                    indeterminate={isIndeterminate}
                                    onChange={toggleAll}
                                >
                                    <span className="fw-semibold text-dark" style={{ fontSize: 13 }}>
                                        Chọn tất cả ({items.length} sản phẩm)
                                    </span>
                                </Checkbox>
                            </div>
                            {selectedIds.size > 0 && (
                                <Popconfirm
                                    title={`Xóa ${selectedIds.size} sản phẩm đã chọn?`}
                                    description="Thao tác này không thể hoàn tác."
                                    okText="Xóa"
                                    cancelText="Hủy"
                                    okButtonProps={{ danger: true }}
                                    onConfirm={handleDeleteSelected}
                                >
                                    <button className="btn btn-sm btn-outline-danger d-flex align-items-center gap-1" style={{ borderRadius: 8, fontSize: 13 }}>
                                        <DeleteOutlined />
                                        Xóa đã chọn ({selectedIds.size})
                                    </button>
                                </Popconfirm>
                            )}
                        </div>

                        <div className="card-body p-0">
                            {items.map((item, idx) => (
                                <div
                                    key={item.id}
                                    className={`p-3 d-flex gap-3 align-items-center cart-item-row ${selectedIds.has(item.id) ? 'cart-item-selected' : ''} ${idx !== items.length - 1 ? 'border-bottom' : ''}`}
                                >
                                    {/* Checkbox */}
                                    <div style={{ flexShrink: 0 }}>
                                        <Checkbox
                                            checked={selectedIds.has(item.id)}
                                            onChange={() => toggleItem(item.id)}
                                        />
                                    </div>

                                    {/* Image */}
                                    <div
                                        style={{
                                            width: 100, height: 100, flexShrink: 0,
                                            borderRadius: 12, overflow: 'hidden',
                                            background: '#f5f5f5', display: 'flex',
                                            alignItems: 'center', justifyContent: 'center',
                                            border: '1px solid #eee'
                                        }}
                                    >
                                        {item.image ? (
                                            <img src={imgUrl(item.image) || ''} alt={item.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                        ) : (
                                            <i className="fas fa-box text-muted fa-2x" />
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-grow-1 min-w-0">
                                        <Link
                                            to={`/product/${item.productSlug || item.productId}`}
                                            className="fw-semibold text-dark text-decoration-none hover-primary"
                                            style={{ fontSize: 16, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3 }}
                                        >
                                            {item.name}
                                        </Link>

                                        {/* Variant Selector Trigger */}
                                        <div className="mt-2">
                                            <Tooltip title="Nhấn để đổi phân loại">
                                                <div
                                                    className="d-inline-flex align-items-center gap-1 px-2 py-1 rounded bg-light border text-muted small"
                                                    style={{ cursor: 'pointer' }}
                                                    onClick={() => handleOpenEdit(item)}
                                                >
                                                    <span className="text-truncate" style={{ maxWidth: 150 }}>
                                                        Phân loại: {item.attributes || 'Mặc định'}
                                                    </span>
                                                    <SwapOutlined size={10} />
                                                </div>
                                            </Tooltip>
                                        </div>

                                        <div className="mt-2 text-danger fw-bold">{formatVND(item.price)}</div>

                                        {item.stock < item.quantity && (
                                            <div className="mt-1 text-danger small">
                                                <InfoCircleOutlined className="me-1" />
                                                Chỉ còn {item.stock} sản phẩm trong kho
                                            </div>
                                        )}
                                    </div>

                                    {/* Qty */}
                                    <div className="d-flex flex-column align-items-end gap-2" style={{ width: 140 }}>
                                        <div className={`input-group input-group-sm rounded-pill overflow-hidden border ${updatingItems.has(item.id) ? 'opacity-50' : ''}`}>
                                            <button
                                                className="btn btn-light border-0 px-2"
                                                onClick={() => updateQty(item.id, item.quantity - 1)}
                                                disabled={item.quantity <= 1 || updatingItems.has(item.id)}
                                            >
                                                <MinusOutlined />
                                            </button>
                                            <input
                                                type="text"
                                                className="form-control border-0 text-center fw-bold bg-white"
                                                value={item.quantity}
                                                readOnly
                                                style={{ width: 40, pointerEvents: 'none' }}
                                            />
                                            <button
                                                className="btn btn-light border-0 px-2"
                                                onClick={() => updateQty(item.id, item.quantity + 1)}
                                                disabled={item.quantity >= item.stock || updatingItems.has(item.id)}
                                            >
                                                <PlusOutlined />
                                            </button>
                                        </div>
                                        <div className="fw-bold text-primary small d-flex align-items-center gap-1">
                                            {updatingItems.has(item.id) && <Spin size="small" />}
                                            {formatVND(item.price * item.quantity)}
                                        </div>
                                    </div>

                                    {/* Remove */}
                                    <button
                                        className="btn btn-link text-muted p-2"
                                        onClick={() => removeFromCart(item.id)}
                                    >
                                        <CloseOutlined />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Summary */}
                <div className="col-lg-4">
                    <div className="card border-0 shadow-sm rounded-4 position-sticky" style={{ top: 20 }}>
                        <div className="card-body p-4">
                            <h5 className="fw-bold mb-1">Tổng cộng</h5>
                            <p className="text-muted small mb-4">
                                {selectedIds.size > 0
                                    ? `Đã chọn ${selectedIds.size} / ${items.length} sản phẩm`
                                    : 'Chưa chọn sản phẩm nào'}
                            </p>

                            <div className="d-flex justify-content-between mb-2">
                                <span className="text-muted">Tạm tính ({selectedTotalQty} món)</span>
                                <span>{formatVND(selectedTotalPrice)}</span>
                            </div>
                            <div className="d-flex justify-content-between mb-4">
                                <span className="text-muted">Phí vận chuyển</span>
                                <span className="text-success small">Liên hệ sau</span>
                            </div>

                            <Divider style={{ margin: '16px 0' }} />

                            <div className="d-flex justify-content-between mb-4 align-items-center">
                                <span className="fw-bold h5 mb-0">Thành tiền</span>
                                <span className="text-danger fw-bold h4 mb-0">{formatVND(selectedTotalPrice)}</span>
                            </div>

                            <Tooltip title={selectedIds.size === 0 ? 'Vui lòng chọn ít nhất 1 sản phẩm' : ''}>
                                <button
                                    className="btn w-100 py-3 rounded-pill fw-bold btn-primary"
                                    onClick={handleCheckout}
                                    disabled={selectedIds.size === 0}
                                    style={{ fontSize: 16 }}
                                >
                                    <ShoppingCartOutlined className="me-2" />
                                    THANH TOÁN ({selectedIds.size})
                                </button>
                            </Tooltip>

                            <Link to="/products" className="btn btn-link w-100 text-muted mt-2 text-decoration-none small">
                                Tiếp tục mua sắm
                            </Link>
                        </div>
                    </div>
                </div>
            </div>

            {/* Change Variant Modal */}
            <Modal
                title={<div style={{ paddingBottom: 10, fontWeight: 600 }}>Cập nhật phân loại</div>}
                open={!!editingItem}
                onCancel={() => setEditingItem(null)}
                footer={[
                    <Button key="back" style={{ borderRadius: 8 }} onClick={() => setEditingItem(null)}>Hủy bỏ</Button>,
                    <Button
                        key="submit"
                        type="primary"
                        loading={isUpdating}
                        disabled={
                            !matchingVariant ||
                            matchingVariant.id === editingItem?.variantId ||
                            matchingVariant.quantity === 0 ||
                            (editingItem?.quantity ?? 0) > matchingVariant.quantity
                        }
                        onClick={handleUpdateVariant}
                        style={{ borderRadius: 8, fontWeight: 600 }}
                    >
                        Xác nhận thay đổi
                    </Button>,
                ]}
                width={500}
                centered
            >
                {editingItem && (
                    <div className="py-2">
                        <div className="d-flex gap-3 mb-1">
                            <div style={{ width: 100, height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa', borderRadius: 12, border: '1px solid #eee', overflow: 'hidden' }}>
                                <img
                                    src={imgUrl(matchingVariant?.image || editingItem.image) || ''}
                                    alt={editingItem.name}
                                    style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                                />
                            </div>
                            <div className="flex-grow-1">
                                <Title level={5} style={{ margin: 0, fontSize: '1rem', fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                                    {editingItem.name}
                                </Title>
                                <div className="mt-2 d-flex align-items-center gap-2">
                                    <span className="text-danger fw-bold fs-5">{formatVND(matchingVariant?.price || editingItem.price)}</span>
                                    {matchingVariant && matchingVariant.id !== editingItem.variantId && (
                                        <Tag color="blue">Giá mới</Tag>
                                    )}
                                </div>
                                <div className={`small mt-1 ${matchingVariant?.quantity ? (matchingVariant.quantity > 0 ? 'text-success' : 'text-danger') : 'text-muted'}`}>
                                    {matchingVariant ? (
                                        matchingVariant.quantity > 0 ? (
                                            <><CheckCircleOutlined className="me-1" />Còn {matchingVariant.quantity} sản phẩm</>
                                        ) : (
                                            <><ExclamationCircleOutlined className="me-1" />Hết hàng</>
                                        )
                                    ) : (
                                        <><InfoCircleOutlined className="me-1" />Vui lòng chọn phân loại</>
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
                                        const isColor = !!attr.color_code;

                                        const isAvailable = editingItem?.availableVariants?.some(v => {
                                            const hasThisAttr = v.attributes.some((a: any) => a.id === attr.id);
                                            const otherGroupsMatch = Object.entries(selectedAttrs).every(
                                                ([g, sid]) => g === group || v.attributes.some((a: any) => a.id === sid)
                                            );
                                            return hasThisAttr && otherGroupsMatch && v.quantity > 0;
                                        });

                                        return isColor ? (
                                            <Tooltip title={attr.value} key={attr.id}>
                                                <button
                                                    onClick={() => isAvailable && setSelectedAttrs(p => ({ ...p, [group]: attr.id }))}
                                                    style={{
                                                        width: 32, height: 32, borderRadius: 16,
                                                        background: attr.color_code,
                                                        border: isSelected ? '3px solid #0d6efd' : '1px solid #ddd',
                                                        cursor: isAvailable ? 'pointer' : 'not-allowed',
                                                        opacity: isAvailable ? 1 : 0.3,
                                                        transform: isSelected ? 'scale(1.15)' : 'scale(1)',
                                                        transition: 'all 0.2s',
                                                        boxShadow: isSelected ? '0 0 8px rgba(13,110,253,0.3)' : 'none'
                                                    }}
                                                />
                                            </Tooltip>
                                        ) : (
                                            <button
                                                key={attr.id}
                                                className={`btn btn-sm ${isSelected ? 'btn-primary' : 'btn-outline-secondary'}`}
                                                style={{
                                                    borderRadius: 8,
                                                    padding: '6px 16px',
                                                    fontWeight: isSelected ? 600 : 400,
                                                    opacity: isAvailable ? 1 : 0.4,
                                                    cursor: isAvailable ? 'pointer' : 'not-allowed',
                                                    transition: 'all 0.2s'
                                                }}
                                                onClick={() => isAvailable && setSelectedAttrs(p => ({ ...p, [group]: attr.id }))}
                                            >
                                                {attr.value}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Modal>

            <style>{`
                .hover-primary:hover { color: #0d6efd !important; }
                .cursor-pointer { cursor: pointer; }
                .cart-item-row { transition: background 0.2s; }
                .cart-item-selected { background: #f0f6ff; }
                .cart-item-row:hover { background: #fafafa; }
                .cart-item-selected:hover { background: #e8f0fe; }
            `}</style>
        </div>
    );
};

export default CartPage;

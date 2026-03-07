import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';

const formatVND = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

const CartPage: React.FC = () => {
    const { items, removeFromCart, updateQty, totalPrice, totalItems } = useCart();
    const navigate = useNavigate();

    if (items.length === 0) {
        return (
            <div className="container-fluid py-5">
                <div className="container text-center py-5">
                    <i className="fas fa-shopping-cart fa-4x text-muted mb-4" />
                    <h3 className="text-muted mb-3">Giỏ hàng của bạn đang trống</h3>
                    <p className="text-muted mb-4">Hãy thêm sản phẩm vào giỏ hàng để tiếp tục mua sắm.</p>
                    <Link to="/shop" className="btn btn-primary rounded-pill px-5 py-2">
                        <i className="fas fa-arrow-left me-2" />Tiếp tục mua sắm
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid py-5" style={{ background: '#f8f9fa', minHeight: '80vh' }}>
            <div className="container">
                <h2 className="mb-4 fw-bold">
                    <i className="fas fa-shopping-cart me-2 text-primary" />
                    Giỏ hàng ({totalItems} sản phẩm)
                </h2>

                <div className="row g-4">
                    {/* Items */}
                    <div className="col-lg-8">
                        <div className="card border-0 shadow-sm" style={{ borderRadius: 16 }}>
                            <div className="card-body p-0">
                                {items.map((item, index) => (
                                    <div
                                        key={item.id}
                                        className={`d-flex align-items-center gap-3 p-4 ${index < items.length - 1 ? 'border-bottom' : ''}`}
                                    >
                                        {/* Image */}
                                        <div
                                            style={{
                                                width: 90, height: 90, flexShrink: 0,
                                                borderRadius: 10, overflow: 'hidden',
                                                background: '#f5f5f5', display: 'flex',
                                                alignItems: 'center', justifyContent: 'center',
                                            }}
                                        >
                                            {item.image ? (
                                                <img src={item.image} alt={item.name} style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                                            ) : (
                                                <i className="fas fa-box text-muted fa-2x" />
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-grow-1 min-w-0">
                                            <Link
                                                to={`/product/${item.productId}`}
                                                className="fw-semibold text-dark text-decoration-none"
                                                style={{ fontSize: 15, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}
                                            >
                                                {item.name}
                                            </Link>
                                            {item.attributes && (
                                                <div className="text-muted small mt-1">
                                                    <i className="fas fa-tag me-1" />{item.attributes}
                                                </div>
                                            )}
                                            {item.sku && (
                                                <div className="text-muted" style={{ fontSize: 11 }}>SKU: {item.sku}</div>
                                            )}
                                            <div className="fw-bold text-danger mt-1">{formatVND(item.price)}</div>
                                        </div>

                                        {/* Qty */}
                                        <div className="input-group" style={{ width: 120, flexShrink: 0 }}>
                                            <button
                                                className="btn btn-outline-secondary btn-sm"
                                                onClick={() => updateQty(item.id, item.quantity - 1)}
                                            >-</button>
                                            <input
                                                type="text"
                                                className="form-control form-control-sm text-center"
                                                value={item.quantity}
                                                readOnly
                                            />
                                            <button
                                                className="btn btn-outline-secondary btn-sm"
                                                onClick={() => updateQty(item.id, item.quantity + 1)}
                                                disabled={item.quantity >= item.stock}
                                            >+</button>
                                        </div>

                                        {/* Subtotal */}
                                        <div className="fw-bold text-end" style={{ width: 110, flexShrink: 0 }}>
                                            {formatVND(item.price * item.quantity)}
                                        </div>

                                        {/* Remove */}
                                        <button
                                            className="btn btn-sm btn-light text-danger"
                                            style={{ borderRadius: '50%', width: 34, height: 34, padding: 0 }}
                                            onClick={() => removeFromCart(item.id)}
                                            title="Xóa"
                                        >
                                            <i className="fas fa-times" />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="d-flex justify-content-between mt-3">
                            <Link to="/shop" className="btn btn-outline-primary rounded-pill">
                                <i className="fas fa-arrow-left me-2" />Tiếp tục mua sắm
                            </Link>
                        </div>
                    </div>

                    {/* Summary */}
                    <div className="col-lg-4">
                        <div className="card border-0 shadow-sm" style={{ borderRadius: 16, position: 'sticky', top: 20 }}>
                            <div className="card-body p-4">
                                <h5 className="fw-bold mb-4">Tóm tắt đơn hàng</h5>

                                {items.map(item => (
                                    <div key={item.id} className="d-flex justify-content-between mb-2 small">
                                        <span className="text-muted text-truncate me-2" style={{ maxWidth: 170 }}>
                                            {item.name} {item.attributes ? `(${item.attributes})` : ''} ×{item.quantity}
                                        </span>
                                        <span className="fw-semibold">{formatVND(item.price * item.quantity)}</span>
                                    </div>
                                ))}

                                <hr />

                                <div className="d-flex justify-content-between mb-2">
                                    <span>Tạm tính</span>
                                    <span className="fw-semibold">{formatVND(totalPrice)}</span>
                                </div>
                                <div className="d-flex justify-content-between mb-2 text-muted small">
                                    <span>Phí vận chuyển</span>
                                    <span>Tính khi thanh toán</span>
                                </div>

                                <hr />

                                <div className="d-flex justify-content-between mb-4">
                                    <strong>Tổng cộng</strong>
                                    <strong className="text-danger fs-5">{formatVND(totalPrice)}</strong>
                                </div>

                                <button
                                    className="btn btn-primary w-100 rounded-pill py-3 fw-bold"
                                    onClick={() => navigate('/checkout')}
                                >
                                    Tiến hành thanh toán <i className="fas fa-arrow-right ms-2" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CartPage;

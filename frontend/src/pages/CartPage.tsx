import React from 'react';
import { Link } from 'react-router-dom';

const CartPage: React.FC = () => {
    // Sample cart items
    const cartItems = [
        {
            id: '1',
            name: 'Apple iPad Mini G2356',
            image: '/images/product-3.png',
            price: 1050,
            quantity: 2,
        },
        {
            id: '2',
            name: 'Samsung Galaxy Tab',
            image: '/images/product-4.png',
            price: 850,
            quantity: 1,
        },
    ];

    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = 50;
    const total = subtotal + shipping;

    return (
        <div className="container-fluid py-5">
            <div className="container">
                <h2 className="mb-4">Shopping Cart</h2>

                <div className="row g-4">
                    <div className="col-lg-8">
                        <div className="table-responsive">
                            <table className="table">
                                <thead className="table-light">
                                    <tr>
                                        <th>Product</th>
                                        <th>Price</th>
                                        <th>Quantity</th>
                                        <th>Total</th>
                                        <th>Remove</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {cartItems.map((item) => (
                                        <tr key={item.id}>
                                            <td>
                                                <div className="d-flex align-items-center">
                                                    <img
                                                        src={item.image}
                                                        alt={item.name}
                                                        style={{ width: '80px' }}
                                                        className="me-3"
                                                    />
                                                    <span>{item.name}</span>
                                                </div>
                                            </td>
                                            <td>${item.price.toFixed(2)}</td>
                                            <td>
                                                <div className="input-group" style={{ width: '120px' }}>
                                                    <button className="btn btn-sm btn-outline-secondary">-</button>
                                                    <input
                                                        type="text"
                                                        className="form-control text-center"
                                                        value={item.quantity}
                                                        readOnly
                                                    />
                                                    <button className="btn btn-sm btn-outline-secondary">+</button>
                                                </div>
                                            </td>
                                            <td>${(item.price * item.quantity).toFixed(2)}</td>
                                            <td>
                                                <button className="btn btn-sm btn-danger">
                                                    <i className="fas fa-trash"></i>
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="d-flex justify-content-between mt-4">
                            <Link to="/shop" className="btn btn-outline-primary">
                                Continue Shopping
                            </Link>
                            <button className="btn btn-primary">Update Cart</button>
                        </div>
                    </div>

                    <div className="col-lg-4">
                        <div className="border rounded p-4">
                            <h4 className="mb-4">Cart Totals</h4>
                            <div className="d-flex justify-content-between mb-3">
                                <span>Subtotal:</span>
                                <span>${subtotal.toFixed(2)}</span>
                            </div>
                            <div className="d-flex justify-content-between mb-3">
                                <span>Shipping:</span>
                                <span>${shipping.toFixed(2)}</span>
                            </div>
                            <hr />
                            <div className="d-flex justify-content-between mb-4">
                                <strong>Total:</strong>
                                <strong className="text-primary">${total.toFixed(2)}</strong>
                            </div>
                            <Link to="/checkout" className="btn btn-primary w-100 rounded-pill py-3">
                                Proceed to Checkout
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CartPage;

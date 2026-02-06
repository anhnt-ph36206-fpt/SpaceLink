import React from 'react';

const CheckoutPage: React.FC = () => {
    const cartItems = [
        { name: 'Apple iPad Mini G2356', quantity: 2, price: 1050 },
        { name: 'Samsung Galaxy Tab', quantity: 1, price: 850 },
    ];

    const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const shipping = 50;
    const total = subtotal + shipping;

    return (
        <div className="container-fluid py-5">
            <div className="container">
                <h2 className="mb-4">Checkout</h2>

                <div className="row g-4">
                    <div className="col-lg-7">
                        <div className="border rounded p-4">
                            <h4 className="mb-4">Billing Details</h4>
                            <form>
                                <div className="row g-3">
                                    <div className="col-md-6">
                                        <label className="form-label">First Name *</label>
                                        <input type="text" className="form-control" required />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Last Name *</label>
                                        <input type="text" className="form-control" required />
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label">Company Name (Optional)</label>
                                        <input type="text" className="form-control" />
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label">Country *</label>
                                        <select className="form-select" required>
                                            <option value="">Select a country</option>
                                            <option value="usa">United States</option>
                                            <option value="uk">United Kingdom</option>
                                            <option value="vn">Vietnam</option>
                                        </select>
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label">Street Address *</label>
                                        <input
                                            type="text"
                                            className="form-control mb-3"
                                            placeholder="House number and street name"
                                            required
                                        />
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Apartment, suite, unit, etc. (optional)"
                                        />
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label">Town / City *</label>
                                        <input type="text" className="form-control" required />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">State *</label>
                                        <input type="text" className="form-control" required />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">ZIP Code *</label>
                                        <input type="text" className="form-control" required />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Phone *</label>
                                        <input type="tel" className="form-control" required />
                                    </div>
                                    <div className="col-md-6">
                                        <label className="form-label">Email *</label>
                                        <input type="email" className="form-control" required />
                                    </div>
                                    <div className="col-12">
                                        <label className="form-label">Order Notes (Optional)</label>
                                        <textarea className="form-control" rows={4}></textarea>
                                    </div>
                                </div>
                            </form>
                        </div>
                    </div>

                    <div className="col-lg-5">
                        <div className="border rounded p-4 mb-4">
                            <h4 className="mb-4">Your Order</h4>
                            <div className="table-responsive">
                                <table className="table">
                                    <thead>
                                        <tr>
                                            <th>Product</th>
                                            <th className="text-end">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {cartItems.map((item, index) => (
                                            <tr key={index}>
                                                <td>{item.name} × {item.quantity}</td>
                                                <td className="text-end">${(item.price * item.quantity).toFixed(2)}</td>
                                            </tr>
                                        ))}
                                        <tr>
                                            <td><strong>Subtotal</strong></td>
                                            <td className="text-end">${subtotal.toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Shipping</strong></td>
                                            <td className="text-end">${shipping.toFixed(2)}</td>
                                        </tr>
                                        <tr>
                                            <td><strong>Total</strong></td>
                                            <td className="text-end text-primary">
                                                <strong>${total.toFixed(2)}</strong>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div className="border rounded p-4">
                            <h5 className="mb-3">Payment Method</h5>
                            <div className="form-check mb-3">
                                <input
                                    className="form-check-input"
                                    type="radio"
                                    name="payment"
                                    id="bank"
                                    defaultChecked
                                />
                                <label className="form-check-label" htmlFor="bank">
                                    Direct Bank Transfer
                                </label>
                            </div>
                            <div className="form-check mb-3">
                                <input className="form-check-input" type="radio" name="payment" id="paypal" />
                                <label className="form-check-label" htmlFor="paypal">
                                    PayPal
                                </label>
                            </div>
                            <div className="form-check mb-4">
                                <input className="form-check-input" type="radio" name="payment" id="cash" />
                                <label className="form-check-label" htmlFor="cash">
                                    Cash on Delivery
                                </label>
                            </div>
                            <button className="btn btn-primary w-100 rounded-pill py-3">
                                Place Order
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CheckoutPage;

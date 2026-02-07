import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import ProductCard from '../components/common/ProductCard';
import { Product } from '../types';

const ProductDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState('description');

    // Sample product data
    const product: Product = {
        id: id || '1',
        name: 'Apple iPad Mini G2356',
        category: 'SmartPhone',
        image: '/assets/client/img/product-3.png',
        price: 1050,
        oldPrice: 1250,
        rating: 4,
        isNew: true,
        description: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.',
    };

    const relatedProducts: Product[] = Array.from({ length: 4 }, (_, i) => ({
        id: `${i + 10}`,
        name: 'Apple iPad Mini G2356',
        category: 'SmartPhone',
        image: `/assets/client/img/product-${(i % 8) + 3}.png`,
        price: 1050,
        oldPrice: 1250,
        rating: 4,
    }));

    return (
        <div className="container-fluid py-5">
            <div className="container">
                {/* Product Details */}
                <div className="row g-4 mb-5">
                    <div className="col-lg-6">
                        <img src={product.image} className="img-fluid rounded" alt={product.name} />
                    </div>
                    <div className="col-lg-6">
                        <h3 className="mb-3">{product.name}</h3>
                        <div className="d-flex mb-3">
                            {[...Array(5)].map((_, i) => (
                                <i
                                    key={i}
                                    className={`fas fa-star ${i < product.rating ? 'text-primary' : ''}`}
                                ></i>
                            ))}
                            <span className="ms-2">(24 Reviews)</span>
                        </div>
                        <div className="mb-3">
                            {product.oldPrice && (
                                <del className="me-2 fs-4 text-muted">${product.oldPrice.toFixed(2)}</del>
                            )}
                            <span className="text-primary fs-3 fw-bold">${product.price.toFixed(2)}</span>
                        </div>
                        <p className="mb-4">{product.description}</p>

                        <div className="d-flex align-items-center mb-4">
                            <label className="me-3">Quantity:</label>
                            <div className="input-group" style={{ width: '150px' }}>
                                <button
                                    className="btn btn-outline-secondary"
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                >
                                    -
                                </button>
                                <input
                                    type="text"
                                    className="form-control text-center"
                                    value={quantity}
                                    readOnly
                                />
                                <button
                                    className="btn btn-outline-secondary"
                                    onClick={() => setQuantity(quantity + 1)}
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        <div className="d-flex gap-2 mb-4">
                            <button className="btn btn-primary rounded-pill py-3 px-5">
                                <i className="fas fa-shopping-cart me-2"></i>Add To Cart
                            </button>
                            <button className="btn btn-outline-primary rounded-pill py-3 px-4">
                                <i className="fas fa-heart"></i>
                            </button>
                        </div>

                        <div>
                            <p><strong>Category:</strong> {product.category}</p>
                            <p><strong>Availability:</strong> In Stock</p>
                        </div>
                    </div>
                </div>

                {/* Product Tabs */}
                <div className="row mb-5">
                    <div className="col-12">
                        <ul className="nav nav-tabs">
                            <li className="nav-item">
                                <a
                                    className={`nav-link ${activeTab === 'description' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('description')}
                                    href="#"
                                >
                                    Description
                                </a>
                            </li>
                            <li className="nav-item">
                                <a
                                    className={`nav-link ${activeTab === 'additional' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('additional')}
                                    href="#"
                                >
                                    Additional Information
                                </a>
                            </li>
                            <li className="nav-item">
                                <a
                                    className={`nav-link ${activeTab === 'reviews' ? 'active' : ''}`}
                                    onClick={() => setActiveTab('reviews')}
                                    href="#"
                                >
                                    Reviews (24)
                                </a>
                            </li>
                        </ul>
                        <div className="tab-content border border-top-0 p-4">
                            {activeTab === 'description' && (
                                <div>
                                    <p>{product.description}</p>
                                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.</p>
                                </div>
                            )}
                            {activeTab === 'additional' && (
                                <div>
                                    <table className="table">
                                        <tbody>
                                            <tr>
                                                <td><strong>Weight</strong></td>
                                                <td>1.2 kg</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Dimensions</strong></td>
                                                <td>20 × 15 × 5 cm</td>
                                            </tr>
                                            <tr>
                                                <td><strong>Color</strong></td>
                                                <td>Black, White, Silver</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            {activeTab === 'reviews' && (
                                <div>
                                    <p>Customer reviews will be displayed here.</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Related Products */}
                <div className="row">
                    <div className="col-12 mb-4">
                        <h3>Related Products</h3>
                    </div>
                    {relatedProducts.map((relProduct) => (
                        <ProductCard key={relProduct.id} product={relProduct} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ProductDetailPage;

import React from 'react';
import ProductCard from '../components/common/ProductCard';
import type {Product} from '../types';

const ShopPage: React.FC = () => {
    // Sample products
    const products: Product[] = Array.from({ length: 12 }, (_, i) => ({
        id: `${i + 1}`,
        name: 'Apple iPad Mini G2356',
        category: 'SmartPhone',
        image: `/assets/client/img/product-${(i % 8) + 3}.png`,
        price: 1050,
        oldPrice: 1250,
        rating: 4,
        isNew: i % 3 === 0,
        isSale: i % 4 === 0,
    }));

    return (
        <div className="container-fluid py-5">
            <div className="container">
                <div className="row g-4">
                    {/* Sidebar Filter */}
                    <div className="col-lg-3">
                        <div className="border rounded p-4">
                            <h5 className="mb-4">Categories</h5>
                            <div className="mb-3">
                                <a href="#" className="d-block mb-2">Accessories (3)</a>
                                <a href="#" className="d-block mb-2">Electronics & Computer (5)</a>
                                <a href="#" className="d-block mb-2">Laptops & Desktops (2)</a>
                                <a href="#" className="d-block mb-2">Mobiles & Tablets (8)</a>
                                <a href="#" className="d-block mb-2">SmartPhone & Smart TV (5)</a>
                            </div>

                            <h5 className="mt-4 mb-4">Price Range</h5>
                            <div className="mb-3">
                                <input type="range" className="form-range" min="0" max="2000" />
                                <div className="d-flex justify-content-between">
                                    <span>$0</span>
                                    <span>$2000</span>
                                </div>
                            </div>

                            <h5 className="mt-4 mb-4">Brands</h5>
                            <div className="form-check mb-2">
                                <input className="form-check-input" type="checkbox" id="brand1" />
                                <label className="form-check-label" htmlFor="brand1">Apple</label>
                            </div>
                            <div className="form-check mb-2">
                                <input className="form-check-input" type="checkbox" id="brand2" />
                                <label className="form-check-label" htmlFor="brand2">Samsung</label>
                            </div>
                            <div className="form-check mb-2">
                                <input className="form-check-input" type="checkbox" id="brand3" />
                                <label className="form-check-label" htmlFor="brand3">Sony</label>
                            </div>
                        </div>
                    </div>

                    {/* Products Grid */}
                    <div className="col-lg-9">
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <div>
                                <p className="mb-0">Showing 1-12 of 120 results</p>
                            </div>
                            <select className="form-select" style={{ width: '200px' }}>
                                <option>Default Sorting</option>
                                <option>Price: Low to High</option>
                                <option>Price: High to Low</option>
                                <option>Newest First</option>
                            </select>
                        </div>

                        <div className="row g-4">
                            {products.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))}
                        </div>

                        {/* Pagination */}
                        <div className="d-flex justify-content-center mt-5">
                            <nav>
                                <ul className="pagination">
                                    <li className="page-item disabled">
                                        <a className="page-link" href="#">Previous</a>
                                    </li>
                                    <li className="page-item active"><a className="page-link" href="#">1</a></li>
                                    <li className="page-item"><a className="page-link" href="#">2</a></li>
                                    <li className="page-item"><a className="page-link" href="#">3</a></li>
                                    <li className="page-item">
                                        <a className="page-link" href="#">Next</a>
                                    </li>
                                </ul>
                            </nav>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ShopPage;

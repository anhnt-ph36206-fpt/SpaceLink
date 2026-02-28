import React, { useState } from 'react';
import ProductCard from '../common/ProductCard';
import type {Product} from '../../types';

const ProductTabs: React.FC = () => {
    const [activeTab, setActiveTab] = useState('all');

    // Sample product data - will be replaced with real data later
    const sampleProducts: Product[] = [
        {
            id: '1',
            name: 'Apple iPad Mini G2356',
            category: 'SmartPhone',
            image: '/assets/client/img/product-3.png',
            price: 1050,
            oldPrice: 1250,
            rating: 4,
            isNew: true,
        },
        {
            id: '2',
            name: 'Apple iPad Mini G2356',
            category: 'SmartPhone',
            image: '/assets/client/img/product-4.png',
            price: 1050,
            oldPrice: 1250,
            rating: 4,
            isSale: true,
        },
        {
            id: '3',
            name: 'Apple iPad Mini G2356',
            category: 'SmartPhone',
            image: '/assets/client/img/product-5.png',
            price: 1050,
            oldPrice: 1250,
            rating: 4,
        },
        {
            id: '4',
            name: 'Apple iPad Mini G2356',
            category: 'SmartPhone',
            image: '/assets/client/img/product-6.png',
            price: 1050,
            oldPrice: 1250,
            rating: 4,
            isNew: true,
        },
        {
            id: '5',
            name: 'Apple iPad Mini G2356',
            category: 'SmartPhone',
            image: '/assets/client/img/product-7.png',
            price: 1050,
            oldPrice: 1250,
            rating: 4,
            isSale: true,
        },
        {
            id: '6',
            name: 'Apple iPad Mini G2356',
            category: 'SmartPhone',
            image: '/assets/client/img/product-8.png',
            price: 1050,
            oldPrice: 1250,
            rating: 4,
        },
        {
            id: '7',
            name: 'Apple iPad Mini G2356',
            category: 'SmartPhone',
            image: '/assets/client/img/product-9.png',
            price: 1050,
            oldPrice: 1250,
            rating: 4,
            isNew: true,
        },
        {
            id: '8',
            name: 'Apple iPad Mini G2356',
            category: 'SmartPhone',
            image: '/assets/client/img/product-10.png',
            price: 1050,
            oldPrice: 1250,
            rating: 4,
            isSale: true,
        },
    ];

    return (
        <div className="container-fluid product py-5">
            <div className="container py-5">
                <div className="tab-class">
                    <div className="row g-4">
                        <div className="col-lg-4 text-start wow fadeInLeft" data-wow-delay="0.1s">
                            <h1>Our Products</h1>
                        </div>
                        <div className="col-lg-8 text-end wow fadeInRight" data-wow-delay="0.1s">
                            <ul className="nav nav-pills d-inline-flex text-center mb-5">
                                <li className="nav-item mb-4">
                                    <a
                                        className={`d-flex mx-2 py-2 bg-light rounded-pill ${activeTab === 'all' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('all')}
                                        href="#"
                                    >
                                        <span className="text-dark" style={{ width: '130px' }}>All Products</span>
                                    </a>
                                </li>
                                <li className="nav-item mb-4">
                                    <a
                                        className={`d-flex py-2 mx-2 bg-light rounded-pill ${activeTab === 'new' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('new')}
                                        href="#"
                                    >
                                        <span className="text-dark" style={{ width: '130px' }}>New Arrivals</span>
                                    </a>
                                </li>
                                <li className="nav-item mb-4">
                                    <a
                                        className={`d-flex mx-2 py-2 bg-light rounded-pill ${activeTab === 'featured' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('featured')}
                                        href="#"
                                    >
                                        <span className="text-dark" style={{ width: '130px' }}>Featured</span>
                                    </a>
                                </li>
                                <li className="nav-item mb-4">
                                    <a
                                        className={`d-flex mx-2 py-2 bg-light rounded-pill ${activeTab === 'top' ? 'active' : ''}`}
                                        onClick={() => setActiveTab('top')}
                                        href="#"
                                    >
                                        <span className="text-dark" style={{ width: '130px' }}>Top Selling</span>
                                    </a>
                                </li>
                            </ul>
                        </div>
                    </div>
                    <div className="tab-content">
                        <div className="tab-pane fade show active p-0">
                            <div className="row g-4">
                                {sampleProducts.map((product) => (
                                    <ProductCard key={product.id} product={product} />
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductTabs;

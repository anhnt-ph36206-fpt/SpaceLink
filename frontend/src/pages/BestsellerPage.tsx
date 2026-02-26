import React from 'react';
import ProductCard from '../components/common/ProductCard';
import type {Product} from '../types';

const BestsellerPage: React.FC = () => {
    // Sample bestseller products
    const products: Product[] = Array.from({ length: 12 }, (_, i) => ({
        id: `${i + 1}`,
        name: 'Apple iPad Mini G2356',
        category: 'SmartPhone',
        image: `/assets/client/img/product-${(i % 8) + 3}.png`,
        price: 1050,
        oldPrice: 1250,
        rating: 5,
        isSale: true,
    }));

    return (
        <div className="container-fluid py-5">
            <div className="container">
                <div className="text-center mb-5">
                    <h1 className="display-4">Bestseller Products</h1>
                    <p className="text-muted">Our most popular and top-rated products</p>
                </div>

                <div className="row g-4">
                    {products.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default BestsellerPage;

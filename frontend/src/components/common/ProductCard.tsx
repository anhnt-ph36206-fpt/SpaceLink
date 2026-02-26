import React from 'react';
import { Link } from 'react-router-dom';
import type {Product} from '../../types';

interface ProductCardProps {
    product: Product;
}

const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
    const renderStars = (rating: number) => {
        const stars = [];
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <i
                    key={i}
                    className={`fas fa-star ${i <= rating ? 'text-primary' : ''}`}
                ></i>
            );
        }
        return stars;
    };

    return (
        <div className="col-md-6 col-lg-4 col-xl-3">
            <div className="product-item rounded wow fadeInUp" data-wow-delay="0.1s">
                <div className="product-item-inner border rounded">
                    <div className="product-item-inner-item">
                        <img src={product.image} className="img-fluid w-100 rounded-top" alt={product.name} />
                        {product.isNew && <div className="product-new">New</div>}
                        {product.isSale && <div className="product-sale">Sale</div>}
                        <div className="product-details">
                            <Link to={`/product/${product.id}`}>
                                <i className="fa fa-eye fa-1x"></i>
                            </Link>
                        </div>
                    </div>
                    <div className="text-center rounded-bottom p-4">
                        <a href="#" className="d-block mb-2">{product.category}</a>
                        <Link to={`/product/${product.id}`} className="d-block h4">
                            {product.name}
                        </Link>
                        {product.oldPrice && (
                            <del className="me-2 fs-5">${product.oldPrice.toFixed(2)}</del>
                        )}
                        <span className="text-primary fs-5">${product.price.toFixed(2)}</span>
                    </div>
                </div>
                <div className="product-item-add border border-top-0 rounded-bottom text-center p-4 pt-0">
                    <a href="#" className="btn btn-primary border-secondary rounded-pill py-2 px-4 mb-4">
                        <i className="fas fa-shopping-cart me-2"></i> Add To Cart
                    </a>
                    <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex">
                            {renderStars(product.rating)}
                        </div>
                        <div className="d-flex">
                            <a href="#" className="text-primary d-flex align-items-center justify-content-center me-3">
                                <span className="rounded-circle btn-sm-square border">
                                    <i className="fas fa-random"></i>
                                </span>
                            </a>
                            <a href="#" className="text-primary d-flex align-items-center justify-content-center me-0">
                                <span className="rounded-circle btn-sm-square border">
                                    <i className="fas fa-heart"></i>
                                </span>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductCard;

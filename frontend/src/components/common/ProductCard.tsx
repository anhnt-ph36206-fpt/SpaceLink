import React from 'react';
import { Link } from 'react-router-dom';

interface ProductCardProps {
    product: {
        id: string;
        name: string;
        category_id?: number;
        category?: string;
        image: string;
        price: number;
        oldPrice?: number;
        rating?: number;
        isNew?: boolean;
        isSale?: boolean;
    };
    index?: number;
    onAddToCart?: (product: any) => void;
}

const ProductCard: React.FC<ProductCardProps> = ({ product, index = 0, onAddToCart }) => {

    // --- LOGIC TẠO HIỆU ỨNG SO LE GIỐNG HOME ---
    // Mỗi sản phẩm chậm hơn cái trước 0.1 giây.
    // Dùng % 4 để cứ sau 4 sản phẩm (1 hàng) thì reset lại delay để người dùng không phải chờ quá lâu
    const delayTime = (index % 4) * 0.1 + 0.1;

    const renderStars = (rating: number | undefined) => {
        const stars = [];
        const finalRating = rating ? Math.round(rating) : 5;
        for (let i = 1; i <= 5; i++) {
            stars.push(
                <i key={i} className={`fas fa-star ${i <= finalRating ? 'text-primary' : 'text-muted'} small`}></i>
            );
        }
        return stars;
    };

    return (
        <div className="col-6 col-sm-6 col-md-4">
            {/* THAY ĐỔI Ở ĐÂY: Dùng biến delayTime đã tính toán */}
            <div
                className="product-item rounded wow fadeInUp"
                data-wow-delay={`${delayTime}s`}
            >
                <div className="product-item-inner border rounded">
                    <div className="product-item-inner-item position-relative overflow-hidden">

                        <div className="rounded-top text-center p-3" style={{ height: '200px', backgroundColor: '#fff' }}>
                            <Link to={`/product/${product.id}`} className="d-block h-100 w-100 position-relative">
                                <img
                                    src={product.image || undefined}
                                    className="img-fluid"
                                    alt={product.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                />
                            </Link>
                        </div>

                        {product.isNew && <div className="product-new">New</div>}
                        {product.isSale && <div className="product-sale">Sale</div>}

                        <div className="product-details">
                            <Link to={`/product/${product.id}`} className="btn btn-primary rounded-circle p-2 d-flex justify-content-center align-items-center" style={{ width: 40, height: 40 }}>
                                <i className="fa fa-eye"></i>
                            </Link>
                        </div>
                    </div>

                    <div className="text-center rounded-bottom p-4">
                        <Link to="#" className="d-block mb-2 text-decoration-none text-muted text-uppercase small">
                            {product.category || "Điện thoại"}
                        </Link>

                        <Link to={`/product/${product.id}`} className="d-block h6 text-decoration-none text-dark" title={product.name} style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: '1.4' }}>
                            {product.name}
                        </Link>

                        <div className="mt-2">
                            {product.oldPrice && product.oldPrice > product.price && (
                                <del className="me-2 text-muted" style={{ fontSize: '0.9rem' }}>
                                    {product.oldPrice.toLocaleString('vi-VN')} đ
                                </del>
                            )}
                            <span className="text-danger fw-bold fs-5">
                                {product.price.toLocaleString('vi-VN')} đ
                            </span>
                        </div>
                    </div>
                </div>

                <div className="product-item-add border border-top-0 rounded-bottom text-center p-4 pt-0">
                    <button
                        className="btn btn-primary rounded-pill px-4 py-2 mb-4 fw-bold transition-all"
                        style={{ width: '100%', borderRadius: '50px' }}
                        onClick={() => onAddToCart && onAddToCart(product)}
                    >
                        <i className="fas fa-shopping-bag me-2"></i> Thêm vào giỏ
                    </button>

                    <div className="d-flex justify-content-between align-items-center">
                        <div className="small text-muted">Đánh giá:</div>
                        <div className="d-flex text-warning small">
                            {renderStars(product.rating)}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductCard;
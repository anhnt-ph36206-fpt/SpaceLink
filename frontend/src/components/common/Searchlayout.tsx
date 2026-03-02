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
    index?: number; // Nhận số thứ tự để tính delay
}

const Searchlayout: React.FC<ProductCardProps> = ({ product, index = 0 }) => {

    // 1. Tính độ trễ để tạo hiệu ứng lượn sóng (cách nhau 0.1s)
    const delayTime = (index % 4) * 0.1 + 0.1;

    // 2. CSS "Ép buộc" (Force) để sửa lỗi mất Hover và lỗi con mắt đứng yên
    const hoverCss = `
        /* Đảm bảo thẻ Card luôn nhận sự kiện chuột */
        .product-item {
            position: relative;
            z-index: 1;
            transition: all 0.3s ease;
            visibility: visible !important; /* Fix lỗi WOW làm ẩn */
        }

        /* Cấu hình con mắt (Mặc định ẩn hoàn toàn) */
        .product-details {
            position: absolute;
            top: 50%; left: 50%;
            transform: translate(-50%, -50%) scale(0); /* Thu nhỏ = 0 */
            opacity: 0;
            transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            z-index: 100 !important;
            pointer-events: none;
        }

        /* Khi di chuột vào ảnh: Hiện con mắt */
        .product-item-inner-item { cursor: pointer; }
        
        .product-item-inner-item:hover .product-details {
            transform: translate(-50%, -50%) scale(1) !important; /* Phóng to */
            opacity: 1 !important; /* Hiện rõ */
            pointer-events: auto !important;
        }

        /* Hiệu ứng mờ ảnh nền khi hover */
        .product-item-inner-item:hover img {
            opacity: 0.8;
            transition: 0.3s;
        }

        /* Lớp phủ mờ nhẹ */
        .product-item-inner-item::before {
            content: ""; position: absolute;
            top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.05);
            opacity: 0; transition: all 0.3s; z-index: 50;
            pointer-events: none;
        }
        .product-item-inner-item:hover::before { opacity: 1; }
    `;

    const renderStars = (rating: number | undefined) => {
        const stars = [];
        const finalRating = rating ? Math.round(rating) : 5;
        for (let i = 1; i <= 5; i++) {
            stars.push(<i key={i} className={`fas fa-star ${i <= finalRating ? 'text-primary' : 'text-muted'} small`}></i>);
        }
        return stars;
    };

    return (
        <div className="col-md-6 col-lg-4 col-xl-3">
            {/* Nhúng CSS trực tiếp */}
            <style>{hoverCss}</style>

            {/* QUAN TRỌNG: Class wow fadeInUp + data-wow-delay */}
            <div
                className="product-item rounded wow fadeInUp"
                data-wow-delay={`${delayTime}s`}
                // Thêm animation-name để fallback nếu WOW lỗi
                style={{ animationName: 'fadeInUp' }}
            >
                <div className="product-item-inner border rounded">
                    <div className="product-item-inner-item position-relative overflow-hidden">

                        {/* Ảnh sản phẩm */}
                        <div className="rounded-top text-center p-3" style={{ height: '240px', backgroundColor: '#fff' }}>
                            <Link to={`/product/${product.id}`} className="d-block h-100 w-100 position-relative" style={{ zIndex: 10 }}>
                                <img
                                    src={product.image}
                                    className="img-fluid"
                                    alt={product.name}
                                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                                />
                            </Link>
                        </div>



                        {/* Con mắt (Đã được CSS ẩn đi và chỉ hiện khi hover) */}
                        <div className="product-details">
                            <Link
                                to={`/product/${product.id}`}
                                className="btn btn-primary rounded-circle d-flex justify-content-center align-items-center shadow-lg"
                                style={{ width: 45, height: 45 }}
                            >
                                <i className="fa fa-eye fa-lg"></i>
                            </Link>
                        </div>
                    </div>

                    <div className="text-center rounded-bottom p-4">
                        <Link to="#" className="d-block mb-2 text-decoration-none text-muted text-uppercase small">
                            {product.category || "Điện thoại"}
                        </Link>
                        <Link to={`/product/${product.id}`} className="d-block h5 text-decoration-none text-dark text-truncate">
                            {product.name}
                        </Link>
                        <div className="mt-2">
                            {product.oldPrice && product.oldPrice > product.price && (
                                <del className="me-2 text-muted" style={{ fontSize: '0.9rem' }}>{product.oldPrice.toLocaleString('vi-VN')} đ</del>
                            )}
                            <span className="text-danger fw-bold fs-5">{product.price.toLocaleString('vi-VN')} đ</span>
                        </div>
                    </div>
                </div>

                <div className="product-item-add border border-top-0 rounded-bottom text-center p-4 pt-0">
                    <button className="btn btn-primary rounded-pill px-4 py-2 mb-4 fw-bold transition-all" style={{ width: '100%', borderRadius: '50px' }}>
                        <i className="fas fa-shopping-bag me-2"></i> Thêm vào giỏ
                    </button>
                    <div className="d-flex justify-content-between align-items-center">
                        <div className="small text-muted">Đánh giá:</div>
                        <div className="d-flex text-warning small">{renderStars(product.rating)}</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Searchlayout;
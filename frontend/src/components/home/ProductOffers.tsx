import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// Định nghĩa Type cho Offer
interface OfferItem {
    id: string;
    name: string;
    description: string;
    image: string;
    discountPercent: number;
    category: string;
}

const ProductOffers: React.FC = () => {
    const [offers, setOffers] = useState<OfferItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [productRes, imageRes] = await Promise.all([
                    fetch("http://localhost:3000/products"),
                    fetch("http://localhost:3000/product_images")
                ]);

                const products = await productRes.json();
                const images = await imageRes.json();

                // LOGIC: Lấy 2 sản phẩm có mức giảm giá cao nhất để làm Banner
                // Hoặc bạn có thể lọc theo id cụ thể (ví dụ id=1 và id=2)
                const processedData = products
                    .map((p: any) => {
                        const thumb = images.find((i: any) => i.product_id === p.id && i.is_primary);
                        const discount = p.price > p.sale_price
                            ? Math.round(((p.price - p.sale_price) / p.price) * 100)
                            : 0;

                        return {
                            id: String(p.id),
                            name: p.name,
                            description: "Sở hữu ngay siêu phẩm công nghệ với mức giá ưu đãi nhất.", // Câu dẫn mẫu
                            image: thumb ? thumb.image_path : "",
                            discountPercent: discount,
                            category: p.category
                        };
                    })
                    // Sắp xếp giảm dần theo % giảm giá
                    .sort((a: any, b: any) => b.discountPercent - a.discountPercent)
                    // Lấy 2 cái đầu tiên
                    .slice(0, 2);

                setOffers(processedData);
            } catch (error) {
                console.error("Lỗi tải Offers:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    if (isLoading) return null; // Hoặc loading skeleton
    if (offers.length < 2) return null; // Nếu không đủ dữ liệu thì ẩn luôn

    return (
        <div className="container-fluid bg-light py-5">
            <div className="container">
                <div className="row g-4">

                    {/* --- OFFER 1 (Trái) --- */}
                    <div className="col-lg-6 wow fadeInLeft" data-wow-delay="0.2s">
                        <div className="position-relative bg-white rounded shadow-sm border p-4 h-100 d-flex align-items-center justify-content-between overflow-hidden group-hover-zoom">
                            {/* Nội dung */}
                            <div className="offer-content" style={{ zIndex: 2, maxWidth: '60%' }}>
                                <span className="badge bg-primary mb-3 px-3 py-2 rounded-pill text-uppercase">
                                    {offers[0].category}
                                </span>
                                <h3 className="fw-bold text-dark mb-2 text-truncate">
                                    {offers[0].name}
                                </h3>
                                <p className="text-muted mb-3 small">
                                    {offers[0].description}
                                </p>
                                <h2 className="display-5 fw-bold text-danger mb-4">
                                    -{offers[0].discountPercent}% <span className="fs-4 text-dark fw-normal">Off</span>
                                </h2>
                                <Link
                                    to={`/product/${offers[0].id}`}
                                    className="btn btn-outline-primary rounded-pill py-2 px-4 fw-bold"
                                >
                                    Xem Ngay <i className="fas fa-arrow-right ms-2"></i>
                                </Link>
                            </div>

                            {/* Ảnh */}
                            <div className="offer-img text-center" style={{ width: '40%' }}>
                                <img
                                    src={offers[0].image}
                                    className="img-fluid"
                                    alt={offers[0].name}
                                    style={{ maxHeight: '250px', objectFit: 'contain', transition: 'transform 0.5s ease' }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* --- OFFER 2 (Phải) --- */}
                    <div className="col-lg-6 wow fadeInRight" data-wow-delay="0.3s">
                        <div className="position-relative bg-dark text-white rounded shadow-sm border p-4 h-100 d-flex align-items-center justify-content-between overflow-hidden">
                            {/* Nội dung (Đảo ngược màu cho banner phải để nổi bật) */}
                            <div className="offer-content" style={{ zIndex: 2, maxWidth: '60%' }}>
                                <span className="badge bg-warning text-dark mb-3 px-3 py-2 rounded-pill text-uppercase">
                                    Deal Sốc
                                </span>
                                <h3 className="fw-bold text-white mb-2 text-truncate">
                                    {offers[1].name}
                                </h3>
                                <p className="text-white-50 mb-3 small">
                                    Cơ hội duy nhất trong năm. Số lượng có hạn.
                                </p>
                                <h2 className="display-5 fw-bold text-warning mb-4">
                                    -{offers[1].discountPercent}% <span className="fs-4 text-white fw-normal">Off</span>
                                </h2>
                                <Link
                                    to={`/product/${offers[1].id}`}
                                    className="btn btn-light rounded-pill py-2 px-4 fw-bold text-dark"
                                >
                                    Mua Ngay <i className="fas fa-shopping-cart ms-2"></i>
                                </Link>
                            </div>

                            {/* Ảnh */}
                            <div className="offer-img text-center" style={{ width: '40%' }}>
                                <img
                                    src={offers[1].image}
                                    className="img-fluid"
                                    alt={offers[1].name}
                                    style={{ maxHeight: '250px', objectFit: 'contain' }}
                                />
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ProductOffers;
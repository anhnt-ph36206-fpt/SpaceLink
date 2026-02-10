import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

// Định nghĩa kiểu dữ liệu hiển thị
interface SliderProduct {
    id: string;
    name: string;
    description: string;
    image: string;
    price: number;
    sale_price: number;
    category: string;
}

const HeroSlider: React.FC = () => {
    const [slides, setSlides] = useState<SliderProduct[]>([]);
    const [rightBanner, setRightBanner] = useState<SliderProduct | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // 1. Fetch dữ liệu từ DB
    useEffect(() => {
        const fetchData = async () => {
            try {
                // Lấy sản phẩm và ảnh
                const [prodRes, imgRes] = await Promise.all([
                    fetch("http://localhost:3000/products"),
                    fetch("http://localhost:3000/product_images")
                ]);

                const products = await prodRes.json();
                const images = await imgRes.json();

                // Lọc sản phẩm nổi bật (is_featured = true) hoặc active
                const featuredProducts = products.filter((p: any) => p.is_featured && p.is_active);

                // Merge ảnh vào sản phẩm
                const mergedData = featuredProducts.map((p: any) => {
                    const thumb = images.find((i: any) => i.product_id === p.id && i.is_primary);
                    return {
                        id: String(p.id),
                        name: p.name,
                        description: p.description,
                        image: thumb ? thumb.image_path : "https://via.placeholder.com/600x400",
                        price: p.price,
                        sale_price: p.sale_price,
                        category: p.category
                    };
                });

                // Chia dữ liệu: 
                // - 3 sản phẩm đầu tiên cho vào Slider chính
                // - Sản phẩm thứ 4 (nếu có) cho vào Banner bên phải
                setSlides(mergedData.slice(0, 3));
                if (mergedData.length > 3) {
                    setRightBanner(mergedData[3]);
                } else {
                    // Nếu ít sản phẩm quá thì lấy đại cái đầu tiên làm banner phải
                    setRightBanner(mergedData[0]);
                }

            } catch (error) {
                console.error("Lỗi tải Slider:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    // 2. Khởi tạo OwlCarousel SAU KHI có dữ liệu (slides)
    useEffect(() => {
        if (!isLoading && slides.length > 0) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error
            if (window.$ && window.$.fn.owlCarousel) {
                // Destroy slider cũ nếu có để tránh lỗi render lại
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                const $carousel = window.$(".header-carousel");

                // Khởi tạo mới
                $carousel.owlCarousel({
                    loop: true,
                    margin: 10,
                    nav: true,
                    items: 1,
                    autoplay: true,
                    autoplayTimeout: 5000,
                    smartSpeed: 1000,
                    navText: [
                        '<i class="fas fa-chevron-left"></i>',
                        '<i class="fas fa-chevron-right"></i>',
                    ]
                });
            }
        }
    }, [isLoading, slides]); // Chạy lại khi loading xong và có slides

    if (isLoading) return null; // Hoặc hiển thị Skeleton loading

    return (
        <div className="container-fluid carousel bg-white px-0 mb-5">
            <div className="row g-0 justify-content-center">

                {/* --- SLIDER CHÍNH (DYNAMIC TỪ DB) --- */}
                <div className="col-12 col-lg-8 col-xl-9">
                    <div className="header-carousel owl-carousel bg-light rounded shadow-sm">

                        {slides.map((item) => {
                            // Tính giảm giá
                            const discount = item.price > item.sale_price
                                ? item.price - item.sale_price
                                : 0;

                            return (
                                <div key={item.id} className="row g-0 header-carousel-item align-items-center" style={{ minHeight: '450px' }}>
                                    <div className="col-md-6 carousel-img position-relative h-100">
                                        <img
                                            src={item.image}
                                            className="img-fluid w-100 h-100"
                                            alt={item.name}
                                            style={{ objectFit: 'contain', padding: '40px', maxHeight: '450px' }}
                                        />
                                    </div>
                                    <div className="col-md-6 carousel-content p-5">
                                        <h5 className="text-primary text-uppercase fw-bold mb-3" style={{ letterSpacing: '2px' }}>
                                            {item.category}
                                        </h5>
                                        <h1 className="display-5 fw-bold mb-4 text-dark text-truncate">
                                            {item.name}
                                        </h1>
                                        <p className="lead text-muted mb-4 text-truncate" style={{ maxWidth: '90%' }}>
                                            {item.description}
                                        </p>
                                        <div className="d-flex flex-column flex-sm-row gap-3">
                                            <Link to={`/product/${item.id}`} className="btn btn-primary rounded-pill py-3 px-5 fw-bold shadow">
                                                Mua Ngay
                                            </Link>
                                            {discount > 0 && (
                                                <span className="d-flex align-items-center fs-5 fw-bold text-danger">
                                                    Giảm {discount.toLocaleString('vi-VN')}đ
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}

                    </div>
                </div>

                {/* --- BANNER PHỤ (DYNAMIC - LẤY SẢN PHẨM THỨ 4) --- */}
                {rightBanner && (
                    <div className="col-12 col-lg-4 col-xl-3 mt-3 mt-lg-0 ps-lg-3">
                        <div className="carousel-header-banner h-100 position-relative rounded overflow-hidden shadow-sm bg-dark">
                            <img
                                src={rightBanner.image}
                                className="img-fluid w-100 h-100 opacity-50"
                                style={{ objectFit: 'cover' }}
                                alt={rightBanner.name}
                            />

                            {/* Nhãn HOT */}
                            <div className="position-absolute top-0 start-0 p-3">
                                <span className="badge bg-warning text-dark fs-6 py-2 px-3 rounded-pill shadow-sm">
                                    Đang Bán Chạy
                                </span>
                            </div>

                            {/* Nội dung banner */}
                            <div className="carousel-banner-content position-absolute bottom-0 start-0 w-100 p-4">
                                <p className="text-warning fw-bold mb-1 text-uppercase small ls-1">
                                    {rightBanner.category}
                                </p>
                                <h4 className="text-white fw-bold mb-2 text-truncate">
                                    {rightBanner.name}
                                </h4>
                                <div className="d-flex align-items-end mb-3">
                                    <span className="text-white fw-bold fs-4 me-2">
                                        {rightBanner.sale_price.toLocaleString('vi-VN')}đ
                                    </span>
                                    {rightBanner.price > rightBanner.sale_price && (
                                        <del className="text-white-50 small">
                                            {rightBanner.price.toLocaleString('vi-VN')}đ
                                        </del>
                                    )}
                                </div>
                                <Link to={`/product/${rightBanner.id}`} className="btn btn-light rounded-pill py-2 px-4 w-100 fw-bold text-primary">
                                    <i className="fas fa-shopping-bag me-2"></i> Xem Chi Tiết
                                </Link>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
};

export default HeroSlider;
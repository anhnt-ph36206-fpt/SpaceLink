import React, { useEffect, useState } from "react";
import ProductCard from "../common/ProductCard";
// import { Product } from "../../types"; // Import type nếu cần

// Định nghĩa lại Type nội bộ để khớp với logic
interface ProductDisplay {
    id: string;
    name: string;
    category_id: number;
    image: string;
    price: number;
    oldPrice: number;
    isNew: boolean;
    isSale: boolean;
    rating?: number; // Trường này sẽ chứa điểm đánh giá trung bình
}


const ProductTabs: React.FC = () => {
    // activeTab có thể là chuỗi ("all", "featured") hoặc số (category_id: 1, 2...)
    const [activeTab, setActiveTab] = useState<string | number>("all");
    const [products, setProducts] = useState<ProductDisplay[]>([]);

    // State chứa danh sách tab (Việt hóa mặc định)
    const [tabList, setTabList] = useState<{ id: string | number, label: string }[]>([
        { id: "all", label: "Tất cả" },
        { id: "featured", label: "Nổi bật" }
    ]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Gọi API (Thêm reviews vào Promise.all)
                const [productRes, imageRes, cateRes, reviewRes] = await Promise.all([
                    fetch("http://localhost:3000/products"),
                    fetch("http://localhost:3000/product_images"),
                    fetch("http://localhost:3000/categories"),
                    fetch("http://localhost:3000/reviews") // <--- Lấy danh sách đánh giá
                ]);

                const productData = await productRes.json();
                const imageData = await imageRes.json();
                const cateData = await cateRes.json();
                const reviewData = await reviewRes.json(); // <--- Data đánh giá

                // 1. Cập nhật danh sách Tab từ DB
                const dynamicTabs = cateData
                    .filter((c: any) => c.is_active) // Chỉ lấy danh mục đang hoạt động
                    .map((c: any) => ({ id: c.id, label: c.name }));

                // Gộp tab tĩnh (Tiếng Việt) + tab động (Từ DB)
                setTabList([
                    { id: "all", label: "Tất cả" },
                    { id: "featured", label: "Nổi bật" },
                    ...dynamicTabs
                ]);

                // 2. Merge product + ảnh + category_id + rating
                const merged = productData.map((p: any) => {
                    const primaryImage = imageData.find(
                        (img: any) => img.product_id === p.id && img.is_primary
                    );
                    const fallbackImage = imageData.find((img: any) => img.product_id === p.id);

                    // --- LOGIC TÍNH ĐIỂM SAO TRUNG BÌNH ---
                    // Lọc ra các review của sản phẩm này
                    const productReviews = reviewData.filter((r: any) => r.product_id === p.id);

                    // Tính trung bình cộng (nếu có review), ngược lại lấy rating mặc định hoặc 5
                    const avgRating = productReviews.length > 0
                        ? productReviews.reduce((sum: number, r: any) => sum + r.rating, 0) / productReviews.length
                        : (p.rating || 5);

                    return {
                        id: String(p.id),
                        name: p.name,
                        category_id: p.category_id,
                        image: primaryImage?.image_path || fallbackImage?.image_path || "",
                        price: p.sale_price || p.price,
                        oldPrice: p.price,
                        isNew: p.is_featured,
                        isSale: p.sale_price < p.price,
                        rating: avgRating // <--- Truyền điểm sao đã tính vào đây
                    };
                });

                setProducts(merged);
            } catch (error) {
                console.error("Lỗi tải dữ liệu:", error);
            }
        };

        fetchData();
    }, []);

    // Logic Lọc sản phẩm
    const filteredProducts = products.filter((p) => {
        if (activeTab === "all") return true;
        if (activeTab === "featured") return p.isNew;
        // Nếu activeTab là số (category_id)
        return p.category_id === activeTab;
    });

    return (
        <div className="container-fluid product py-5">
            <div className="container py-5">

                {/* Tiêu đề & Danh sách Tab */}
                <div className="d-flex justify-content-between align-items-center mb-5">
                    <h1>Sản Phẩm Của Chúng Tôi</h1>

                    <div>
                        {tabList.map((tab) => (
                            <button
                                key={tab.id}
                                className={`btn mx-2 ${activeTab === tab.id
                                    ? "btn-primary"
                                    : "btn-outline-primary"
                                    }`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Lưới sản phẩm */}
                <div className="row g-4">
                    {filteredProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}

                    {/* Thông báo nếu không có sản phẩm */}
                    {filteredProducts.length === 0 && (
                        <div className="col-12 text-center">
                            <p className="text-muted">Không tìm thấy sản phẩm nào trong danh mục này.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default ProductTabs;
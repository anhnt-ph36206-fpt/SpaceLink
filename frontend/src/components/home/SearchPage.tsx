import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import ProductCard from '../common/Searchlayout';

interface Product {
    id: string;
    name: string;
    category_id: number; // Quan trọng để so sánh
    image: string;
    price: number;
    oldPrice?: number;
    rating?: number;
    isNew?: boolean;
    isSale?: boolean;
}

const SearchPage: React.FC = () => {
    const [searchParams] = useSearchParams();

    // Lấy tham số từ URL
    const keyword = searchParams.get('keyword') || '';
    const categoryId = searchParams.get('category') || ''; // Lấy ID danh mục từ URL

    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [categoryName, setCategoryName] = useState(""); // Để hiển thị tên danh mục (VD: "iPhone")

    useEffect(() => {
        const fetchAndFilter = async () => {
            setIsLoading(true);
            try {
                // 1. Tải dữ liệu song song (Sản phẩm, Ảnh, Danh mục)
                const [prodRes, imgRes, catRes] = await Promise.all([
                    fetch("http://localhost:3000/products"),
                    fetch("http://localhost:3000/product_images"),
                    fetch("http://localhost:3000/categories")
                ]);

                const allProducts = await prodRes.json();
                const allImages = await imgRes.json();
                const allCats = await catRes.json();

                // 2. Tìm tên danh mục để hiển thị tiêu đề (nếu đang lọc theo danh mục)
                if (categoryId) {
                    const currentCat = allCats.find((c: any) => c.id == categoryId);
                    if (currentCat) setCategoryName(currentCat.name);
                } else {
                    setCategoryName("");
                }

                // --- 3. LOGIC LỌC SẢN PHẨM CHUẨN ---
                const filteredProducts = allProducts.filter((p: any) => {
                    let match = true;

                    // A. Nếu có từ khóa tìm kiếm -> Check tên
                    if (keyword) {
                        const productName = p.name.toLowerCase();
                        const searchKey = keyword.toLowerCase();
                        if (!productName.includes(searchKey)) {
                            match = false;
                        }
                    }

                    // B. Nếu có chọn danh mục -> Check category_id
                    // Lưu ý: Dùng == thay vì === để so sánh chuỗi "1" với số 1 đều được
                    if (categoryId && match) {
                        if (p.category_id != categoryId) {
                            match = false;
                        }
                    }

                    return match;
                });

                // 4. Ghép ảnh vào kết quả
                const finalData = filteredProducts.map((p: any) => {
                    const thumb = allImages.find((img: any) => img.product_id === p.id && img.is_primary);
                    // Fallback ảnh nếu không có ảnh chính
                    const anyImg = allImages.find((img: any) => img.product_id === p.id);

                    return {
                        id: String(p.id),
                        name: p.name,
                        category_id: p.category_id,
                        image: thumb ? thumb.image_path : (anyImg?.image_path || "https://via.placeholder.com/300"),
                        price: p.sale_price || p.price,
                        oldPrice: p.price,
                        rating: p.rating,
                        isNew: p.is_featured,
                        isSale: p.sale_price < p.price
                    };
                });

                setProducts(finalData);

            } catch (error) {
                console.error("Lỗi:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchAndFilter();
    }, [keyword, categoryId]); // Chạy lại khi URL thay đổi (bấm danh mục khác hoặc tìm từ khóa khác)

    return (
        <div className="container-fluid py-5 bg-light min-vh-100">
            <div className="container py-5">
                {/* Breadcrumb */}
                <nav aria-label="breadcrumb">
                    <ol className="breadcrumb">
                        <li className="breadcrumb-item"><Link to="/">Trang chủ</Link></li>
                        <li className="breadcrumb-item active">
                            {categoryId ? 'Danh mục' : 'Tìm kiếm'}
                        </li>
                    </ol>
                </nav>

                {/* Tiêu đề trang kết quả */}
                <div className="mb-4 border-bottom pb-3">
                    {categoryId ? (
                        // Hiển thị kiểu: "Danh mục: iPhone"
                        <h3>Danh mục: <span className="text-primary fw-bold">{categoryName || "Sản phẩm"}</span></h3>
                    ) : (
                        // Hiển thị kiểu: "Tìm kiếm: iphone 15"
                        <h3>Tìm kiếm: <span className="text-primary fw-bold">"{keyword}"</span></h3>
                    )}

                    <p className="text-muted">
                        Tìm thấy <span className="fw-bold text-dark">{products.length}</span> sản phẩm.
                    </p>
                </div>

                {isLoading ? (
                    <div className="text-center py-5">
                        <div className="spinner-border text-primary" role="status"></div>
                    </div>
                ) : (
                    <div className="row g-4">
                        {products.length > 0 ? (
                            products.map((product) => (
                                <ProductCard key={product.id} product={product} />
                            ))
                        ) : (
                            <div className="col-12 text-center py-5 bg-white rounded shadow-sm">
                                <i className="fas fa-box-open fa-4x text-muted mb-3 opacity-25"></i>
                                <h4 className="text-dark">Không có sản phẩm nào!</h4>
                                <p className="text-muted">Danh mục này hiện đang cập nhật hoặc không có sản phẩm phù hợp.</p>
                                <Link to="/" className="btn btn-primary rounded-pill px-4 mt-3">Xem tất cả sản phẩm</Link>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchPage;
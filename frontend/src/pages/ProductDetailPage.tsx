import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import ProductCard from "../components/common/ProductCard";
import { Product } from "../types";

const ProductDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();

    const [product, setProduct] = useState<Product | null>(null);
    const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState("description");

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [productRes, imageRes] = await Promise.all([
                    fetch("http://localhost:3000/products"),
                    fetch("http://localhost:3000/product_images")
                ]);

                const products = await productRes.json();
                const images = await imageRes.json();

                const foundProduct = products.find(
                    (p: any) => String(p.id) === id
                );

                if (!foundProduct) return;

                const primaryImage = images.find(
                    (img: any) =>
                        img.product_id === foundProduct.id && img.is_primary
                );

                const mappedProduct: Product = {
                    id: String(foundProduct.id),
                    name: foundProduct.name,
                    category: foundProduct.category,
                    image: primaryImage?.image_path || "",
                    price: foundProduct.sale_price || foundProduct.price,
                    oldPrice: foundProduct.price,
                    rating: foundProduct.rating,
                    isNew: foundProduct.is_featured,
                    description: foundProduct.description
                };

                setProduct(mappedProduct);

                // sản phẩm liên quan
                const related = products
                    .filter(
                        (p: any) =>
                            p.category === foundProduct.category &&
                            p.id !== foundProduct.id
                    )
                    .slice(0, 4)
                    .map((p: any) => {
                        const img = images.find(
                            (i: any) =>
                                i.product_id === p.id && i.is_primary
                        );

                        return {
                            id: String(p.id),
                            name: p.name,
                            category: p.category,
                            image: img?.image_path || "",
                            price: p.sale_price || p.price,
                            oldPrice: p.price,
                            rating: p.rating
                        };
                    });

                setRelatedProducts(related);

            } catch (error) {
                console.error(error);
            }
        };

        if (id) fetchData();
    }, [id]);

    if (!product) return <p>Đang tải dữ liệu...</p>;

    return (
        <div className="container-fluid py-5">
            <div className="container">

                {/* CHI TIẾT SẢN PHẨM */}
                <div className="row g-4 mb-5">
                    <div className="col-lg-6">
                        <img src={product.image} className="img-fluid rounded" alt={product.name} />
                    </div>

                    <div className="col-lg-6">
                        <h3 className="mb-3">{product.name}</h3>

                        {/* đánh giá */}
                        <div className="d-flex mb-3">
                            {[...Array(5)].map((_, i) => (
                                <i
                                    key={i}
                                    className={`fas fa-star ${i < product.rating ? "text-primary" : ""}`}
                                />
                            ))}
                        </div>

                        {/* giá */}
                        <div className="mb-3">
                            {product.oldPrice && (
                                <del className="me-2 fs-4 text-muted">
                                    {product.oldPrice.toLocaleString()} đ
                                </del>
                            )}
                            <span className="text-primary fs-3 fw-bold">
                                {product.price.toLocaleString()} đ
                            </span>
                        </div>

                        <p className="mb-4">{product.description}</p>

                        {/* số lượng */}
                        <div className="d-flex align-items-center mb-4">
                            <label className="me-3">Số lượng:</label>

                            <div className="input-group" style={{ width: 150 }}>
                                <button
                                    className="btn btn-outline-secondary"
                                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                >
                                    -
                                </button>

                                <input
                                    className="form-control text-center"
                                    value={quantity}
                                    readOnly
                                />

                                <button
                                    className="btn btn-outline-secondary"
                                    onClick={() => setQuantity(quantity + 1)}
                                >
                                    +
                                </button>
                            </div>
                        </div>

                        {/* nút hành động */}
                        <button className="btn btn-primary rounded-pill py-3 px-5">
                            Thêm vào giỏ hàng
                        </button>

                        <div className="mt-3">
                            <p><strong>Danh mục:</strong> {product.category}</p>
                            <p><strong>Tình trạng:</strong> Còn hàng</p>
                        </div>
                    </div>
                </div>

                {/* TAB */}
                <div className="row mb-5">
                    <ul className="nav nav-tabs">
                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === "description" ? "active" : ""}`}
                                onClick={() => setActiveTab("description")}
                            >
                                Mô tả
                            </button>
                        </li>

                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === "additional" ? "active" : ""}`}
                                onClick={() => setActiveTab("additional")}
                            >
                                Thông tin bổ sung
                            </button>
                        </li>

                        <li className="nav-item">
                            <button
                                className={`nav-link ${activeTab === "reviews" ? "active" : ""}`}
                                onClick={() => setActiveTab("reviews")}
                            >
                                Đánh giá
                            </button>
                        </li>
                    </ul>

                    <div className="border p-4">
                        {activeTab === "description" && <p>{product.description}</p>}
                        {activeTab === "additional" && <p>Thông tin bổ sung sẽ được cập nhật.</p>}
                        {activeTab === "reviews" && <p>Đánh giá khách hàng sẽ hiển thị tại đây.</p>}
                    </div>
                </div>

                {/* SẢN PHẨM LIÊN QUAN */}
                <div className="row">
                    <h3 className="mb-4">Sản phẩm liên quan</h3>

                    {relatedProducts.map((p) => (
                        <ProductCard key={p.id} product={p} />
                    ))}
                </div>

            </div>
        </div>
    );
};

export default ProductDetailPage;

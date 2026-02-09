import React, { useEffect, useState } from "react";
import ProductCard from "../common/ProductCard";
import { Product } from "../../types";

const ProductTabs: React.FC = () => {
    const [activeTab, setActiveTab] = useState("all");
    const [products, setProducts] = useState<Product[]>([]);

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const [productRes, imageRes] = await Promise.all([
                    fetch("http://localhost:3000/products"),
                    fetch("http://localhost:3000/product_images")
                ]);

                const productData = await productRes.json();
                const imageData = await imageRes.json();

                // merge product + ảnh chính
                const merged = productData.map((p: any) => {
                    const primaryImage = imageData.find(
                        (img: any) =>
                            img.product_id === p.id && img.is_primary
                    );

                    return {
                        id: String(p.id),
                        name: p.name,
                        image: primaryImage?.image_path || "",
                        price: p.sale_price || p.price,
                        oldPrice: p.price,
                        isNew: p.is_featured,
                        isSale: p.sale_price < p.price
                    };
                });

                setProducts(merged);
            } catch (error) {
                console.error("Fetch product error:", error);
            }
        };

        fetchProducts();
    }, []);

    // filter theo tab
    const filteredProducts = products.filter((p) => {
        if (activeTab === "featured") return p.isNew;
        return true;
    });

    return (
        <div className="container-fluid product py-5">
            <div className="container py-5">

                <div className="d-flex justify-content-between align-items-center mb-5">
                    <h1>Our Products</h1>

                    <div>
                        {["all", "featured"].map((tab) => (
                            <button
                                key={tab}
                                className={`btn mx-2 ${activeTab === tab
                                    ? "btn-primary"
                                    : "btn-outline-primary"
                                    }`}
                                onClick={() => setActiveTab(tab)}
                            >
                                {tab === "all" ? "All Products" : "Featured"}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="row g-4">
                    {filteredProducts.map((product) => (
                        <ProductCard key={product.id} product={product} />
                    ))}
                </div>

            </div>
        </div>
    );
};

export default ProductTabs;

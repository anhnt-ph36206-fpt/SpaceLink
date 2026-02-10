import React, { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";

// --- TYPES ---
interface Product {
    id: number;
    category_id: number;
    name: string;
    description: string;
    content: string;
    category: string;
    rating: number; // Lấy rating từ DB
    price: number;
    sale_price: number;
}

interface Variant {
    id: number;
    product_id: number;
    sku: string;
    price: number;
    sale_price: number;
    quantity: number;
    ram: string;
    rom: string;
    color: string;
    image: string;
}

interface ProductImage {
    id: number;
    product_id: number;
    image_path: string;
    is_primary: boolean;
}

interface Review {
    id: number;
    product_id: number;
    user_name: string;
    rating: number;
    comment: string;
    created_at: string;
    avatar?: string;
}

interface RelatedProduct extends Product {
    displayImage: string;
}

// --- STYLES ---
const customStyles = `
  .product-image-container { background: #f8f9fa; border-radius: 12px; overflow: hidden; position: relative; cursor: pointer; }
  .product-image { transition: transform 0.3s ease; }
  .product-image:hover { transform: scale(1.05); }
  .variant-btn { min-width: 70px; border: 1px solid #dee2e6; transition: all 0.2s; }
  .variant-btn.active { border-color: #0d6efd; background-color: #e7f1ff; color: #0d6efd; font-weight: bold; }
  .color-dot { width: 20px; height: 20px; border-radius: 50%; display: inline-block; border: 1px solid #ddd; }
  .nav-tabs .nav-link { border: none; color: #666; font-weight: 600; padding: 15px 20px; border-bottom: 3px solid transparent; }
  .nav-tabs .nav-link.active { color: #0d6efd; border-bottom: 3px solid #0d6efd; background: transparent; }
  .card-related { transition: all 0.3s ease; border: 1px solid #eee; }
  .card-related:hover { box-shadow: 0 10px 20px rgba(0,0,0,0.1); transform: translateY(-5px); border-color: #cce5ff; }
  .review-avatar { width: 50px; height: 50px; object-fit: cover; border-radius: 50%; }
`;

const ProductDetailPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();

    // --- STATE ---
    const [product, setProduct] = useState<Product | null>(null);
    const [variants, setVariants] = useState<Variant[]>([]);
    const [images, setImages] = useState<ProductImage[]>([]);
    const [reviews, setReviews] = useState<Review[]>([]);
    const [relatedProducts, setRelatedProducts] = useState<RelatedProduct[]>([]);
    const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
    const [quantity, setQuantity] = useState(1);
    const [activeTab, setActiveTab] = useState("article");
    const [isLoading, setIsLoading] = useState(true);

    // --- FETCH DATA ---
    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const pId = Number(id);
                const [prodRes, varRes, imgRes, reviewRes] = await Promise.all([
                    fetch("http://localhost:3000/products"),
                    fetch("http://localhost:3000/product_variants"),
                    fetch("http://localhost:3000/product_images"),
                    fetch(`http://localhost:3000/reviews?product_id=${pId}`)
                ]);

                const prodData = await prodRes.json();
                const varData = await varRes.json();
                const imgData = await imgRes.json();
                const reviewData = await reviewRes.json();

                const foundProduct = prodData.find((p: any) => p.id === pId);
                if (!foundProduct) { setIsLoading(false); return; }
                setProduct(foundProduct);

                const foundVariants = varData.filter((v: any) => v.product_id === pId);
                setVariants(foundVariants);
                if (foundVariants.length > 0) setSelectedVariant(foundVariants[0]);

                setImages(imgData.filter((i: any) => i.product_id === pId));
                setReviews(reviewData);

                // --- LOGIC SẢN PHẨM LIÊN QUAN ---
                const related = prodData
                    .filter((p: any) => p.category_id === foundProduct.category_id && p.id !== pId)
                    .slice(0, 4);

                const relatedWithImages = related.map((p: any) => {
                    const thumb = imgData.find((i: any) => i.product_id === p.id && i.is_primary);
                    return { ...p, displayImage: thumb ? thumb.image_path : 'https://via.placeholder.com/300' };
                });

                setRelatedProducts(relatedWithImages);

            } catch (error) { console.error("Lỗi:", error); }
            finally { setIsLoading(false); }
        };

        if (id) fetchData();
        window.scrollTo(0, 0);
    }, [id]);

    // --- LOGIC VARIANT ---
    const uniqueRams = useMemo(() => Array.from(new Set(variants.map(v => v.ram))), [variants]);
    const uniqueRoms = useMemo(() => Array.from(new Set(variants.map(v => v.rom))), [variants]);
    const uniqueColors = useMemo(() => Array.from(new Set(variants.map(v => v.color))), [variants]);

    const findBestMatch = (targetRam: string, targetRom: string, targetColor: string) => {
        let match = variants.find(v => v.ram === targetRam && v.rom === targetRom && v.color === targetColor);
        if (!match) match = variants.find(v => v.ram === targetRam && v.rom === targetRom);
        if (!match) match = variants.find(v => v.ram === targetRam);
        return match;
    };

    const handleRamChange = (newRam: string) => {
        if (!selectedVariant) return;
        const match = findBestMatch(newRam, selectedVariant.rom, selectedVariant.color);
        if (match) setSelectedVariant(match);
    };
    const handleRomChange = (newRom: string) => {
        if (!selectedVariant) return;
        let match = variants.find(v => v.rom === newRom && v.ram === selectedVariant.ram && v.color === selectedVariant.color);
        if (!match) match = variants.find(v => v.rom === newRom && v.ram === selectedVariant.ram);
        if (!match) match = variants.find(v => v.rom === newRom);
        if (match) setSelectedVariant(match);
    };
    const handleColorChange = (newColor: string) => {
        if (!selectedVariant) return;
        let match = variants.find(v => v.color === newColor && v.ram === selectedVariant.ram && v.rom === selectedVariant.rom);
        if (!match) match = variants.find(v => v.color === newColor);
        if (match) setSelectedVariant(match);
    };

    // --- RENDER ---
    const displayImage = selectedVariant?.image || images.find(i => i.is_primary)?.image_path || "";
    const currentPrice = selectedVariant?.sale_price || 0;
    const oldPrice = selectedVariant?.price || 0;
    const discountPercent = oldPrice > 0 ? Math.round(((oldPrice - currentPrice) / oldPrice) * 100) : 0;
    const averageRating = reviews.length > 0 ? (reviews.reduce((sum, rev) => sum + rev.rating, 0) / reviews.length).toFixed(1) : (product?.rating || 0);

    if (isLoading) return <div className="text-center py-5">Loading...</div>;
    if (!product || !selectedVariant) return <div className="text-center py-5">Không tìm thấy sản phẩm</div>;

    return (
        <div className="bg-light min-vh-100 font-sans">
            <style>{customStyles}</style>

            {/* ... Phần Breadcrumb và Product Info giữ nguyên ... */}
            <div className="container py-3">
                <nav aria-label="breadcrumb">
                    <ol className="breadcrumb mb-0">
                        <li className="breadcrumb-item"><Link to="/" className="text-decoration-none text-muted">Trang chủ</Link></li>
                        <li className="breadcrumb-item"><span className="text-muted">{product.category}</span></li>
                        <li className="breadcrumb-item active text-dark">{product.name}</li>
                    </ol>
                </nav>
            </div>

            <div className="container mb-5">
                <div className="card shadow-sm border-0 rounded-4 overflow-hidden mb-4">
                    <div className="card-body p-0">
                        <div className="row g-0">
                            <div className="col-lg-5 p-4 bg-white d-flex flex-column align-items-center">
                                <div className="product-image-container w-100 text-center p-3 mb-3">
                                    <img src={displayImage} className="img-fluid product-image" alt={product.name} style={{ maxHeight: '450px', objectFit: 'contain' }} />
                                    {discountPercent > 0 && <span className="position-absolute top-0 start-0 m-3 badge bg-danger px-3 py-2 rounded-pill shadow-sm">-{discountPercent}%</span>}
                                </div>
                                <div className="d-flex gap-2 justify-content-center overflow-auto w-100">
                                    {images.map((img) => (
                                        <img key={img.id} src={img.image_path} className={`rounded border ${displayImage === img.image_path ? 'border-primary' : ''}`} style={{ width: '60px', height: '60px', objectFit: 'cover', cursor: 'pointer' }} />
                                    ))}
                                </div>
                            </div>
                            <div className="col-lg-7 p-4 p-lg-5 border-start">
                                <h1 className="h2 fw-bold mb-2 text-dark">{product.name}</h1>
                                <div className="d-flex align-items-center mb-3">
                                    <div className="text-warning small me-2">
                                        {[...Array(5)].map((_, i) => <i key={i} className={`fas fa-star ${i < Math.round(Number(averageRating)) ? "" : "text-muted opacity-25"}`} />)}
                                    </div>
                                    <span className="text-muted small border-start ps-2">{reviews.length} đánh giá</span>
                                </div>
                                <div className="bg-light p-3 rounded-3 mb-4 d-flex align-items-end">
                                    <span className="text-danger h3 fw-bold mb-0 me-3">{currentPrice.toLocaleString('vi-VN')}₫</span>
                                    {oldPrice > currentPrice && <del className="text-muted fs-6 mb-1">{oldPrice.toLocaleString('vi-VN')}₫</del>}
                                </div>
                                {/* Options RAM/ROM/Color */}
                                {uniqueRams.length > 0 && <div className="mb-3"><label className="fw-bold mb-2 small text-muted">RAM</label><div className="d-flex gap-2">{uniqueRams.map(ram => <button key={ram} className={`btn btn-sm variant-btn ${selectedVariant.ram === ram ? 'active' : 'bg-white'}`} onClick={() => handleRamChange(ram)}>{ram}</button>)}</div></div>}
                                {uniqueRoms.length > 0 && <div className="mb-3"><label className="fw-bold mb-2 small text-muted">Bộ nhớ</label><div className="d-flex gap-2">{uniqueRoms.map(rom => <button key={rom} className={`btn btn-sm variant-btn ${selectedVariant.rom === rom ? 'active' : 'bg-white'}`} onClick={() => handleRomChange(rom)}>{rom}</button>)}</div></div>}
                                {uniqueColors.length > 0 && <div className="mb-4"><label className="fw-bold mb-2 small text-muted">Màu</label><div className="d-flex gap-2">{uniqueColors.map(color => <button key={color} className={`btn btn-sm variant-btn ${selectedVariant.color === color ? 'active' : 'bg-white'}`} onClick={() => handleColorChange(color)}>{color}</button>)}</div></div>}
                                <div className="d-flex gap-3 pt-3 border-top">
                                    <div className="input-group" style={{ width: '130px' }}>
                                        <button className="btn btn-outline-secondary" onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                                        <input className="form-control text-center bg-white" value={quantity} readOnly />
                                        <button className="btn btn-outline-secondary" onClick={() => setQuantity(quantity + 1)}>+</button>
                                    </div>
                                    <button className="btn btn-primary flex-grow-1" disabled={selectedVariant.quantity === 0}>{selectedVariant.quantity > 0 ? "Mua Ngay" : "Hết hàng"}</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- TABS --- */}
                <div className="bg-white rounded-4 shadow-sm p-4 mb-5">
                    <ul className="nav nav-tabs mb-4">
                        <li className="nav-item"><button className={`nav-link ${activeTab === 'article' ? 'active' : ''}`} onClick={() => setActiveTab('article')}>Bài viết</button></li>
                        <li className="nav-item"><button className={`nav-link ${activeTab === 'specs' ? 'active' : ''}`} onClick={() => setActiveTab('specs')}>Thông số</button></li>
                        <li className="nav-item"><button className={`nav-link ${activeTab === 'reviews' ? 'active' : ''}`} onClick={() => setActiveTab('reviews')}>Đánh giá ({reviews.length})</button></li>
                    </ul>
                    <div className="tab-content">
                        {activeTab === 'article' && <div className="lh-lg" dangerouslySetInnerHTML={{ __html: product.content || `<p>${product.description}</p>` }} />}
                        {activeTab === 'specs' && <table className="table table-bordered"><tbody><tr><th>RAM</th><td>{selectedVariant.ram}</td></tr><tr><th>ROM</th><td>{selectedVariant.rom}</td></tr></tbody></table>}
                        {activeTab === 'reviews' && reviews.map(r => <div key={r.id} className="border-bottom pb-2 mb-2"><div className="fw-bold">{r.user_name}</div><div className="text-warning small">{r.rating} ★</div><p>{r.comment}</p></div>)}
                    </div>
                </div>

                {/* --- PHẦN 3: SẢN PHẨM LIÊN QUAN (ĐÃ SỬA SAO THEO DB) --- */}
                <div className="related-products-section">
                    <div className="d-flex justify-content-between align-items-center mb-4">
                        <h3 className="fw-bold mb-0 border-start border-4 border-primary ps-3">Sản phẩm liên quan</h3>
                        <Link to="/" className="text-decoration-none small fw-bold">Xem tất cả <i className="fas fa-arrow-right"></i></Link>
                    </div>

                    {relatedProducts.length > 0 ? (
                        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-4 g-4">
                            {relatedProducts.map((p) => {
                                const discount = p.price > p.sale_price ? Math.round(((p.price - p.sale_price) / p.price) * 100) : 0;

                                // Lấy rating từ DB của sản phẩm liên quan
                                const ratingValue = p.rating || 5;

                                return (
                                    <div className="col" key={p.id}>
                                        <div className="card h-100 border-0 shadow-sm card-related bg-white rounded-3">
                                            <div className="position-relative overflow-hidden p-3 text-center">
                                                <Link to={`/product/${p.id}`}>
                                                    <img src={p.displayImage} className="card-img-top img-fluid" alt={p.name} style={{ height: '200px', objectFit: 'contain' }} />
                                                </Link>
                                                {discount > 0 && <span className="position-absolute top-0 start-0 m-2 badge bg-danger rounded-pill shadow-sm">-{discount}%</span>}
                                            </div>

                                            <div className="card-body pt-0">
                                                <div className="small text-muted mb-1 text-uppercase" style={{ fontSize: '11px' }}>{p.category}</div>
                                                <h6 className="card-title fw-bold text-truncate mb-2">
                                                    <Link to={`/product/${p.id}`} className="text-decoration-none text-dark stretched-link">
                                                        {p.name}
                                                    </Link>
                                                </h6>

                                                <div className="d-flex align-items-center justify-content-between">
                                                    <div>
                                                        <div className="text-danger fw-bold">{p.sale_price.toLocaleString()}₫</div>
                                                        {discount > 0 && <del className="text-muted small" style={{ fontSize: '12px' }}>{p.price.toLocaleString()}₫</del>}
                                                    </div>
                                                    <div className="btn btn-sm btn-light rounded-circle"><i className="fas fa-cart-plus text-primary"></i></div>
                                                </div>

                                                {/* --- HIỂN THỊ SAO TỪ DB --- */}
                                                <div className="mt-2 text-warning small" style={{ fontSize: '12px' }}>
                                                    {[...Array(5)].map((_, i) => (
                                                        <i
                                                            key={i}
                                                            // Logic: Nếu index < rating thì sao vàng, ngược lại sao xám
                                                            className={`fas fa-star ${i < Math.round(ratingValue) ? "" : "text-muted opacity-25"}`}
                                                        />
                                                    ))}
                                                    <span className="text-muted ms-1">({p.rating}/5)</span>
                                                </div>
                                                {/* --------------------------- */}
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-5 bg-white rounded-4 shadow-sm">
                            <p className="text-muted mb-0">Không có sản phẩm liên quan nào.</p>
                        </div>
                    )}
                </div>

            </div>
        </div>
    );
};

export default ProductDetailPage;
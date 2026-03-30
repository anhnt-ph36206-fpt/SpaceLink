import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWishlist } from '../context/WishlistContext';
import ProductCard from '../components/common/ProductCard';
import { toast } from 'react-toastify';

const WishlistPage: React.FC = () => {
    const { items, loading, removeFromWishlist } = useWishlist();
    const navigate = useNavigate();

    const imgUrl = (imgObj: any) => {
        if (!imgObj) return '';
        return imgObj.image_url || `http://localhost:8000/storage/${imgObj.image_path}`;
    };

    const handleAddToCart = (product: any) => {
        // Direct to product detail to choose variant if it has variants.
        navigate(`/product/${product.id}`);
        toast.info('Vui lòng chọn phân loại sản phẩm trước khi thêm vào giỏ hàng.');
    };

    return (
        <div className="bg-light min-vh-100 pb-5">
            {/* Breadcrumb */}
            <div className="container py-3">
                <nav>
                    <ol className="breadcrumb mb-0">
                        <li className="breadcrumb-item">
                            <Link to="/" className="text-decoration-none text-muted">Trang chủ</Link>
                        </li>
                        <li className="breadcrumb-item active">Sản phẩm yêu thích</li>
                    </ol>
                </nav>
            </div>

            <div className="container">
                <div className="card border-0 shadow-sm p-4 p-md-5" style={{ borderRadius: 16 }}>
                    <div className="d-flex align-items-center justify-content-between mb-4 border-bottom pb-3">
                        <h2 className="fw-bold mb-0 text-dark">
                            <i className="fas fa-heart text-primary me-3"></i>
                            Sản phẩm yêu thích
                        </h2>
                        <span className="text-muted fw-bold">({items.length} sản phẩm)</span>
                    </div>

                    {loading ? (
                        <div className="text-center py-5">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Đang tải...</span>
                            </div>
                        </div>
                    ) : items.length === 0 ? (
                        <div className="text-center py-5">
                            <i className="fas fa-heart-broken fa-4x text-muted mb-3 opacity-50"></i>
                            <h4 className="text-muted mb-4">Bạn chưa có sản phẩm yêu thích nào</h4>
                            <Link to="/shop" className="btn btn-primary px-4 py-2" style={{ borderRadius: 12 }}>
                                Tiếp tục mua sắm
                            </Link>
                        </div>
                    ) : (
                        <div className="row g-4">
                            {items.map((item, index) => {
                                const p = item.product;
                                // find primary image
                                const primaryImg = p.images?.find((i: any) => i.is_primary) || p.images?.[0];

                                const productProp = {
                                    id: String(p.id),
                                    name: p.name,
                                    image: imgUrl(primaryImg),
                                    price: p.sale_price || p.price,
                                    oldPrice: p.sale_price ? p.price : undefined,
                                    category: p.category?.name,
                                    isSale: !!p.sale_price,
                                    isNew: p.is_featured,
                                };

                                return (
                                    <ProductCard
                                        key={item.id}
                                        product={productProp}
                                        index={index}
                                        onAddToCart={(prod) => handleAddToCart(prod)}
                                        actionNode={
                                            <button 
                                                onClick={() => removeFromWishlist(p.id)}
                                                className="btn btn-danger btn-sm"
                                                style={{ 
                                                    width: 32, height: 32, borderRadius: '50%', padding: 0,
                                                    boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
                                                }}
                                                title="Xóa khỏi yêu thích"
                                            >
                                                <i className="fas fa-times"></i>
                                            </button>
                                        }
                                    />
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default WishlistPage;

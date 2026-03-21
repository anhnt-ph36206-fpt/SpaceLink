import React from 'react';
import { Link } from 'react-router-dom';
import { useCompare } from '../../context/CompareContext';
import { toast } from 'react-toastify';

const formatPrice = (value: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(value);

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
    const { addToCompare, removeFromCompare, isInCompare, compareList } = useCompare();
    const inCompare = isInCompare(product.id);
    const isFull = compareList.length >= 4 && !inCompare;
    const delayTime = (index % 4) * 0.1 + 0.1;

    const handleCompareToggle = () => {
        if (inCompare) {
            removeFromCompare(product.id);
            toast.info(`Đã xóa "${product.name}" khỏi so sánh`);
        } else {
            const success = addToCompare({
                id: product.id,
                name: product.name,
                image: product.image,
                price: product.price,
                oldPrice: product.oldPrice,
                category: product.category,
                rating: product.rating,
            });
            if (!success) toast.warning('Chỉ có thể so sánh tối đa 4 sản phẩm!');
            else toast.success(`Đã thêm "${product.name}" vào so sánh`);
        }
    };

    return (
        <div className="col-6 col-sm-6 col-md-4 col-lg-3">
            <style>{`
                .pc-card { border-radius: 12px; overflow: hidden; background: #fff;
                    border: 1px solid #eee; transition: transform 0.28s ease, box-shadow 0.28s ease;
                    display: flex; flex-direction: column; height: 100%; }
                .pc-card:hover { transform: translateY(-6px); box-shadow: 0 12px 36px rgba(0,0,0,0.13) !important; border-color: transparent; }
                .pc-img-wrap { overflow: hidden; background: #fafafa; height: 180px; display: flex; align-items: center; justify-content: center; }
                .pc-img-wrap img { transition: transform 0.38s ease; max-height: 160px; object-fit: contain; width: 100%; padding: 8px; }
                .pc-card:hover .pc-img-wrap img { transform: scale(1.08); }
                .pc-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.12);
                    display: flex; align-items: center; justify-content: center;
                    opacity: 0; transition: opacity 0.28s ease; }
                .pc-card:hover .pc-overlay { opacity: 1; }
                .pc-eye-btn { width: 38px; height: 38px; border-radius: 50%; background: #fff;
                    border: none; display: flex; align-items: center; justify-content: center;
                    color: var(--bs-primary); font-size: 1rem; cursor: pointer;
                    transition: background 0.2s, transform 0.2s;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.18); }
                .pc-eye-btn:hover { background: var(--bs-primary); color: #fff; transform: scale(1.12); }
                .pc-add-btn { width: 100%; border: none; border-radius: 8px; padding: 8px 0;
                    background: var(--bs-primary); color: #fff;
                    font-family: 'Roboto', sans-serif; font-weight: 600; font-size: 0.82rem;
                    cursor: pointer; transition: background 0.2s, transform 0.15s;
                    display: flex; align-items: center; justify-content: center; gap: 6px; }
                .pc-add-btn:hover { filter: brightness(1.1); transform: scale(1.02); }
                .pc-cmp-btn { width: 100%; border: 1.5px solid #dee2e6; border-radius: 8px;
                    padding: 6px 0; background: #fff; font-size: 0.76rem;
                    font-family: 'Roboto', sans-serif; font-weight: 500; color: #6c757d;
                    cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; gap: 5px; }
                .pc-cmp-btn:hover:not(:disabled) { border-color: var(--bs-primary); color: var(--bs-primary); background: #fff8f0; }
                .pc-cmp-btn.active { border-color: #ffc107; background: #fff8e1; color: #856404; }
                .pc-badge { position: absolute; top: 10px; right: 10px; font-size: 0.68rem;
                    font-weight: 700; padding: 3px 10px; border-radius: 20px; z-index: 2; }
            `}</style>

            <div className="pc-card wow fadeInUp" data-wow-delay={`${delayTime}s`}>
                {/* ── Image area ── */}
                <div className="pc-img-wrap position-relative">
                    <Link to={`/product/${product.id}`} className="d-block h-100 w-100">
                        <img
                            src={product.image || undefined}
                            alt={product.name}
                            onError={e => { (e.target as HTMLImageElement).src = '/assets/client/img/no-image.png' }}
                        />
                    </Link>

                    {/* Hover overlay với nút xem nhanh */}
                    <Link to={`/product/${product.id}`} className="pc-overlay">
                        <button className="pc-eye-btn" title="Xem chi tiết">
                            <i className="fa fa-eye" />
                        </button>
                    </Link>

                    {/* Badges */}
                    {product.isSale && (
                        <span className="pc-badge bg-primary text-white">Sale</span>
                    )}
                    {product.isNew && !product.isSale && (
                        <span className="pc-badge bg-success text-white">New</span>
                    )}
                </div>

                {/* ── Content ── */}
                <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', flex: 1, gap: 6 }}>
                    {/* Category */}
                    <span className="text-muted text-uppercase" style={{ fontSize: '0.7rem', fontFamily: "'Roboto', sans-serif", letterSpacing: '0.05em' }}>
                        {product.category || 'Sản phẩm'}
                    </span>

                    {/* Name */}
                    <Link
                        to={`/product/${product.id}`}
                        className="text-decoration-none text-dark fw-semibold"
                        title={product.name}
                        style={{
                            fontFamily: "'Roboto', sans-serif", fontSize: '0.88rem', lineHeight: 1.4,
                            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                        }}
                    >
                        {product.name}
                    </Link>

                    {/* Price */}
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, flexWrap: 'wrap' }}>
                        <span className="fw-bold text-danger" style={{ fontFamily: "'Roboto', sans-serif", fontSize: '0.95rem' }}>
                            {formatPrice(product.price)}
                        </span>
                        {product.oldPrice && product.oldPrice > product.price && (
                            <del className="text-muted" style={{ fontSize: '0.76rem', fontFamily: "'Roboto', sans-serif" }}>
                                {formatPrice(product.oldPrice)}
                            </del>
                        )}
                    </div>

                    {/* ── Action buttons ── */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 'auto', paddingTop: 8 }}>
                        <button className="pc-add-btn" onClick={() => onAddToCart && onAddToCart(product)}>
                            <i className="fas fa-shopping-bag" style={{ fontSize: '0.8rem' }} />
                            Thêm vào giỏ
                        </button>

                        <button
                            className={`pc-cmp-btn ${inCompare ? 'active' : ''}`}
                            onClick={handleCompareToggle}
                            disabled={isFull}
                            title={isFull ? 'Đã đủ 4 sản phẩm so sánh' : inCompare ? 'Xóa khỏi so sánh' : 'So sánh'}
                        >
                            <i className={`fas fa-${inCompare ? 'check-circle' : 'balance-scale'}`} style={{ fontSize: '0.78rem' }} />
                            {inCompare ? 'Đang so sánh' : isFull ? 'Đã đủ 4' : 'So sánh'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductCard;
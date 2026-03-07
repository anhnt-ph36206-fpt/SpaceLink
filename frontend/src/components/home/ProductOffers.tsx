import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { axiosInstance } from '../../api/axios';

interface OfferItem {
    id: number;
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
                const res = await axiosInstance.get('/products', { params: { per_page: 20 } });
                const products = res.data?.data || [];

                const processed: OfferItem[] = products
                    .filter((p: any) => p.sale_price && p.sale_price < p.price)
                    .map((p: any) => {
                        // image field is already resolved by backend in new ProductCollection
                        const imgUrl = p.image
                            || (p.images?.[0]?.image_url)
                            || (p.images?.[0]?.image_path ? `http://localhost:8000/storage/${p.images[0].image_path}` : '');
                        const discount = Math.round(((p.price - p.sale_price) / p.price) * 100);
                        return {
                            id: p.id,
                            name: p.name,
                            description: p.description || 'Sở hữu ngay siêu phẩm công nghệ với mức giá ưu đãi nhất.',
                            image: imgUrl,
                            discountPercent: discount,
                            // category is now an object {id, name}
                            category: typeof p.category === 'object' ? (p.category?.name || '') : (p.category || ''),
                        };
                    })
                    .sort((a: any, b: any) => b.discountPercent - a.discountPercent)
                    .slice(0, 2);

                setOffers(processed);
            } catch (error) {
                console.error('Lỗi tải Offers:', error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, []);

    if (isLoading) return null;
    if (offers.length < 2) return null;

    return (
        <div className="container-fluid bg-light py-5">
            <div className="container">
                <div className="row g-4">
                    {/* Offer 1 */}
                    <div className="col-lg-6">
                        <div className="position-relative bg-white rounded-4 shadow-sm border p-4 h-100 d-flex align-items-center justify-content-between overflow-hidden">
                            <div style={{ zIndex: 2, maxWidth: '60%' }}>
                                <span className="badge bg-primary mb-3 px-3 py-2 rounded-pill text-uppercase">
                                    {offers[0].category}
                                </span>
                                <h3 className="fw-bold text-dark mb-2 text-truncate">{offers[0].name}</h3>
                                <p className="text-muted mb-3 small">{offers[0].description}</p>
                                <h2 className="display-5 fw-bold text-danger mb-4">
                                    -{offers[0].discountPercent}% <span className="fs-4 text-dark fw-normal">Off</span>
                                </h2>
                                <Link to={`/product/${offers[0].id}`} className="btn btn-outline-primary rounded-pill py-2 px-4 fw-bold">
                                    Xem Ngay <i className="fas fa-arrow-right ms-2" />
                                </Link>
                            </div>
                            {offers[0].image && (
                                <div className="text-center" style={{ width: '40%' }}>
                                    <img src={offers[0].image} className="img-fluid" alt={offers[0].name} style={{ maxHeight: 250, objectFit: 'contain', transition: 'transform .5s' }} />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Offer 2 */}
                    <div className="col-lg-6">
                        <div className="position-relative bg-dark text-white rounded-4 shadow-sm border p-4 h-100 d-flex align-items-center justify-content-between overflow-hidden">
                            <div style={{ zIndex: 2, maxWidth: '60%' }}>
                                <span className="badge bg-warning text-dark mb-3 px-3 py-2 rounded-pill text-uppercase">Deal Sốc</span>
                                <h3 className="fw-bold text-white mb-2 text-truncate">{offers[1].name}</h3>
                                <p className="text-white-50 mb-3 small">Cơ hội duy nhất trong năm. Số lượng có hạn.</p>
                                <h2 className="display-5 fw-bold text-warning mb-4">
                                    -{offers[1].discountPercent}% <span className="fs-4 text-white fw-normal">Off</span>
                                </h2>
                                <Link to={`/product/${offers[1].id}`} className="btn btn-light rounded-pill py-2 px-4 fw-bold text-dark">
                                    Mua Ngay <i className="fas fa-shopping-cart ms-2" />
                                </Link>
                            </div>
                            {offers[1].image && (
                                <div className="text-center" style={{ width: '40%' }}>
                                    <img src={offers[1].image} className="img-fluid" alt={offers[1].name} style={{ maxHeight: 250, objectFit: 'contain' }} />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductOffers;
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { axiosInstance } from "../../api/axios";
import { useCart } from "../../context/CartContext";
import ProductCard from "../common/ProductCard";
import VariantSelectorModal from "../product/VariantSelectorModal";
import { toast } from "react-toastify";

interface ApiProduct {
    id: number;
    name: string;
    price: number;
    sale_price?: number | null;
    quantity?: number;
    is_featured: boolean;
    is_active: boolean;
    image?: string | null;
    images?: { id: number; image_path: string; image_url?: string; is_primary: boolean }[];
    category?: { id: number; name: string } | null;
    brand?: { id: number; name: string } | null;
    variants?: { id: number; price: number; sale_price?: number; quantity: number }[];
}

interface ProductDisplay {
    id: number;
    name: string;
    categoryId: number;
    categoryName: string;
    image: string;
    price: number;       // display price
    oldPrice: number;    // original
    isSale: boolean;
    isFeatured: boolean;
    stock: number;
    variantId?: number; // Thêm variantId để gọi API
    rawProduct: any;    // Cất lại object gốc để truyền vào Modal
}



// Lấy URL ảnh từ nhiều dạng API trả về
const resolveImage = (p: ApiProduct): string => {
    // Ưu tiên field image (đã được xử lý bên backend)
    if (p.image) return p.image;
    // Fallback: tìm trong mảng images
    const primary = p.images?.find(i => i.is_primary) || p.images?.[0];
    if (!primary) return '';
    return primary.image_url || `http://localhost:8000/storage/${primary.image_path}`;
};

const ProductTabs: React.FC = () => {
    const { addToCart } = useCart();
    const [activeTab, setActiveTab] = useState<'all' | 'featured' | number>('all');
    const [products, setProducts] = useState<ProductDisplay[]>([]);
    const [categories, setCategories] = useState<{ id: number; name: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<any>(null);
    const [quickAddLoading, setQuickAddLoading] = useState(false);

    useEffect(() => {
        const fetchAll = async () => {
            setLoading(true);
            try {
                const res = await axiosInstance.get('/products');
                const rawProducts: ApiProduct[] = res.data?.data || [];

                // Trích danh mục độc nhất từ danh sách sản phẩm
                const catMap = new Map<number, string>();
                rawProducts.forEach(p => {
                    if (p.category?.id) catMap.set(p.category.id, p.category.name);
                });
                setCategories(Array.from(catMap.entries()).map(([id, name]) => ({ id, name })));

                const mapped: ProductDisplay[] = rawProducts.map(p => {
                    const displayPrice = p.sale_price && p.sale_price < p.price ? p.sale_price : p.price;
                    return {
                        id: p.id,
                        name: p.name,
                        categoryId: p.category?.id ?? 0,
                        categoryName: p.category?.name ?? '',
                        image: resolveImage(p),
                        price: displayPrice,
                        oldPrice: p.price,
                        isSale: !!(p.sale_price && p.sale_price < p.price),
                        isFeatured: p.is_featured,
                        stock: p.quantity ?? 0,
                        variantId: p.variants?.[0]?.id,
                        rawProduct: p,
                    };
                });

                setProducts(mapped);
            } catch (e) {
                console.error('Lỗi tải sản phẩm trang chủ', e);
            } finally {
                setLoading(false);
            }
        };
        fetchAll();
    }, []);

    const filtered = products.filter(p => {
        if (activeTab === 'all') return true;
        if (activeTab === 'featured') return p.isFeatured;
        return p.categoryId === activeTab;
    });

    const handleQuickAdd = async (p: ProductDisplay) => {
        const loadingToast = toast.info('Đang tải thông tin sản phẩm...', { autoClose: false });
        setQuickAddLoading(true);
        try {
            const res = await axiosInstance.get(`/products/${p.id}`);
            if (res.data?.data) {
                setSelectedProduct(res.data.data);
                setModalVisible(true);
                toast.dismiss(loadingToast);
            } else {
                toast.error('Không tìm thấy dữ liệu sản phẩm');
            }
        } catch (error) {
            console.error('Lỗi lấy chi tiết sản phẩm:', error);
            toast.error('Không thể lấy thông tin sản phẩm');
        } finally {
            toast.dismiss(loadingToast);
            setQuickAddLoading(false);
        }
    };



    const tabs = [
        { id: 'all', label: 'Tất cả' },
        { id: 'featured', label: '⭐ Nổi bật' },
        ...categories.map(c => ({ id: c.id, label: c.name })),
    ];

    return (
        <div className="container-fluid product py-5">
            <div className="container py-5">
                {/* Header */}
                <div className="d-flex justify-content-between align-items-center mb-5 flex-wrap gap-3">
                    <h1>Sản Phẩm Của Chúng Tôi</h1>
                    <div className="d-flex flex-wrap gap-2">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                className={`btn ${activeTab === tab.id ? 'btn-primary' : 'btn-outline-primary'}`}
                                onClick={() => setActiveTab(tab.id as any)}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Grid */}
                {loading ? (
                    <div className="row g-4">
                        {[...Array(8)].map((_, i) => (
                            <div className="col-6 col-md-4 col-lg-3" key={i}>
                                <div className="card border-0 shadow-sm h-100" style={{ borderRadius: 12 }}>
                                    <div style={{ height: 220, background: '#f0f0f0', borderRadius: '12px 12px 0 0' }} />
                                    <div className="card-body">
                                        <div style={{ height: 16, background: '#eee', borderRadius: 4, marginBottom: 8 }} />
                                        <div style={{ height: 20, background: '#eee', borderRadius: 4, width: '60%' }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-5">
                        <i className="fas fa-box-open fa-3x text-muted mb-3" />
                        <p className="text-muted">Không có sản phẩm nào trong danh mục này.</p>
                    </div>
                ) : (
                    <div className="row g-4">
                        {filtered.map((p, index) => (
                            <ProductCard
                                key={p.id}
                                index={index}
                                product={{
                                    id: p.id.toString(),
                                    name: p.name,
                                    image: p.image,
                                    price: p.price,
                                    oldPrice: p.oldPrice,
                                    category: p.categoryName,
                                    isSale: p.isSale,
                                    rating: 5, // Default rating or pull from API if available
                                    isNew: false, // Update if available in API
                                }}
                                onAddToCart={() => handleQuickAdd(p)}
                            />
                        ))}
                    </div>
                )}

                {/* View all */}
                <div className="text-center mt-5">
                    <Link to="/shop" className="btn btn-outline-primary rounded-pill px-5 py-2">
                        Xem tất cả sản phẩm <i className="fas fa-arrow-right ms-2" />
                    </Link>
                </div>
            </div>
            {/* Modal chọn biến thể */}
            <VariantSelectorModal
                visible={modalVisible}
                product={selectedProduct}
                onCancel={() => setModalVisible(false)}
                onAddToCart={(vId, q) => addToCart(vId, q)}
            />
        </div>
    );
};

export default ProductTabs;
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Spin } from "antd";
import { axiosInstance } from "../../api/axios";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";

export interface ReviewItem {
    id: number;
    rating: number;
    content?: string;
    admin_reply?: string;
    replied_at?: string;
    created_at: string;
    user?: { id: number; fullname: string };
}

export interface ReviewStats {
    average_rating: number;
    total_reviews: number;
}

interface ProductReviewsProps {
    productId: string;
    onStatsChange?: (stats: ReviewStats) => void;
}

const ProductReviews: React.FC<ProductReviewsProps> = ({ productId, onStatsChange }) => {
    const { isAuthenticated } = useAuth();

    // ── Reviews state ──────────────────────────────────────────────────
    const [reviews, setReviews] = useState<ReviewItem[]>([]);
    const [reviewStats, setReviewStats] = useState<ReviewStats>({ average_rating: 0, total_reviews: 0 });
    const [reviewPage, setReviewPage] = useState(1);
    const [reviewLastPage, setReviewLastPage] = useState(1);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    // Eligible order_item for submitting a review (null = not purchased/already reviewed)
    const [eligibleOrderItemId, setEligibleOrderItemId] = useState<number | null | 'loading'>('loading');
    // Write form
    const [writeRating, setWriteRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [writeContent, setWriteContent] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // ── Fetch reviews ──────────────────────────────────────────────────
    const fetchReviews = (page = 1) => {
        if (!productId) return;
        setReviewsLoading(true);
        axiosInstance.get(`/products/${productId}/reviews`, { params: { page } })
            .then(res => {
                const data = res.data.data?.data ?? [];
                setReviews(data);
                setReviewLastPage(res.data.data?.last_page ?? 1);
                
                const stats = res.data.stats ?? { average_rating: 0, total_reviews: 0 };
                setReviewStats(stats);
                if (onStatsChange) {
                    onStatsChange(stats);
                }
            })
            .catch(() => { })
            .finally(() => setReviewsLoading(false));
    };

    useEffect(() => { fetchReviews(reviewPage); }, [productId, reviewPage]);

    // ── Check if user can review this product ──────────────────────────
    useEffect(() => {
        if (!isAuthenticated || !productId) {
            setEligibleOrderItemId(null);
            return;
        }
        setEligibleOrderItemId('loading');
        axiosInstance.get('/client/orders')
            .then(res => {
                const orders: any[] = res.data.data?.data ?? res.data.data ?? [];
                let found: number | null = null;
                for (const order of orders) {
                    if (!['delivered', 'completed'].includes(order.status)) continue;
                    const items: any[] = order.order_items ?? order.items ?? [];
                    const item = items.find((i: any) =>
                        String(i.product_id) === String(productId) && !i.is_reviewed
                    );
                    if (item) { found = item.id; break; }
                }
                setEligibleOrderItemId(found);
            })
            .catch(() => setEligibleOrderItemId(null));
    }, [isAuthenticated, productId]);

    // ── Submit review ──────────────────────────────────────────────────
    const handleSubmitReview = async () => {
        if (!eligibleOrderItemId || eligibleOrderItemId === 'loading') return;
        setSubmitting(true);
        try {
            await axiosInstance.post('/client/reviews', {
                order_item_id: eligibleOrderItemId,
                rating: writeRating,
                content: writeContent || null,
            });
            toast.success('Cảm ơn bạn đã đánh giá sản phẩm!');
            setEligibleOrderItemId(null);
            setWriteContent('');
            setWriteRating(5);
            // Refresh reviews list
            setReviewPage(1);
            fetchReviews(1);
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? 'Không thể gửi đánh giá.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div>
            {/* Stats overview */}
            <div className="row g-4 mb-5 align-items-center">
                <div className="col-auto text-center">
                    <div style={{ fontSize: 52, fontWeight: 800, lineHeight: 1, color: '#ff7a00' }}>
                        {reviewStats.average_rating > 0 ? reviewStats.average_rating.toFixed(1) : '—'}
                    </div>
                    <div className="d-flex gap-1 justify-content-center my-1">
                        {[1, 2, 3, 4, 5].map(s => (
                            <i key={s} className={`fas fa-star ${s <= Math.round(reviewStats.average_rating) ? 'text-warning' : 'text-muted'}`} style={{ fontSize: 18 }} />
                        ))}
                    </div>
                    <div className="text-muted small">{reviewStats.total_reviews} đánh giá</div>
                </div>
                <div className="col">
                    {[5, 4, 3, 2, 1].map(star => {
                        const count = reviews.filter(r => r.rating === star).length;
                        const pct = reviewStats.total_reviews > 0 ? Math.round((count / reviewStats.total_reviews) * 100) : 0;
                        return (
                            <div key={star} className="d-flex align-items-center gap-2 mb-1">
                                <span className="text-muted small" style={{ width: 12 }}>{star}</span>
                                <i className="fas fa-star text-warning small" />
                                <div className="flex-grow-1 bg-light rounded-pill" style={{ height: 8, overflow: 'hidden' }}>
                                    <div style={{ width: `${pct}%`, height: '100%', background: '#ffc107', borderRadius: 99, transition: 'width .4s' }} />
                                </div>
                                <span className="text-muted small" style={{ width: 24 }}>{count}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Write review form */}
            <div className="card border-0 mb-4" style={{ background: '#f8f9ff', borderRadius: 12, padding: '20px 24px' }}>
                <h6 className="fw-bold mb-3"><i className="fas fa-pen me-2 text-primary" />Viết đánh giá của bạn</h6>
                {!isAuthenticated ? (
                    <p className="text-muted mb-0">
                        <Link to="/login" className="text-primary fw-bold">Đăng nhập</Link> để đánh giá sản phẩm này.
                    </p>
                ) : eligibleOrderItemId === 'loading' ? (
                    <div className="text-muted small"><Spin size="small" className="me-2" />Đang kiểm tra lịch sử mua hàng...</div>
                ) : eligibleOrderItemId === null ? (
                    <p className="text-muted mb-0 small">
                        <i className="fas fa-info-circle me-1" />
                        Bạn cần <strong>mua và nhận hàng thành công</strong> sản phẩm này để có thể đánh giá.
                    </p>
                ) : (
                    <div>
                        {/* Star picker */}
                        <div className="d-flex gap-1 mb-3">
                            {[1, 2, 3, 4, 5].map(s => (
                                <i
                                    key={s}
                                    className={`fas fa-star ${s <= (hoverRating || writeRating) ? 'text-warning' : 'text-muted'}`}
                                    style={{ fontSize: 28, cursor: 'pointer', transition: 'color .15s' }}
                                    onMouseEnter={() => setHoverRating(s)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    onClick={() => setWriteRating(s)}
                                />
                            ))}
                            <span className="ms-2 text-muted align-self-center small">
                                {['', 'Rất tệ', 'Tệ', 'Bình thường', 'Tốt', 'Xuất sắc'][hoverRating || writeRating]}
                            </span>
                        </div>
                        <textarea
                            className="form-control mb-3"
                            rows={3}
                            placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này... (tuỳ chọn)"
                            value={writeContent}
                            onChange={e => setWriteContent(e.target.value)}
                            maxLength={1000}
                            style={{ borderRadius: 10, resize: 'none' }}
                        />
                        <div className="d-flex justify-content-between align-items-center">
                            <span className="text-muted small">{writeContent.length}/1000</span>
                            <button
                                className="btn btn-primary px-4"
                                style={{ borderRadius: 8, fontWeight: 600 }}
                                onClick={handleSubmitReview}
                                disabled={submitting}
                            >
                                {submitting ? <Spin size="small" className="me-2" /> : <i className="fas fa-paper-plane me-2" />}
                                Gửi đánh giá
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Reviews list */}
            {reviewsLoading ? (
                <div className="text-center py-4"><Spin /></div>
            ) : (
                <>
                    {reviews.length === 0 ? (
                        <div className="text-center py-4 text-muted">
                            <i className="fas fa-comment-slash fa-2x mb-3" style={{ opacity: .3 }} />
                            <p className="mb-0">Chưa có đánh giá nào. Hãy là người đầu tiên!</p>
                        </div>
                    ) : (
                        <>
                            {reviews.map(review => (
                                <div key={review.id} className="border-bottom pb-4 mb-4">
                                    <div className="d-flex align-items-center gap-3 mb-2">
                                        {/* Avatar */}
                                        <div style={{
                                            width: 40, height: 40, borderRadius: '50%',
                                            background: 'linear-gradient(135deg,#0d6efd,#6610f2)',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#fff', fontWeight: 700, flexShrink: 0,
                                        }}>
                                            {(review.user?.fullname ?? 'A').charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <div className="fw-bold" style={{ fontSize: 14 }}>{review.user?.fullname ?? 'Ẩn danh'}</div>
                                            <div className="d-flex gap-1 align-items-center">
                                                {[1, 2, 3, 4, 5].map(s => (
                                                    <i key={s} className={`fas fa-star small ${s <= review.rating ? 'text-warning' : 'text-muted'}`} />
                                                ))}
                                                <span className="text-muted ms-2" style={{ fontSize: 12 }}>
                                                    {new Date(review.created_at).toLocaleDateString('vi-VN')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {review.content && (
                                        <p className="text-muted mb-2" style={{ fontSize: 14, lineHeight: 1.6 }}>{review.content}</p>
                                    )}
                                    {/* Admin reply */}
                                    {review.admin_reply && (
                                        <div style={{ background: '#fff9f2', borderLeft: '3px solid #ff7a00', borderRadius: '0 8px 8px 0', padding: '10px 14px', marginTop: 8 }}>
                                            <div className="fw-bold mb-1" style={{ fontSize: 12, color: '#ff7a00' }}>
                                                <i className="fas fa-store me-1" />Phản hồi từ Shop
                                            </div>
                                            <p className="mb-0" style={{ fontSize: 13, color: '#1a1a2e' }}>{review.admin_reply}</p>
                                        </div>
                                    )}
                                </div>
                            ))}

                            {/* Pagination */}
                            {reviewLastPage > 1 && (
                                <div className="d-flex justify-content-center gap-2 mt-2">
                                    {Array.from({ length: reviewLastPage }, (_, i) => i + 1).map(p => (
                                        <button
                                            key={p}
                                            className={`btn btn-sm ${reviewPage === p ? 'btn-primary' : 'btn-outline-secondary'}`}
                                            style={{ borderRadius: 8, width: 36 }}
                                            onClick={() => setReviewPage(p)}
                                        >
                                            {p}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </>
            )}
        </div>
    );
};

export default ProductReviews;

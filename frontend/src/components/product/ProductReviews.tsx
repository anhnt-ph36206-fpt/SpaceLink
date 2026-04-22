import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { Spin } from "antd";
import { axiosInstance } from "../../api/axios";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ReviewItem {
    id: number;
    rating: number;
    content?: string;
    admin_reply?: string;
    replied_at?: string;
    created_at: string;
    variant_info?: { attrs?: { name: string; value: string }[];[k: string]: unknown } | null;
    user?: { id: number; fullname: string; avatar?: string | null };
}

export interface ReviewStats {
    average_rating: number;
    total_reviews: number;
    star_distribution?: Record<number, number>;
}

interface ProductReviewsProps {
    productId: string;
    variants?: any[];
    onStatsChange?: (stats: ReviewStats) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const STAR_LABELS = ["", "Rất tệ", "Tệ", "Bình thường", "Tốt", "Xuất sắc"];

const formatVariant = (variantInfo: ReviewItem["variant_info"]): string => {
    if (!variantInfo) return "";
    if (Array.isArray(variantInfo.attrs) && variantInfo.attrs.length > 0) {
        const parts = (variantInfo.attrs as { value?: string | null }[])
            .filter((a) => a.value)
            .map((a) => String(a.value));
        if (parts.length > 0) return parts.join(" · ");
    }
    // flat format e.g. { "Màu sắc": "Đen" }
    const skip = ["sku", "image", "attrs"];
    const entries = Object.entries(variantInfo)
        .filter(([k, v]) => !skip.includes(k) && typeof v === "string" && v !== "")
        .map(([_, v]) => String(v));
    return entries.join(" · ");
};

const timeAgo = (dateStr: string) => {
    const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
    if (diff < 60) return "vừa xong";
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 2592000) return `${Math.floor(diff / 86400)} ngày trước`;
    return new Date(dateStr).toLocaleDateString("vi-VN");
};

// ─── Stars component ──────────────────────────────────────────────────────────

const Stars: React.FC<{ value: number; size?: number }> = ({ value, size = 14 }) => (
    <div style={{ display: "inline-flex", gap: 2 }}>
        {[1, 2, 3, 4, 5].map((s) => (
            <i
                key={s}
                className={s <= Math.round(value) ? "fas fa-star" : "far fa-star"}
                style={{ fontSize: size, color: s <= Math.round(value) ? "#f59e0b" : "#d1d5db" }}
            />
        ))}
    </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

const ProductReviews: React.FC<ProductReviewsProps> = ({ productId, variants, onStatsChange }) => {
    const { isAuthenticated } = useAuth();

    // Reviews data
    const [reviews, setReviews] = useState<ReviewItem[]>([]);
    const [reviewStats, setReviewStats] = useState<ReviewStats>({ average_rating: 0, total_reviews: 0 });
    const [reviewPage, setReviewPage] = useState(1);
    const [reviewLastPage, setReviewLastPage] = useState(1);
    const [reviewsLoading, setReviewsLoading] = useState(false);
    const [filterRating, setFilterRating] = useState<number | null>(null);
    const [filterVariant, setFilterVariant] = useState<number | null>(null);

    // Write form
    const [eligibleOrderItemId, setEligibleOrderItemId] = useState<number | null | "loading">("loading");
    const [eligibleVariantLabel, setEligibleVariantLabel] = useState<string>("");
    const [writeRating, setWriteRating] = useState(5);
    const [hoverRating, setHoverRating] = useState(0);
    const [writeContent, setWriteContent] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [showWriteForm, setShowWriteForm] = useState(false);

    // ── Fetch reviews ─────────────────────────────────────────────────────────
    const fetchReviews = useCallback((page = 1, rating?: number | null, variantId?: number | null) => {
        if (!productId) return;
        setReviewsLoading(true);
        const params: Record<string, unknown> = { page, per_page: 8 };
        if (rating) params.rating = rating;
        if (variantId) params.variant_id = variantId;
        axiosInstance
            .get(`/products/${productId}/reviews`, { params })
            .then((res) => {
                const data = res.data.data?.data ?? [];
                setReviews(data);
                setReviewLastPage(res.data.data?.last_page ?? 1);
                const stats: ReviewStats = res.data.stats ?? { average_rating: 0, total_reviews: 0 };
                setReviewStats(stats);
                onStatsChange?.(stats);
            })
            .catch(() => { })
            .finally(() => setReviewsLoading(false));
    }, [productId, onStatsChange]);

    useEffect(() => { fetchReviews(reviewPage, filterRating, filterVariant); }, [productId, reviewPage, filterRating, filterVariant]);

    const handleFilterRating = (star: number | null) => {
        if (filterRating === star) star = null;
        setFilterRating(star);
        setReviewPage(1);
    };

    const handleFilterVariant = (vId: number | null) => {
        if (filterVariant === vId) vId = null;
        setFilterVariant(vId);
        setReviewPage(1);
    };

    // ── Check eligible order item ─────────────────────────────────────────────
    useEffect(() => {
        if (!isAuthenticated || !productId) {
            setEligibleOrderItemId(null);
            return;
        }
        setEligibleOrderItemId("loading");
        axiosInstance
            .get("/client/orders")
            .then((res) => {
                const orders: any[] = res.data.data?.data ?? res.data.data ?? [];
                let found: number | null = null;
                let variantLabel = "";
                for (const order of orders) {
                    if (!["delivered", "completed"].includes(order.status)) continue;
                    const items: any[] = order.order_items ?? order.items ?? [];
                    const item = items.find(
                        (i: any) => String(i.product_id) === String(productId) && !i.is_reviewed
                    );
                    if (item) {
                        found = item.id;
                        // Build variant label from variant_info
                        variantLabel = formatVariant(item.variant_info ?? null);
                        break;
                    }
                }
                setEligibleOrderItemId(found);
                setEligibleVariantLabel(variantLabel);
            })
            .catch(() => setEligibleOrderItemId(null));
    }, [isAuthenticated, productId]);

    // ── Submit review ─────────────────────────────────────────────────────────
    const handleSubmitReview = async () => {
        if (!eligibleOrderItemId || eligibleOrderItemId === "loading") return;
        setSubmitting(true);
        try {
            await axiosInstance.post("/client/reviews", {
                order_item_id: eligibleOrderItemId,
                rating: writeRating,
                content: writeContent || null,
            });
            toast.success("🎉 Cảm ơn bạn đã đánh giá sản phẩm!");
            setEligibleOrderItemId(null);
            setEligibleVariantLabel("");
            setWriteContent("");
            setWriteRating(5);
            setShowWriteForm(false);
            setReviewPage(1);
            fetchReviews(1, filterRating);
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Không thể gửi đánh giá.");
        } finally {
            setSubmitting(false);
        }
    };

    // ─── Render ──────────────────────────────────────────────────────────────
    const { average_rating, total_reviews, star_distribution } = reviewStats;

    return (
        <div>
            <style>{`
                @keyframes rvFadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
                .rv-star-btn { cursor:pointer; transition: transform .15s; font-size:28px; }
                .rv-star-btn:hover { transform: scale(1.25); }
                .rv-filter-pill { display:inline-flex; align-items:center; gap:4px; padding:4px 14px; border-radius:999px; font-size:12.5px; font-weight:600; cursor:pointer; border:1.5px solid; transition:all .15s; }
                .rv-review-card { animation: rvFadeIn .3s ease both; }
                .rv-write-cta { background: linear-gradient(135deg,#fff0f3 0%,#fef3c7 100%); border:2px solid #fcd34d; border-radius:14px; padding:18px 22px; margin-bottom:20px; }
                .rv-write-form { background:#fff; border:1.5px solid #e5e7eb; border-radius:14px; padding:20px 24px; }
            `}</style>

            {/* ── Stats overview ── */}
            <div style={{ display: "flex", gap: 28, alignItems: "stretch", flexWrap: "wrap", marginBottom: 28 }}>
                {/* Big score */}
                <div style={{ textAlign: "center", minWidth: 100, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                    <div style={{ fontSize: 56, fontWeight: 900, lineHeight: 1, color: "#f59e0b", letterSpacing: -2 }}>
                        {average_rating > 0 ? average_rating.toFixed(1) : "—"}
                    </div>
                    <Stars value={average_rating} size={18} />
                    <div style={{ fontSize: 12, color: "#6b7280", marginTop: 6 }}>{total_reviews} đánh giá</div>
                </div>

                {/* Star distribution bars */}
                <div style={{ flex: 1, minWidth: 180 }}>
                    {[5, 4, 3, 2, 1].map((star) => {
                        const count = star_distribution?.[star] ?? reviews.filter((r) => r.rating === star).length;
                        const pct = total_reviews > 0 ? Math.round((count / total_reviews) * 100) : 0;
                        const isActive = filterRating === star;
                        return (
                            <div
                                key={star}
                                className="rv-filter-pill"
                                style={{
                                    display: "flex", alignItems: "center", gap: 6,
                                    marginBottom: 6, padding: "4px 8px",
                                    borderColor: isActive ? "#f59e0b" : "transparent",
                                    background: isActive ? "#fffbeb" : "transparent",
                                    borderRadius: 8, cursor: "pointer", width: "100%",
                                }}
                                onClick={() => handleFilterRating(isActive ? null : star)}
                            >
                                <span style={{ fontSize: 12, fontWeight: 700, color: "#374151", width: 10 }}>{star}</span>
                                <i className="fas fa-star" style={{ color: "#f59e0b", fontSize: 12 }} />
                                <div style={{ flex: 1, height: 6, background: "#f3f4f6", borderRadius: 99, overflow: "hidden" }}>
                                    <div style={{ width: `${pct}%`, height: "100%", background: "#f59e0b", borderRadius: 99, transition: "width .4s" }} />
                                </div>
                                <span style={{ fontSize: 11, color: "#9ca3af", width: 22, textAlign: "right" }}>{count}</span>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* ── Filter pills ── */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginBottom: 16 }}>
                <button
                    onClick={() => { setFilterRating(null); setFilterVariant(null); setReviewPage(1); }}
                    style={{
                        padding: "6px 16px", borderRadius: 99, fontSize: 13, fontWeight: 600, border: "1px solid", cursor: "pointer", transition: "all .2s",
                        background: (!filterRating && !filterVariant) ? "#fffbeb" : "#f8fafc",
                        borderColor: (!filterRating && !filterVariant) ? "#f59e0b" : "#e5e7eb",
                        color: (!filterRating && !filterVariant) ? "#d97706" : "#4b5563"
                    }}
                >
                    Tất cả ({total_reviews})
                </button>

                {[5, 4, 3, 2, 1].map(star => {
                    const isActive = filterRating === star;
                    const count = star_distribution?.[star] ?? 0;
                    return (
                        <button
                            key={star}
                            onClick={() => handleFilterRating(star)}
                            style={{
                                padding: "6px 16px", borderRadius: 99, fontSize: 13, fontWeight: 600, border: "1px solid", cursor: "pointer", transition: "all .2s",
                                display: "flex", alignItems: "center", gap: 4,
                                background: isActive ? "#fffbeb" : "#f8fafc",
                                borderColor: isActive ? "#f59e0b" : "#e5e7eb",
                                color: isActive ? "#d97706" : "#4b5563"
                            }}
                        >
                            {star} <i className="fas fa-star" style={{ color: "#f59e0b", fontSize: 11 }} /> ({count})
                        </button>
                    );
                })}

                {variants?.map(v => {
                    const label = v.attributes?.map((a: any) => a.value).join(" · ");
                    if (!label) return null;
                    const isActive = filterVariant === v.id;
                    return (
                        <button
                            key={v.id}
                            onClick={() => handleFilterVariant(v.id)}
                            style={{
                                padding: "6px 16px", borderRadius: 99, fontSize: 13, fontWeight: 600, border: "1px solid", cursor: "pointer", transition: "all .2s",
                                background: isActive ? "#fffbeb" : "#f8fafc",
                                borderColor: isActive ? "#f59e0b" : "#e5e7eb",
                                color: isActive ? "#d97706" : "#4b5563"
                            }}
                        >
                            {label}
                        </button>
                    );
                })}
            </div>

            {/* ── Write review CTA ── */}
            {isAuthenticated && eligibleOrderItemId !== "loading" && eligibleOrderItemId !== null && !showWriteForm && (
                <div className="rv-write-cta" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: 14.5, color: "#92400e" }}>
                            <i className="fas fa-star me-2" style={{ color: "#f59e0b" }} />
                            Bạn chưa đánh giá sản phẩm này!
                        </div>
                        {eligibleVariantLabel && (
                            <div style={{ fontSize: 12, color: "#78350f", marginTop: 4 }}>
                                Phân loại: <span style={{ background: "#fef3c7", border: "1px solid #fcd34d", borderRadius: 99, padding: "1px 10px", fontWeight: 600 }}>{eligibleVariantLabel}</span>
                            </div>
                        )}
                    </div>
                    <button
                        onClick={() => setShowWriteForm(true)}
                        style={{
                            background: "linear-gradient(135deg,#f59e0b,#d97706)", border: "none",
                            color: "#fff", borderRadius: 10, padding: "9px 22px",
                            fontWeight: 700, fontSize: 14, cursor: "pointer",
                            boxShadow: "0 4px 14px rgba(245,158,11,0.4)", transition: "all .2s",
                            display: "flex", alignItems: "center", gap: 8, whiteSpace: "nowrap",
                        }}
                    >
                        <i className="fas fa-star" />
                        Đánh giá ngay
                    </button>
                </div>
            )}

            {/* ── Write review form (expanded) ── */}
            {showWriteForm && eligibleOrderItemId && eligibleOrderItemId !== "loading" && (
                <div className="rv-write-form" style={{ marginBottom: 24 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 15, color: "#1a1d23", marginBottom: 4 }}>
                                <i className="fas fa-pen me-2" style={{ color: "#f59e0b" }} />
                                Viết đánh giá của bạn
                            </div>
                            {eligibleVariantLabel && (
                                <span style={{
                                    fontSize: 12, background: "#f0f9ff", border: "1px solid #bae6fd",
                                    color: "#0369a1", borderRadius: 99, padding: "2px 12px", fontWeight: 600,
                                }}>
                                    <i className="fas fa-tag me-1" style={{ fontSize: 10 }} />{eligibleVariantLabel}
                                </span>
                            )}
                        </div>
                        <button onClick={() => setShowWriteForm(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "#9ca3af", fontSize: 18 }}>
                            <i className="fas fa-times" />
                        </button>
                    </div>

                    {/* Star picker */}
                    <div style={{ textAlign: "center", marginBottom: 20 }}>
                        <div style={{ fontSize: 12.5, fontWeight: 600, color: "#6b7280", marginBottom: 10 }}>Mức độ hài lòng</div>
                        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 8 }}>
                            {[1, 2, 3, 4, 5].map((s) => (
                                <i
                                    key={s}
                                    className={s <= (hoverRating || writeRating) ? "fas fa-star rv-star-btn" : "far fa-star rv-star-btn"}
                                    style={{ color: s <= (hoverRating || writeRating) ? "#f59e0b" : "#d1d5db" }}
                                    onMouseEnter={() => setHoverRating(s)}
                                    onMouseLeave={() => setHoverRating(0)}
                                    onClick={() => setWriteRating(s)}
                                />
                            ))}
                        </div>
                        {(hoverRating || writeRating) > 0 && (
                            <span style={{ fontSize: 13, fontWeight: 600, color: "#f59e0b" }}>
                                {STAR_LABELS[hoverRating || writeRating]}
                            </span>
                        )}
                    </div>

                    <textarea
                        className="form-control mb-3"
                        rows={4}
                        placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này... (tuỳ chọn)"
                        value={writeContent}
                        onChange={(e) => setWriteContent(e.target.value)}
                        maxLength={1000}
                        style={{ borderRadius: 10, resize: "none", border: "1.5px solid #e5e7eb", fontSize: 14 }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "#9ca3af" }}>{writeContent.length}/1000</span>
                        <div style={{ display: "flex", gap: 8 }}>
                            <button
                                onClick={() => setShowWriteForm(false)}
                                style={{ background: "#f8fafc", border: "1.5px solid #e5e7eb", color: "#6b7280", borderRadius: 9, padding: "9px 18px", fontWeight: 600, cursor: "pointer", fontSize: 13 }}
                            >
                                Huỷ
                            </button>
                            <button
                                onClick={handleSubmitReview}
                                disabled={submitting}
                                style={{
                                    background: submitting ? "#d1d5db" : "linear-gradient(135deg,#1d4ed8,#1e3a8a)",
                                    border: "none", color: "#fff", borderRadius: 9, padding: "9px 24px",
                                    fontWeight: 700, cursor: submitting ? "not-allowed" : "pointer", fontSize: 13,
                                    display: "flex", alignItems: "center", gap: 6,
                                    boxShadow: submitting ? "none" : "0 4px 12px rgba(29,78,216,0.3)",
                                }}
                            >
                                {submitting ? <><Spin size="small" />&nbsp;Đang gửi...</> : <><i className="fas fa-paper-plane" />Gửi đánh giá</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Loading spinner */}
            {eligibleOrderItemId === "loading" && isAuthenticated && (
                <div style={{ fontSize: 12.5, color: "#9ca3af", marginBottom: 16 }}>
                    <Spin size="small" /> Đang kiểm tra lịch sử mua hàng...
                </div>
            )}

            {/* Not purchased message */}
            {isAuthenticated && eligibleOrderItemId === null && !showWriteForm && (
                <div style={{ fontSize: 13, color: "#9ca3af", marginBottom: 16 }}>
                    <i className="fas fa-info-circle me-1" />
                    Bạn cần <strong>mua và nhận hàng thành công</strong> sản phẩm này để có thể đánh giá.
                </div>
            )}

            {!isAuthenticated && (
                <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 16 }}>
                    <Link to="/login" style={{ fontWeight: 700, color: "#1d4ed8", textDecoration: "none" }}>Đăng nhập</Link> để đánh giá sản phẩm này.
                </div>
            )}

            {/* ── Reviews list ── */}
            {reviewsLoading ? (
                <div style={{ textAlign: "center", padding: "32px 0" }}><Spin /></div>
            ) : reviews.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "#9ca3af" }}>
                    <div style={{ fontSize: 48, opacity: 0.15, marginBottom: 12 }}>⭐</div>
                    <p style={{ margin: 0, fontSize: 14 }}>
                        {filterRating ? `Không có đánh giá ${filterRating} sao nào.` : "Chưa có đánh giá nào. Hãy là người đầu tiên!"}
                    </p>
                </div>
            ) : (
                <>
                    {reviews.map((review, idx) => {
                        const variantLabel = formatVariant(review.variant_info);
                        return (
                            <div
                                key={review.id}
                                className="rv-review-card"
                                style={{
                                    borderBottom: idx < reviews.length - 1 ? "1px solid #f3f4f6" : "none",
                                    paddingBottom: 20, marginBottom: 20,
                                    animationDelay: `${idx * 0.05}s`,
                                }}
                            >
                                <div style={{ display: "flex", gap: 14, alignItems: "flex-start" }}>
                                    {/* Avatar */}
                                    <div style={{
                                        width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                                        overflow: "hidden",
                                        boxShadow: "0 2px 8px rgba(102,126,234,0.3)",
                                    }}>
                                        {review.user?.avatar ? (
                                            <img
                                                src={review.user.avatar}
                                                alt={review.user.fullname}
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                onError={e => {
                                                    // fallback to initial letter on image error
                                                    const parent = (e.target as HTMLImageElement).parentElement!;
                                                    (e.target as HTMLImageElement).style.display = 'none';
                                                    parent.style.background = 'linear-gradient(135deg,#667eea,#764ba2)';
                                                    parent.style.display = 'flex';
                                                    parent.style.alignItems = 'center';
                                                    parent.style.justifyContent = 'center';
                                                    parent.style.color = '#fff';
                                                    parent.style.fontWeight = '800';
                                                    parent.style.fontSize = '16px';
                                                    parent.textContent = (review.user?.fullname ?? 'A').charAt(0).toUpperCase();
                                                }}
                                            />
                                        ) : (
                                            <div style={{
                                                width: '100%', height: '100%',
                                                background: "linear-gradient(135deg,#667eea,#764ba2)",
                                                display: "flex", alignItems: "center", justifyContent: "center",
                                                color: "#fff", fontWeight: 800, fontSize: 16,
                                            }}>
                                                {(review.user?.fullname ?? "A").charAt(0).toUpperCase()}
                                            </div>
                                        )}
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8, marginBottom: 4 }}>
                                            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                                                <span style={{ fontWeight: 700, fontSize: 14, color: "#111827" }}>
                                                    {review.user?.fullname ?? "Ẩn danh"}
                                                </span>
                                                <Stars value={review.rating} size={13} />
                                                {variantLabel && (
                                                    <span style={{
                                                        fontSize: 11, fontWeight: 600, background: "#f0fdf4",
                                                        border: "1px solid #86efac", color: "#15803d",
                                                        borderRadius: 99, padding: "1px 10px",
                                                    }}>
                                                        <i className="fas fa-tag me-1" style={{ fontSize: 9 }} />{variantLabel}
                                                    </span>
                                                )}
                                            </div>
                                            <span style={{ fontSize: 11.5, color: "#9ca3af" }}>{timeAgo(review.created_at)}</span>
                                        </div>

                                        {review.content ? (
                                            <p style={{ fontSize: 14, lineHeight: 1.7, color: "#374151", margin: "8px 0 0" }}>
                                                {review.content}
                                            </p>
                                        ) : (
                                            <p style={{ fontSize: 12.5, color: "#9ca3af", fontStyle: "italic", margin: "6px 0 0" }}>
                                                Không có nhận xét.
                                            </p>
                                        )}

                                        {/* Admin reply */}
                                        {review.admin_reply && (
                                            <div style={{
                                                background: "linear-gradient(135deg,#fff0f3,#fffbeb)",
                                                borderLeft: "3px solid #e00429", borderRadius: "0 10px 10px 0",
                                                padding: "10px 14px", marginTop: 10,
                                            }}>
                                                <div style={{ fontSize: 11.5, fontWeight: 700, color: "#e00429", marginBottom: 4 }}>
                                                    <i className="fas fa-store me-1" />Phản hồi từ Shop
                                                </div>
                                                <p style={{ fontSize: 13, color: "#292524", margin: 0, lineHeight: 1.65 }}>
                                                    {review.admin_reply}
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}

                    {/* Pagination */}
                    {reviewLastPage > 1 && (
                        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 8 }}>
                            <button
                                style={{ background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 9, padding: "6px 12px", cursor: reviewPage <= 1 ? "not-allowed" : "pointer", color: "#6b7280", opacity: reviewPage <= 1 ? 0.4 : 1 }}
                                disabled={reviewPage <= 1}
                                onClick={() => setReviewPage((p) => p - 1)}
                            >
                                <i className="fas fa-chevron-left" />
                            </button>
                            {Array.from({ length: reviewLastPage }, (_, i) => i + 1).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setReviewPage(p)}
                                    style={{
                                        background: reviewPage === p ? "linear-gradient(135deg,#f59e0b,#d97706)" : "#fff",
                                        border: reviewPage === p ? "none" : "1.5px solid #e5e7eb",
                                        color: reviewPage === p ? "#fff" : "#374151",
                                        borderRadius: 9, padding: "6px 0", width: 38, fontWeight: 700, cursor: "pointer",
                                        fontSize: 13,
                                    }}
                                >
                                    {p}
                                </button>
                            ))}
                            <button
                                style={{ background: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 9, padding: "6px 12px", cursor: reviewPage >= reviewLastPage ? "not-allowed" : "pointer", color: "#6b7280", opacity: reviewPage >= reviewLastPage ? 0.4 : 1 }}
                                disabled={reviewPage >= reviewLastPage}
                                onClick={() => setReviewPage((p) => p + 1)}
                            >
                                <i className="fas fa-chevron-right" />
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default ProductReviews;

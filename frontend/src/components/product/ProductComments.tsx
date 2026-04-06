import React, { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { Spin } from "antd";
import { axiosInstance } from "../../api/axios";
import { toast } from "react-toastify";
import { useAuth } from "../../context/AuthContext";

// ─── Types ────────────────────────────────────────────────────────────────────

interface QuestionUser {
    id: number;
    fullname: string;
    avatar?: string | null;
    is_admin?: boolean;
}

interface AnswerItem {
    id: number;
    content: string;
    status: "pending" | "approved" | "rejected";
    user_id: number;
    created_at: string;
    user?: QuestionUser;
}

interface QuestionItem {
    id: number;
    content: string;
    status: "pending" | "approved" | "rejected";
    is_hidden: boolean;
    parent_id: number | null;
    user_id: number;
    created_at: string;
    user?: QuestionUser;
    replies?: AnswerItem[];
    replies_count?: number;
}

interface PaginationMeta {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

interface ProductQAProps {
    productId: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const timeAgo = (date: string) => {
    const diff = (Date.now() - new Date(date).getTime()) / 1000;
    if (diff < 60) return "vừa xong";
    if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
    if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
    if (diff < 604800) return `${Math.floor(diff / 86400)} ngày trước`;
    return new Date(date).toLocaleDateString("vi-VN");
};

const MIN_QUESTION_LENGTH = 10;

// ─── AnswerThread ─────────────────────────────────────────────────────────────

interface AnswerThreadProps {
    question: QuestionItem;
    currentUserId?: number;
    productId: string;
    onAnswerPosted: () => void;
    isAuthenticated: boolean;
}

const AnswerThread: React.FC<AnswerThreadProps> = ({
    question, currentUserId, productId, onAnswerPosted, isAuthenticated,
}) => {
    const [showForm, setShowForm] = useState(false);
    const [text, setText] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [answers, setAnswers] = useState<AnswerItem[]>(question.replies ?? []);
    const [answerMeta, setAnswerMeta] = useState<PaginationMeta>({
        current_page: 1, last_page: 1, per_page: 10,
        total: question.replies_count ?? (question.replies?.length ?? 0),
    });
    const [loadingMore, setLoadingMore] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [showAll, setShowAll] = useState(false);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    const PREVIEW_COUNT = 2;
    const displayedAnswers = showAll ? answers : answers.slice(0, PREVIEW_COUNT);
    const hasMore = answers.length < (answerMeta.total ?? 0) && answerMeta.current_page < answerMeta.last_page;

    const loadMore = async () => {
        setLoadingMore(true);
        try {
            const next = answerMeta.current_page + 1;
            const res = await axiosInstance.get(`/comments/${question.id}/replies`, {
                params: { page: next, per_page: 10 },
            });
            const newAnswers: AnswerItem[] = res.data.data ?? [];
            const meta: PaginationMeta = res.data.meta ?? answerMeta;
            setAnswers(prev => [
                ...prev,
                ...newAnswers.filter(n => !prev.find(p => p.id === n.id)),
            ]);
            setAnswerMeta(meta);
        } catch {
            toast.error("Không thể tải thêm câu trả lời.");
        } finally {
            setLoadingMore(false);
        }
    };

    const handleSubmit = async () => {
        const trimmed = text.trim();
        if (trimmed.length < 2) {
            toast.warning("Câu trả lời quá ngắn.");
            return;
        }
        setSubmitting(true);
        try {
            const res = await axiosInstance.post("/client/comments", {
                product_id: Number(productId),
                parent_id: question.id,
                content: trimmed,
            });
            const newAnswer: AnswerItem = res.data.data;
            setAnswers(prev => [...prev, newAnswer]);
            setAnswerMeta(m => ({ ...m, total: m.total + 1 }));
            setText("");
            setShowForm(false);
            setShowAll(true);
            toast.success("Đã gửi câu trả lời, đang chờ duyệt.");
            onAnswerPosted();
        } catch (err: any) {
            const msg = err?.response?.data?.message ?? "Không thể gửi câu trả lời.";
            if (err?.response?.status === 429) {
                toast.error("Bạn đang gửi quá nhanh. Vui lòng thử lại sau 1 phút.");
            } else {
                toast.error(msg);
            }
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (answerId: number) => {
        if (!window.confirm("Xoá câu trả lời này?")) return;
        setDeletingId(answerId);
        try {
            await axiosInstance.delete(`/client/comments/${answerId}`);
            setAnswers(prev => prev.filter(a => a.id !== answerId));
            setAnswerMeta(m => ({ ...m, total: Math.max(0, m.total - 1) }));
            toast.success("Đã xoá.");
        } catch {
            toast.error("Không thể xoá.");
        } finally {
            setDeletingId(null);
        }
    };

    const totalAnswers = answerMeta.total;

    return (
        <div className="qa-answer-thread">
            {/* Answer count / toggle */}
            {totalAnswers > 0 && (
                <div
                    className="d-flex align-items-center gap-2 mb-3"
                    style={{ fontSize: 13, color: "#0d6efd" }}
                >
                    <i className="fas fa-comments" style={{ fontSize: 12 }} />
                    <span className="fw-semibold">{totalAnswers} câu trả lời</span>
                </div>
            )}

            {/* Answers list */}
            {displayedAnswers.map((ans, idx) => {
                const isAdmin = !!ans.user?.is_admin;
                return (
                    <div
                        key={ans.id}
                        className="d-flex gap-3 mb-3"
                        style={{ animation: `qaFadeIn 0.25s ease ${idx * 0.05}s both` }}
                    >
                        {/* Icon */}
                        <div
                            style={{
                                width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
                                background: isAdmin
                                    ? "linear-gradient(135deg,#fa8c16,#d46b08)"
                                    : "linear-gradient(135deg,#52c41a,#237804)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                color: "#fff", fontSize: 11, fontWeight: 700,
                            }}
                        >
                            {isAdmin ? "QTV" : (ans.user?.fullname ?? "A").charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1 }}>
                            <div
                                style={{
                                    background: isAdmin ? "#fff7e6" : "#f6ffed",
                                    border: `1px solid ${isAdmin ? "#ffd591" : "#b7eb8f"}`,
                                    borderRadius: "0 12px 12px 12px",
                                    padding: "10px 14px",
                                }}
                            >
                                <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                                    <span className="fw-bold" style={{ fontSize: 13, color: isAdmin ? "#d46b08" : "#135200" }}>
                                        {isAdmin ? "Quản trị viên" : (ans.user?.fullname ?? "Ẩn danh")}
                                    </span>
                                    {isAdmin && (
                                        <span
                                            style={{
                                                background: "#fa8c16", color: "#fff", fontSize: 10,
                                                padding: "1px 7px", borderRadius: 10, fontWeight: 600,
                                            }}
                                        >
                                            QTV
                                        </span>
                                    )}
                                    {ans.status === "pending" && (
                                        <span
                                            style={{
                                                background: "#fff7e6", border: "1px solid #ffd591",
                                                color: "#d46b08", fontSize: 10, padding: "1px 7px",
                                                borderRadius: 10, fontWeight: 600,
                                            }}
                                        >
                                            <i className="fas fa-clock me-1" style={{ fontSize: 9 }} />Chờ duyệt
                                        </span>
                                    )}
                                </div>
                                <p style={{ fontSize: 13.5, lineHeight: 1.65, color: "#2d2d2d", margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                                    {ans.content}
                                </p>
                            </div>
                            <div className="d-flex align-items-center gap-2 mt-1 ps-1" style={{ fontSize: 11, color: "#aaa" }}>
                                <span>{timeAgo(ans.created_at)}</span>
                                {currentUserId === ans.user_id && (
                                    <button
                                        className="btn btn-link p-0 text-decoration-none"
                                        style={{ fontSize: 11, color: "#dc3545", lineHeight: 1 }}
                                        onClick={() => handleDelete(ans.id)}
                                        disabled={deletingId === ans.id}
                                    >
                                        {deletingId === ans.id
                                            ? <Spin size="small" />
                                            : <><i className="fas fa-trash-alt me-1" />Xoá</>
                                        }
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}

            {/* Show more / collapse */}
            <div className="d-flex gap-3 align-items-center mb-2">
                {!showAll && answers.length > PREVIEW_COUNT && (
                    <button
                        className="btn btn-link btn-sm p-0 text-decoration-none"
                        style={{ fontSize: 12, color: "#0d6efd" }}
                        onClick={() => setShowAll(true)}
                    >
                        <i className="fas fa-chevron-down me-1" />
                        Xem {answers.length - PREVIEW_COUNT} câu trả lời khác
                    </button>
                )}
                {showAll && hasMore && (
                    <button
                        className="btn btn-link btn-sm p-0 text-decoration-none"
                        style={{ fontSize: 12, color: "#0d6efd" }}
                        onClick={loadMore}
                        disabled={loadingMore}
                    >
                        {loadingMore ? <Spin size="small" /> : <><i className="fas fa-sync-alt me-1" />Tải thêm</>}
                    </button>
                )}
                {/* Answer button */}
                {isAuthenticated && (
                    <button
                        className="btn btn-link btn-sm p-0 text-decoration-none ms-auto"
                        style={{ fontSize: 12, color: "#6c757d" }}
                        onClick={() => {
                            setShowForm(v => !v);
                            setTimeout(() => inputRef.current?.focus(), 80);
                        }}
                    >
                        <i className="fas fa-reply me-1" style={{ fontSize: 11 }} />
                        {showForm ? "Huỷ" : "Trả lời"}
                    </button>
                )}
            </div>

            {/* Answer form */}
            {showForm && isAuthenticated && (
                <div
                    style={{ marginLeft: 44, marginBottom: 8 }}
                >
                    <textarea
                        ref={inputRef}
                        className="form-control form-control-sm mb-2"
                        rows={2}
                        placeholder="Chia sẻ câu trả lời của bạn... (Ctrl+Enter để gửi)"
                        value={text}
                        onChange={e => setText(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmit(); }}
                        maxLength={2000}
                        style={{ borderRadius: 8, fontSize: 13, resize: "none", borderColor: "#0d6efd3a" }}
                    />
                    <div className="d-flex justify-content-between align-items-center">
                        <span style={{ fontSize: 11, color: "#aaa" }}>{text.length}/2000</span>
                        <button
                            className="btn btn-sm btn-primary"
                            style={{ borderRadius: 7, fontSize: 12, fontWeight: 600 }}
                            onClick={handleSubmit}
                            disabled={submitting || text.trim().length < 2}
                        >
                            {submitting ? <Spin size="small" /> : <><i className="fas fa-paper-plane me-1" />Gửi</>}
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const ProductQA: React.FC<ProductQAProps> = ({ productId }) => {
    const { isAuthenticated, user } = useAuth();

    const [questions, setQuestions] = useState<QuestionItem[]>([]);
    const [meta, setMeta] = useState<PaginationMeta>({ current_page: 1, last_page: 1, per_page: 8, total: 0 });
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(1);
    const [sort, setSort] = useState<"latest" | "oldest">("latest");

    // Question form
    const [questionText, setQuestionText] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [charCount, setCharCount] = useState(0);

    // Edit / delete own question
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editText, setEditText] = useState("");
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [deletingId, setDeletingId] = useState<number | null>(null);

    // ── Fetch ──────────────────────────────────────────────────────────────────
    const fetchQuestions = async (p: number) => {
        setLoading(true);
        try {
            const res = await axiosInstance.get(`/products/${productId}/comments`, {
                params: { page: p, per_page: 8 },
            });
            let data: QuestionItem[] = res.data.data ?? [];
            // Sort client-side
            if (sort === "oldest") data = [...data].reverse();
            setQuestions(data);
            setMeta(res.data.meta ?? meta);
        } catch {
            toast.error("Không thể tải câu hỏi.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchQuestions(page); }, [productId, page, sort]);

    // ── Submit question ────────────────────────────────────────────────────────
    const handleSubmitQuestion = async () => {
        const trimmed = questionText.trim();
        if (trimmed.length < MIN_QUESTION_LENGTH) {
            toast.warning(`Câu hỏi phải có ít nhất ${MIN_QUESTION_LENGTH} ký tự.`);
            return;
        }
        setSubmitting(true);
        try {
            await axiosInstance.post("/client/comments", {
                product_id: Number(productId),
                content: trimmed,
            });
            toast.success("Câu hỏi đã được gửi, đang chờ duyệt!");
            setQuestionText("");
            setCharCount(0);
            setPage(1);
            fetchQuestions(1);
        } catch (err: any) {
            if (err?.response?.status === 429) {
                toast.error("Bạn đang gửi quá nhanh. Vui lòng thử lại sau.");
            } else {
                toast.error(err?.response?.data?.message ?? "Không thể gửi câu hỏi.");
            }
        } finally {
            setSubmitting(false);
        }
    };

    // ── Edit ───────────────────────────────────────────────────────────────────
    const handleSubmitEdit = async (qId: number) => {
        const trimmed = editText.trim();
        if (trimmed.length < MIN_QUESTION_LENGTH) {
            toast.warning(`Câu hỏi phải có ít nhất ${MIN_QUESTION_LENGTH} ký tự.`);
            return;
        }
        setEditSubmitting(true);
        try {
            const res = await axiosInstance.put(`/client/comments/${qId}`, { content: trimmed });
            const updated: QuestionItem = res.data.data;
            setQuestions(prev => prev.map(q => q.id === qId ? { ...q, ...updated } : q));
            toast.success("Đã cập nhật câu hỏi, đang chờ duyệt lại.");
            setEditingId(null);
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Không thể cập nhật.");
        } finally {
            setEditSubmitting(false);
        }
    };

    // ── Delete ─────────────────────────────────────────────────────────────────
    const handleDelete = async (qId: number) => {
        if (!window.confirm("Xoá câu hỏi này?")) return;
        setDeletingId(qId);
        try {
            await axiosInstance.delete(`/client/comments/${qId}`);
            setQuestions(prev => prev.filter(q => q.id !== qId));
            setMeta(m => ({ ...m, total: Math.max(0, m.total - 1) }));
            toast.success("Đã xoá câu hỏi.");
        } catch {
            toast.error("Không thể xoá.");
        } finally {
            setDeletingId(null);
        }
    };

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div>
            {/* ── Styles ── */}
            <style>{`
                @keyframes qaFadeIn {
                    from { opacity: 0; transform: translateY(8px); }
                    to   { opacity: 1; transform: translateY(0); }
                }
                .qa-question-card { transition: box-shadow 0.2s; }
                .qa-question-card:hover { box-shadow: 0 4px 18px rgba(0,0,0,0.08) !important; }
            `}</style>

            {/* ── Hero: Ask a question ── */}
            <div
                className="mb-4 p-4"
                style={{
                    background: "linear-gradient(135deg,#f0f5ff 0%,#e6f4ff 100%)",
                    borderRadius: 16,
                    border: "1px solid #bae0ff",
                }}
            >
                <div className="d-flex align-items-center gap-2 mb-3">
                    <div
                        style={{
                            width: 36, height: 36, borderRadius: "50%",
                            background: "linear-gradient(135deg,#0d6efd,#084298)",
                            display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", flexShrink: 0,
                        }}
                    >
                        <i className="fas fa-question" style={{ fontSize: 16 }} />
                    </div>
                    <div>
                        <div className="fw-bold" style={{ fontSize: 15, color: "#003eb3" }}>Đặt câu hỏi cho sản phẩm</div>
                        <div style={{ fontSize: 12, color: "#4096ff" }}>Đội ngũ tư vấn sẽ phản hồi trong thời gian sớm nhất</div>
                    </div>
                </div>

                {!isAuthenticated ? (
                    <p className="mb-0" style={{ fontSize: 13.5, color: "#555" }}>
                        <Link to="/login" className="fw-bold text-primary">Đăng nhập</Link> để đặt câu hỏi về sản phẩm này.
                    </p>
                ) : (
                    <div>
                        <div className="d-flex gap-3 align-items-start">
                            {/* User avatar */}
                            <div
                                style={{
                                    width: 38, height: 38, borderRadius: "50%", flexShrink: 0, marginTop: 2,
                                    background: "linear-gradient(135deg,#0d6efd,#084298)",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    color: "#fff", fontWeight: 700, fontSize: 15, border: "2px solid #fff",
                                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                                }}
                            >
                                {(user?.fullname ?? "?").charAt(0).toUpperCase()}
                            </div>
                            <div style={{ flex: 1 }}>
                                <textarea
                                    className="form-control mb-2"
                                    rows={3}
                                    placeholder={`Ví dụ: "Sản phẩm này có bảo hành không?", "Có màu đen không?"... (tối thiểu ${MIN_QUESTION_LENGTH} ký tự, Ctrl+Enter để gửi)`}
                                    value={questionText}
                                    onChange={e => { setQuestionText(e.target.value); setCharCount(e.target.value.length); }}
                                    onKeyDown={e => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) handleSubmitQuestion(); }}
                                    maxLength={2000}
                                    style={{ borderRadius: 10, resize: "none", fontSize: 14, border: "1.5px solid #91caff" }}
                                />
                                <div className="d-flex justify-content-between align-items-center">
                                    <div className="d-flex align-items-center gap-2">
                                        <span style={{ fontSize: 12, color: charCount < MIN_QUESTION_LENGTH ? "#ff4d4f" : "#52c41a" }}>
                                            {charCount}/{2000}
                                        </span>
                                        {charCount < MIN_QUESTION_LENGTH && charCount > 0 && (
                                            <span style={{ fontSize: 11, color: "#ff4d4f" }}>
                                                Cần thêm {MIN_QUESTION_LENGTH - charCount} ký tự
                                            </span>
                                        )}
                                    </div>
                                    <button
                                        className="btn btn-primary px-4"
                                        style={{ borderRadius: 9, fontWeight: 600, fontSize: 13.5 }}
                                        onClick={handleSubmitQuestion}
                                        disabled={submitting || questionText.trim().length < MIN_QUESTION_LENGTH}
                                    >
                                        {submitting
                                            ? <><Spin size="small" className="me-2" />Đang gửi...</>
                                            : <><i className="fas fa-paper-plane me-2" />Gửi câu hỏi</>
                                        }
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ── Header + Sort ── */}
            <div className="d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
                <div className="d-flex align-items-center gap-2">
                    <div style={{ width: 4, height: 20, background: "#0d6efd", borderRadius: 4 }} />
                    <span className="fw-bold" style={{ fontSize: 15 }}>
                        {meta.total > 0 ? `${meta.total} câu hỏi` : "Chưa có câu hỏi nào"}
                    </span>
                </div>
                {meta.total > 1 && (
                    <div className="d-flex align-items-center gap-2" style={{ fontSize: 13 }}>
                        <span className="text-muted">Sắp xếp:</span>
                        {(["latest", "oldest"] as const).map(s => (
                            <button
                                key={s}
                                className={`btn btn-sm ${sort === s ? "btn-primary" : "btn-outline-secondary"}`}
                                style={{ borderRadius: 7, fontSize: 12, padding: "3px 10px" }}
                                onClick={() => { setSort(s); setPage(1); }}
                            >
                                {s === "latest" ? "Mới nhất" : "Cũ nhất"}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Questions List ── */}
            {loading ? (
                <div className="text-center py-5">
                    <Spin size="large" />
                    <p className="text-muted mt-3" style={{ fontSize: 14 }}>Đang tải câu hỏi...</p>
                </div>
            ) : questions.length === 0 ? (
                <div className="text-center py-5">
                    <div style={{ fontSize: 52, opacity: 0.12, lineHeight: 1 }}>❓</div>
                    <p className="text-muted mt-3" style={{ fontSize: 14 }}>
                        Chưa có câu hỏi nào. Hãy là người đầu tiên đặt câu hỏi!
                    </p>
                </div>
            ) : (
                <div>
                    {questions.map((q, idx) => {
                        const answered = (q.replies_count ?? q.replies?.length ?? 0) > 0;
                        const isOwner = Number(user?.id ?? -1) === q.user_id;

                        return (
                            <div
                                key={q.id}
                                className="qa-question-card mb-4 p-4"
                                style={{
                                    background: "#fff",
                                    borderRadius: 14,
                                    border: `1px solid ${answered ? "#d9f7be" : "#f0f0f0"}`,
                                    boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
                                    animation: `qaFadeIn 0.3s ease ${idx * 0.06}s both`,
                                }}
                            >
                                {/* Question header */}
                                <div className="d-flex gap-3 mb-3">
                                    {/* Q badge */}
                                    <div
                                        style={{
                                            width: 42, height: 42, borderRadius: "50%", flexShrink: 0,
                                            background: "linear-gradient(135deg,#0d6efd,#084298)",
                                            display: "flex", alignItems: "center", justifyContent: "center",
                                            color: "#fff", fontWeight: 900, fontSize: 17,
                                        }}
                                    >
                                        Q
                                    </div>

                                    <div style={{ flex: 1 }}>
                                        <div className="d-flex align-items-center justify-content-between gap-2 flex-wrap mb-1">
                                            <div className="d-flex align-items-center gap-2 flex-wrap">
                                                <span className="fw-bold" style={{ fontSize: 13.5, color: "#1a1a2e" }}>
                                                    {q.user?.fullname ?? "Ẩn danh"}
                                                </span>
                                                {q.status === "pending" && (
                                                    <span
                                                        style={{
                                                            background: "#fff7e6", border: "1px solid #ffd591",
                                                            color: "#d46b08", fontSize: 10, padding: "1px 7px",
                                                            borderRadius: 10, fontWeight: 600,
                                                        }}
                                                    >
                                                        <i className="fas fa-clock me-1" style={{ fontSize: 9 }} />Chờ duyệt
                                                    </span>
                                                )}
                                                <span style={{ fontSize: 12, color: "#aaa" }}>{timeAgo(q.created_at)}</span>
                                            </div>
                                            {/* Owner actions */}
                                            {isOwner && editingId !== q.id && (
                                                <div className="d-flex gap-1">
                                                    <button
                                                        className="btn btn-sm btn-light"
                                                        style={{ fontSize: 11, borderRadius: 6, padding: "2px 8px" }}
                                                        onClick={() => { setEditingId(q.id); setEditText(q.content); }}
                                                    >
                                                        <i className="fas fa-pen me-1" style={{ fontSize: 10 }} />Sửa
                                                    </button>
                                                    <button
                                                        className="btn btn-sm"
                                                        style={{ fontSize: 11, borderRadius: 6, padding: "2px 8px", color: "#dc3545", background: "#fff5f5", border: "1px solid #f5c2c7" }}
                                                        onClick={() => handleDelete(q.id)}
                                                        disabled={deletingId === q.id}
                                                    >
                                                        {deletingId === q.id ? <Spin size="small" /> : <><i className="fas fa-trash-alt me-1" />Xoá</>}
                                                    </button>
                                                </div>
                                            )}
                                        </div>

                                        {/* Question text or edit form */}
                                        {editingId === q.id ? (
                                            <div>
                                                <textarea
                                                    className="form-control form-control-sm mb-2"
                                                    rows={3}
                                                    value={editText}
                                                    onChange={e => setEditText(e.target.value)}
                                                    maxLength={2000}
                                                    style={{ borderRadius: 8, resize: "none", fontSize: 13 }}
                                                    autoFocus
                                                />
                                                {editText.trim().length < MIN_QUESTION_LENGTH && editText.length > 0 && (
                                                    <div style={{ fontSize: 11, color: "#ff4d4f", marginBottom: 6 }}>
                                                        Cần ít nhất {MIN_QUESTION_LENGTH} ký tự
                                                    </div>
                                                )}
                                                <div className="d-flex gap-2 justify-content-end">
                                                    <button className="btn btn-sm btn-light" style={{ borderRadius: 6, fontSize: 12 }} onClick={() => setEditingId(null)}>Huỷ</button>
                                                    <button
                                                        className="btn btn-sm btn-primary"
                                                        style={{ borderRadius: 6, fontSize: 12, fontWeight: 600 }}
                                                        onClick={() => handleSubmitEdit(q.id)}
                                                        disabled={editSubmitting || editText.trim().length < MIN_QUESTION_LENGTH}
                                                    >
                                                        {editSubmitting ? <Spin size="small" /> : <><i className="fas fa-check me-1" />Lưu</>}
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <p
                                                style={{
                                                    fontSize: 14.5, lineHeight: 1.65, color: "#1a1a2e",
                                                    margin: 0, fontWeight: 500, whiteSpace: "pre-wrap", wordBreak: "break-word",
                                                }}
                                            >
                                                {q.content}
                                            </p>
                                        )}
                                    </div>
                                </div>

                                {/* Unanswered badge */}
                                {!answered && (
                                    <div
                                        style={{
                                            background: "#fff7e6", border: "1px dashed #ffa940",
                                            borderRadius: 8, padding: "8px 14px", fontSize: 12.5,
                                            color: "#ad4e00", marginBottom: 12,
                                            display: "flex", alignItems: "center", gap: 6,
                                        }}
                                    >
                                        <i className="fas fa-hourglass-half" style={{ fontSize: 12 }} />
                                        Câu hỏi đang chờ được trả lời — cảm ơn bạn đã kiên nhẫn!
                                    </div>
                                )}

                                {/* Separator */}
                                <div style={{ borderTop: "1px solid #f5f5f5", marginTop: 4, marginBottom: 12 }} />

                                {/* Answer thread */}
                                <AnswerThread
                                    question={q}
                                    currentUserId={Number(user?.id ?? -1) || undefined}
                                    productId={productId}
                                    onAnswerPosted={() => fetchQuestions(page)}
                                    isAuthenticated={isAuthenticated}
                                />
                            </div>
                        );
                    })}

                    {/* Pagination */}
                    {meta.last_page > 1 && (
                        <div className="d-flex justify-content-center gap-2 pt-3">
                            <button
                                className="btn btn-sm btn-outline-secondary"
                                style={{ borderRadius: 8 }}
                                disabled={page <= 1}
                                onClick={() => setPage(p => p - 1)}
                            >
                                <i className="fas fa-chevron-left" />
                            </button>
                            {Array.from({ length: meta.last_page }, (_, i) => i + 1).map(p => (
                                <button
                                    key={p}
                                    className={`btn btn-sm ${page === p ? "btn-primary" : "btn-outline-secondary"}`}
                                    style={{ borderRadius: 8, minWidth: 36 }}
                                    onClick={() => setPage(p)}
                                >
                                    {p}
                                </button>
                            ))}
                            <button
                                className="btn btn-sm btn-outline-secondary"
                                style={{ borderRadius: 8 }}
                                disabled={page >= meta.last_page}
                                onClick={() => setPage(p => p + 1)}
                            >
                                <i className="fas fa-chevron-right" />
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default ProductQA;

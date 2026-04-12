import { useEffect, useState } from 'react';
import {
    Button, Space, Tag, Typography, Avatar, Spin, message,
    Popconfirm, Input, Modal, Breadcrumb,
} from 'antd';
import {
    QuestionCircleOutlined, UserOutlined, CheckCircleOutlined,
    CloseCircleOutlined, ExclamationCircleOutlined, LinkOutlined,
    MessageOutlined, SendOutlined, EyeInvisibleOutlined, EyeOutlined,
    DeleteOutlined, ArrowLeftOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { axiosInstance } from '../../../api/axios';

const { Title, Text } = Typography;

// ─── Types ─────────────────────────────────────────────────────────────────────

interface CommentUser { id: number; fullname: string; avatar?: string | null; is_admin?: boolean; }
interface CommentProduct { id: number; name: string; }

interface ReplyItem {
    id: number;
    content: string;
    status: 'pending' | 'approved' | 'rejected';
    is_hidden: boolean;
    parent_id: number;
    user_id: number;
    product_id: number;
    created_at: string;
    user?: CommentUser;
}

interface QuestionDetail {
    id: number;
    content: string;
    status: 'pending' | 'approved' | 'rejected';
    is_hidden: boolean;
    parent_id: null;
    user_id: number;
    product_id: number;
    created_at: string;
    user?: CommentUser;
    product?: CommentProduct;
    allReplies?: ReplyItem[];
}

const statusConfig: Record<string, { color: string; label: string }> = {
    pending: { color: 'orange', label: 'Chờ duyệt' },
    approved: { color: 'green', label: 'Đã duyệt' },
    rejected: { color: 'red', label: 'Đã từ chối' },
};

// ─── Component ─────────────────────────────────────────────────────────────────

export default function AdminCommentDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [data, setData] = useState<QuestionDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    // Answer modal
    const [answerOpen, setAnswerOpen] = useState(false);
    const [answerText, setAnswerText] = useState('');
    const [answerSubmitting, setAnswerSubmitting] = useState(false);

    // ── Fetch ───────────────────────────────────────────────────────────────────
    const fetchDetail = async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get(`/admin/comments/${id}`);
            setData(res.data.data);
        } catch {
            message.error('Không thể tải chi tiết câu hỏi.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchDetail(); }, [id]);

    // ── Local state helpers ─────────────────────────────────────────────────────
    const patchQuestion = (patch: Partial<QuestionDetail>) =>
        setData(d => d ? { ...d, ...patch } : d);

    const patchReply = (replyId: number, patch: Partial<ReplyItem>) =>
        setData(d => d ? { ...d, allReplies: d.allReplies?.map(r => r.id === replyId ? { ...r, ...patch } : r) } : d);

    const removeReply = (replyId: number) =>
        setData(d => d ? { ...d, allReplies: d.allReplies?.filter(r => r.id !== replyId) } : d);

    // ── Actions ─────────────────────────────────────────────────────────────────
    const doApprove = async (itemId: number, isReply: boolean) => {
        setActionLoading(itemId);
        try {
            await axiosInstance.patch(`/admin/comments/${itemId}/approve`);
            message.success('Đã duyệt thành công.');
            if (isReply) patchReply(itemId, { status: 'approved', is_hidden: false });
            else patchQuestion({ status: 'approved', is_hidden: false });
        } catch (err: any) {
            message.error(err?.response?.data?.message ?? 'Lỗi khi duyệt.');
        } finally { setActionLoading(null); }
    };

    const doReject = async (itemId: number, isReply: boolean) => {
        setActionLoading(itemId);
        try {
            await axiosInstance.patch(`/admin/comments/${itemId}/reject`);
            message.success('Đã từ chối.');
            if (isReply) patchReply(itemId, { status: 'rejected' });
            else patchQuestion({ status: 'rejected' });
        } catch (err: any) {
            message.error(err?.response?.data?.message ?? 'Lỗi khi từ chối.');
        } finally { setActionLoading(null); }
    };

    const doToggleHide = async (itemId: number, isReply: boolean) => {
        setActionLoading(itemId);
        try {
            const res = await axiosInstance.patch(`/admin/comments/${itemId}/toggle-hide`);
            const newHidden: boolean = res.data.is_hidden;
            message.success(newHidden ? 'Đã ẩn.' : 'Đã hiện.');
            if (isReply) patchReply(itemId, { is_hidden: newHidden });
            else patchQuestion({ is_hidden: newHidden });
        } catch (err: any) {
            message.error(err?.response?.data?.message ?? 'Lỗi khi đổi trạng thái.');
        } finally { setActionLoading(null); }
    };

    const doDelete = async (itemId: number, isReply: boolean) => {
        setActionLoading(itemId);
        try {
            await axiosInstance.delete(`/admin/comments/${itemId}`);
            message.success('Đã xoá.');
            if (isReply) removeReply(itemId);
            else navigate('/admin/comments');
        } catch (err: any) {
            message.error(err?.response?.data?.message ?? 'Lỗi khi xoá.');
        } finally { setActionLoading(null); }
    };

    const handlePostAnswer = async () => {
        if (!data) return;
        const trimmed = answerText.trim();
        if (trimmed.length < 2) { message.warning('Câu trả lời quá ngắn.'); return; }
        setAnswerSubmitting(true);
        try {
            await axiosInstance.post('/client/comments', {
                product_id: data.product_id,
                parent_id: data.id,
                content: trimmed,
            });
            message.success('Đã gửi câu trả lời thành công!');
            setAnswerOpen(false);
            setAnswerText('');
            fetchDetail();
        } catch (err: any) {
            message.error(err?.response?.data?.message ?? 'Lỗi khi gửi câu trả lời.');
        } finally { setAnswerSubmitting(false); }
    };

    // ── Action bar helper ───────────────────────────────────────────────────────
    const ActionBar = ({ item, isReply }: { item: QuestionDetail | ReplyItem; isReply: boolean }) => {
        const busy = actionLoading === item.id;
        return (
            <Space size={6} wrap>
                {item.status === 'pending' && (
                    <>
                        <Button size="small" type="primary" icon={<CheckCircleOutlined />}
                            loading={busy} onClick={() => doApprove(item.id, isReply)}
                            style={{ background: '#52c41a', borderColor: '#52c41a' }}>
                            Duyệt
                        </Button>
                        <Button size="small" danger ghost icon={<CloseCircleOutlined />}
                            loading={busy} onClick={() => doReject(item.id, isReply)}>
                            Từ chối
                        </Button>
                    </>
                )}
                {item.status === 'rejected' && (
                    <Button size="small" type="primary" icon={<CheckCircleOutlined />}
                        loading={busy} onClick={() => doApprove(item.id, isReply)}
                        style={{ background: '#52c41a', borderColor: '#52c41a' }}>
                        Duyệt lại
                    </Button>
                )}
                {item.status === 'approved' && (
                    <Button size="small" type="dashed"
                        icon={item.is_hidden ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                        loading={busy} onClick={() => doToggleHide(item.id, isReply)}>
                        {item.is_hidden ? 'Bỏ ẩn' : 'Ẩn'}
                    </Button>
                )}
                <Popconfirm
                    title={isReply ? 'Xoá câu trả lời này?' : 'Xoá câu hỏi và toàn bộ câu trả lời?'}
                    icon={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
                    onConfirm={() => doDelete(item.id, isReply)}
                    okText="Xoá" okType="danger" cancelText="Huỷ"
                >
                    <Button size="small" danger icon={<DeleteOutlined />} loading={busy}>Xoá</Button>
                </Popconfirm>
            </Space>
        );
    };

    // ── Loading state ───────────────────────────────────────────────────────────
    if (loading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
                <Spin size="large" tip="Đang tải..." />
            </div>
        );
    }

    if (!data) {
        return (
            <div style={{ padding: 24, textAlign: 'center', color: '#aaa' }}>
                Không tìm thấy câu hỏi.
                <br />
                <Button type="link" onClick={() => navigate('/admin/comments')}>← Quay lại</Button>
            </div>
        );
    }

    const replies = data.allReplies ?? [];
    const pendingReplies = replies.filter(r => r.status === 'pending').length;

    // ─────────────────────────────────────────────────────────────────────────────
    return (
        <div style={{ padding: 24, background: '#f5f6fa', minHeight: 'calc(100vh - 84px)' }}>

            {/* Breadcrumb */}
            <Breadcrumb
                style={{ marginBottom: 16 }}
                items={[
                    { title: <Link to="/admin/comments">Hỏi &amp; Đáp</Link> },
                    { title: `Chi tiết câu hỏi #${data.id}` },
                ]}
            />

            {/* Back button + Title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
                <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/comments')}>
                    Quay lại
                </Button>
                <Title level={4} style={{ margin: 0 }}>
                    <QuestionCircleOutlined style={{ marginRight: 8, color: '#1677ff' }} />
                    Chi tiết câu hỏi #{data.id}
                </Title>
                {data.status === 'pending' && <Tag color="orange">⏳ Chờ duyệt</Tag>}
                {pendingReplies > 0 && (
                    <Tag color="gold">{pendingReplies} câu trả lời chờ duyệt</Tag>
                )}
            </div>

            {/* ── Question card ────────────────────────────────────────────────── */}
            <div style={{
                background: '#fff',
                borderRadius: 14,
                border: '1.5px solid #adc6ff',
                padding: '20px 24px',
                marginBottom: 24,
                boxShadow: '0 2px 12px rgba(22,119,255,0.07)',
            }}>
                {/* User row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
                    <Avatar
                        src={data.user?.avatar || undefined}
                        icon={!data.user?.avatar ? <UserOutlined /> : undefined}
                        size={44}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                            <span style={{ fontWeight: 700, fontSize: 15 }}>{data.user?.fullname ?? '—'}</span>
                            <Tag color={statusConfig[data.status]?.color}>{statusConfig[data.status]?.label}</Tag>
                            {data.is_hidden && <Tag color="default" icon={<EyeInvisibleOutlined />}>Đã ẩn</Tag>}
                            <span style={{ fontSize: 12, color: '#aaa', marginLeft: 'auto' }}>
                                🕐 {new Date(data.created_at).toLocaleString('vi-VN')}
                            </span>
                        </div>
                        {data.product && (
                            <Link to={`/product/${data.product_id}`} target="_blank" style={{ fontSize: 13, color: '#1677ff' }}>
                                <LinkOutlined style={{ marginRight: 4 }} />
                                {data.product.name}
                            </Link>
                        )}
                    </div>
                </div>

                {/* Question content - full text */}
                <div style={{
                    background: '#f0f5ff',
                    border: '1px solid #d6e4ff',
                    borderRadius: 10,
                    padding: '14px 18px',
                    marginBottom: 16,
                    fontSize: 15,
                    lineHeight: 1.75,
                    color: '#1a1a2e',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                }}>
                    <QuestionCircleOutlined style={{ color: '#1677ff', marginRight: 8, fontSize: 16 }} />
                    {data.content}
                </div>

                {/* Actions */}
                <ActionBar item={data} isReply={false} />
            </div>

            {/* ── Replies section ──────────────────────────────────────────────── */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <Text strong style={{ fontSize: 15 }}>
                    <MessageOutlined style={{ marginRight: 8, color: '#52c41a' }} />
                    Câu trả lời ({replies.length})
                </Text>
                <Button
                    type="primary"
                    icon={<SendOutlined />}
                    onClick={() => { setAnswerOpen(true); setAnswerText(''); }}
                    style={{ background: '#722ed1', borderColor: '#722ed1' }}
                >
                    Thêm câu trả lời
                </Button>
            </div>

            {replies.length === 0 ? (
                <div style={{
                    background: '#fff', borderRadius: 14, padding: '32px 0', textAlign: 'center',
                    color: '#aaa', fontSize: 14, boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}>
                    💬 Chưa có câu trả lời nào.
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {replies.map((reply, idx) => {
                        const isShop = reply.user?.is_admin;
                        return (
                            <div
                                key={reply.id}
                                style={{
                                    display: 'flex',
                                    gap: 14,
                                    background: '#fff',
                                    borderRadius: 12,
                                    border: `1.5px solid ${
                                        reply.status === 'pending' ? '#ffd591'
                                            : reply.is_hidden ? '#d9d9d9'
                                            : isShop ? '#efdbff'
                                            : '#b7eb8f'
                                    }`,
                                    padding: '16px 20px',
                                    boxShadow: '0 1px 6px rgba(0,0,0,0.04)',
                                    position: 'relative',
                                }}
                            >
                                {/* Thread line indicator */}
                                <div style={{
                                    position: 'absolute', left: 34, top: -14, bottom: -14,
                                    width: 2,
                                    background: idx === 0 ? 'transparent' : '#e8e8e8',
                                    zIndex: 0,
                                }} />

                                <Avatar
                                    src={reply.user?.avatar || undefined}
                                    icon={!reply.user?.avatar ? <UserOutlined /> : undefined}
                                    size={36}
                                    style={{
                                        flexShrink: 0,
                                        zIndex: 1,
                                        border: isShop ? '2px solid #722ed1' : undefined,
                                    }}
                                />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    {/* Header row */}
                                    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        <span style={{ fontWeight: 600, fontSize: 14 }}>
                                            {reply.user?.fullname ?? '—'}
                                        </span>
                                        {isShop && <Tag color="purple">Shop</Tag>}
                                        <Tag color={statusConfig[reply.status]?.color} style={{ fontSize: 11 }}>
                                            {statusConfig[reply.status]?.label}
                                        </Tag>
                                        {reply.is_hidden && (
                                            <Tag color="default" icon={<EyeInvisibleOutlined />} style={{ fontSize: 11 }}>Đã ẩn</Tag>
                                        )}
                                        <span style={{ fontSize: 12, color: '#aaa', marginLeft: 'auto' }}>
                                            🕐 {new Date(reply.created_at).toLocaleString('vi-VN')}
                                        </span>
                                    </div>

                                    {/* Full reply content */}
                                    <div style={{
                                        background: reply.status === 'pending' ? '#fffbe6'
                                            : isShop ? '#f9f0ff'
                                            : '#f6ffed',
                                        borderRadius: 8,
                                        padding: '12px 14px',
                                        fontSize: 14,
                                        lineHeight: 1.7,
                                        color: '#1a1a2e',
                                        whiteSpace: 'pre-wrap',
                                        wordBreak: 'break-word',
                                        marginBottom: 12,
                                    }}>
                                        <MessageOutlined style={{
                                            color: isShop ? '#722ed1' : '#52c41a',
                                            marginRight: 8, fontSize: 13,
                                        }} />
                                        {reply.content}
                                    </div>

                                    {/* Actions */}
                                    <ActionBar item={reply} isReply={true} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* ── Answer Modal ─────────────────────────────────────────────────── */}
            <Modal
                open={answerOpen}
                onCancel={() => { setAnswerOpen(false); setAnswerText(''); }}
                onOk={handlePostAnswer}
                confirmLoading={answerSubmitting}
                okText={<><SendOutlined style={{ marginRight: 4 }} />Gửi câu trả lời</>}
                cancelText="Huỷ"
                title={
                    <Space>
                        <SendOutlined style={{ color: '#722ed1' }} />
                        <span>Trả lời câu hỏi #{data.id}</span>
                    </Space>
                }
                width={560}
            >
                <div style={{
                    background: '#f0f5ff', border: '1px solid #adc6ff', borderRadius: 10,
                    padding: '12px 16px', marginBottom: 16,
                }}>
                    <div style={{ fontSize: 11, color: '#1677ff', fontWeight: 700, marginBottom: 4 }}>
                        ❓ CÂU HỎI TỪ: {data.user?.fullname?.toUpperCase() ?? 'KHÁCH'}
                    </div>
                    <div style={{ fontSize: 13, color: '#1a1a2e', lineHeight: 1.6, fontStyle: 'italic' }}>
                        "{data.content}"
                    </div>
                </div>
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>✍️ Nội dung câu trả lời của Shop:</div>
                <Input.TextArea
                    rows={5}
                    placeholder="Nhập câu trả lời chi tiết, thân thiện với khách hàng..."
                    value={answerText}
                    onChange={e => setAnswerText(e.target.value)}
                    maxLength={2000}
                    showCount
                    style={{ borderRadius: 8 }}
                />
                <div style={{ fontSize: 12, color: '#aaa', marginTop: 6 }}>
                    💡 Câu trả lời sẽ được hiển thị công khai sau khi được duyệt.
                </div>
            </Modal>
        </div>
    );
}

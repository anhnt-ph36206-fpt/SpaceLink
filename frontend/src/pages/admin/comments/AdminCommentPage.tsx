import { useEffect, useState, useCallback } from 'react';
import {
    Table, Button, Space, Input, Tag, Tooltip, Typography,
    Card, Row, Col, Select, Popconfirm, Avatar, Modal, message,
} from 'antd';
import {
    QuestionCircleOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined,
    EyeInvisibleOutlined, EyeOutlined, UserOutlined, CheckCircleOutlined,
    CloseCircleOutlined, ExclamationCircleOutlined, LinkOutlined,
    MessageOutlined, SendOutlined, EyeFilled,
} from '@ant-design/icons';
import { axiosInstance } from '../../../api/axios';
import { Link, useNavigate } from 'react-router-dom';
import { usePermission } from '../../../hooks/usePermission';

const { Title } = Typography;

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface QuestionItem {
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

interface PaginationState { current: number; total: number; pageSize: number; pending: number; }

// ─── Status config ────────────────────────────────────────────────────────────

const statusConfig: Record<string, { color: string; label: string }> = {
    pending: { color: 'orange', label: 'Chờ duyệt' },
    approved: { color: 'green', label: 'Đã duyệt' },
    rejected: { color: 'red', label: 'Đã từ chối' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminCommentPage() {
    const navigate = useNavigate();
    const [questions, setQuestions] = useState<QuestionItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [actionLoading, setActionLoading] = useState<number | null>(null);
    const { canDelete } = usePermission();

    // Filters
    const [keyword, setKeyword] = useState('');
    const [status, setStatus] = useState<string | undefined>();
    const [isHidden, setIsHidden] = useState<string | undefined>();

    const [pagination, setPagination] = useState<PaginationState>({
        current: 1, total: 0, pageSize: 15, pending: 0,
    });

    // Answer modal
    const [answerModal, setAnswerModal] = useState<QuestionItem | null>(null);
    const [answerText, setAnswerText] = useState('');
    const [answerSubmitting, setAnswerSubmitting] = useState(false);

    // ── Fetch ──────────────────────────────────────────────────────────────────
    const fetchQuestions = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const res = await axiosInstance.get('/admin/comments', {
                params: {
                    page,
                    per_page: pagination.pageSize,
                    keyword: keyword || undefined,
                    status: status || undefined,
                    is_hidden: isHidden || undefined,
                },
            });
            setQuestions(res.data.data ?? []);
            const meta = res.data.meta ?? {};
            setPagination(prev => ({
                ...prev,
                current: meta.current_page ?? page,
                total: meta.total ?? 0,
                pending: meta.pending ?? 0,
            }));
        } catch {
            message.error('Không thể tải danh sách.');
        } finally {
            setLoading(false);
        }
    }, [keyword, status, isHidden, pagination.pageSize]);

    useEffect(() => { fetchQuestions(1); }, []);

    const handleReset = () => {
        setKeyword(''); setStatus(undefined); setIsHidden(undefined);
        setTimeout(() => fetchQuestions(1), 0);
    };

    // ── Generic status update helper ──────────────────────────────────────────
    const patchQuestionLocal = (id: number, patch: Partial<QuestionItem>) =>
        setQuestions(prev => prev.map(q => q.id === id ? { ...q, ...patch } : q));

    const patchReplyLocal = (questionId: number, replyId: number, patch: Partial<ReplyItem>) =>
        setQuestions(prev => prev.map(q =>
            q.id === questionId
                ? { ...q, allReplies: q.allReplies?.map(r => r.id === replyId ? { ...r, ...patch } : r) }
                : q
        ));

    // ── Approve ────────────────────────────────────────────────────────────────
    const handleApprove = async (id: number, parentId?: number) => {
        setActionLoading(id);
        try {
            await axiosInstance.patch(`/admin/comments/${id}/approve`);
            message.success('Đã duyệt thành công.');
            if (parentId) patchReplyLocal(parentId, id, { status: 'approved', is_hidden: false });
            else {
                patchQuestionLocal(id, { status: 'approved', is_hidden: false });
                setPagination(prev => ({ ...prev, pending: Math.max(0, prev.pending - 1) }));
            }
        } catch (err: any) {
            message.error(err?.response?.data?.message ?? 'Lỗi khi duyệt.');
        } finally { setActionLoading(null); }
    };

    // ── Reject ─────────────────────────────────────────────────────────────────
    const handleReject = async (id: number, parentId?: number) => {
        setActionLoading(id);
        try {
            await axiosInstance.patch(`/admin/comments/${id}/reject`);
            message.success('Đã từ chối.');
            if (parentId) patchReplyLocal(parentId, id, { status: 'rejected' });
            else {
                patchQuestionLocal(id, { status: 'rejected' });
                setPagination(prev => ({ ...prev, pending: Math.max(0, prev.pending - 1) }));
            }
        } catch (err: any) {
            message.error(err?.response?.data?.message ?? 'Lỗi khi từ chối.');
        } finally { setActionLoading(null); }
    };

    // ── Toggle hide ────────────────────────────────────────────────────────────
    const handleToggleHide = async (id: number, parentId?: number) => {
        setActionLoading(id);
        try {
            const res = await axiosInstance.patch(`/admin/comments/${id}/toggle-hide`);
            const newHidden: boolean = res.data.is_hidden;
            message.success(newHidden ? 'Đã ẩn.' : 'Đã hiện.');
            if (parentId) patchReplyLocal(parentId, id, { is_hidden: newHidden });
            else patchQuestionLocal(id, { is_hidden: newHidden });
        } catch (err: any) {
            message.error(err?.response?.data?.message ?? 'Lỗi khi đổi trạng thái.');
        } finally { setActionLoading(null); }
    };

    // ── Delete ─────────────────────────────────────────────────────────────────
    const handleDelete = async (id: number, parentId?: number) => {
        setActionLoading(id);
        try {
            await axiosInstance.delete(`/admin/comments/${id}`);
            message.success('Đã xoá.');
            if (parentId) {
                setQuestions(prev => prev.map(q =>
                    q.id === parentId
                        ? { ...q, allReplies: q.allReplies?.filter(r => r.id !== id) }
                        : q
                ));
            } else {
                setQuestions(prev => prev.filter(q => q.id !== id));
                setPagination(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
            }
        } catch (err: any) {
            message.error(err?.response?.data?.message ?? 'Lỗi khi xoá.');
        } finally { setActionLoading(null); }
    };

    // ── Admin answer ──────────────────────────────────────────────────────────
    const handlePostAnswer = async () => {
        if (!answerModal) return;
        const trimmed = answerText.trim();
        if (trimmed.length < 2) { message.warning('Câu trả lời quá ngắn.'); return; }
        setAnswerSubmitting(true);
        try {
            await axiosInstance.post('/client/comments', {
                product_id: answerModal.product_id,
                parent_id: answerModal.id,
                content: trimmed,
            });
            message.success('Đã gửi câu trả lời thành công!');
            setAnswerModal(null);
            setAnswerText('');
            fetchQuestions(pagination.current);
        } catch (err: any) {
            message.error(err?.response?.data?.message ?? 'Lỗi khi gửi câu trả lời.');
        } finally { setAnswerSubmitting(false); }
    };

    // ── Inline action buttons (shared) ────────────────────────────────────────
    const ActionButtons = ({ record, parentId }: { record: QuestionItem | ReplyItem; parentId?: number }) => {
        const busy = actionLoading === record.id;
        return (
            <Space size={4} wrap>
                {record.status === 'pending' && (
                    <>
                        <Tooltip title="Duyệt">
                            <Button size="small" type="primary" icon={<CheckCircleOutlined />}
                                loading={busy} onClick={() => handleApprove(record.id, parentId)}
                                style={{ background: '#52c41a', borderColor: '#52c41a' }} />
                        </Tooltip>
                        <Tooltip title="Từ chối">
                            <Button size="small" danger ghost icon={<CloseCircleOutlined />}
                                loading={busy} onClick={() => handleReject(record.id, parentId)} />
                        </Tooltip>
                    </>
                )}
                {record.status === 'approved' && (
                    <Tooltip title={record.is_hidden ? 'Bỏ ẩn' : 'Ẩn'}>
                        <Button size="small" type="dashed"
                            icon={record.is_hidden ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                            loading={busy} onClick={() => handleToggleHide(record.id, parentId)} />
                    </Tooltip>
                )}
                {record.status === 'rejected' && (
                    <Tooltip title="Duyệt lại">
                        <Button size="small" type="primary" icon={<CheckCircleOutlined />}
                            loading={busy} onClick={() => handleApprove(record.id, parentId)}
                            style={{ background: '#52c41a', borderColor: '#52c41a' }} />
                    </Tooltip>
                )}
                {canDelete && (
                    <Popconfirm
                        title="Xoá vĩnh viễn?" icon={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
                        onConfirm={() => handleDelete(record.id, parentId)} okText="Xoá" okType="danger" cancelText="Huỷ"
                    >
                        <Tooltip title="Xoá">
                            <Button size="small" danger icon={<DeleteOutlined />} loading={busy} />
                        </Tooltip>
                    </Popconfirm>
                )}
            </Space>
        );
    };

    // ── Expanded reply rows ────────────────────────────────────────────────────
    const expandedRowRender = (question: QuestionItem) => {
        const replies = question.allReplies ?? [];
        if (replies.length === 0) {
            return (
                <div style={{ padding: '12px 16px 12px 48px', color: '#aaa', fontSize: 13 }}>
                    💬 Chưa có câu trả lời nào.
                    <Button
                        size="small" type="link" icon={<SendOutlined />}
                        onClick={() => { setAnswerModal(question); setAnswerText(''); }}
                        style={{ marginLeft: 8 }}
                    >
                        Trả lời ngay
                    </Button>
                </div>
            );
        }

        return (
            <div style={{ padding: '8px 16px 8px 48px' }}>
                {replies.map((reply, idx) => (
                    <div
                        key={reply.id}
                        style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: 12,
                            padding: '10px 14px',
                            marginBottom: idx < replies.length - 1 ? 8 : 0,
                            background: reply.status === 'pending' ? '#fffbe6' : reply.is_hidden ? '#fafafa' : '#f6ffed',
                            border: `1px solid ${reply.status === 'pending' ? '#ffd591' : reply.is_hidden ? '#d9d9d9' : '#b7eb8f'}`,
                            borderRadius: 8,
                        }}
                    >
                        {/* Avatar */}
                        <Avatar
                            src={reply.user?.avatar || undefined}
                            icon={!reply.user?.avatar ? <UserOutlined /> : undefined}
                            size={28}
                            style={{ flexShrink: 0, marginTop: 2 }}
                        />
                        {/* Content */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                                <span style={{ fontWeight: 600, fontSize: 13 }}>
                                    {reply.user?.fullname ?? '—'}
                                    {reply.user?.is_admin && (
                                        <Tag color="purple" style={{ marginLeft: 6, fontSize: 10 }}>Shop</Tag>
                                    )}
                                </span>
                                <Tag color={statusConfig[reply.status]?.color} style={{ fontSize: 11 }}>
                                    {statusConfig[reply.status]?.label}
                                </Tag>
                                {reply.is_hidden && <Tag color="default" icon={<EyeInvisibleOutlined />} style={{ fontSize: 11 }}>Ẩn</Tag>}
                                <span style={{ fontSize: 11, color: '#aaa', marginLeft: 'auto' }}>
                                    {new Date(reply.created_at).toLocaleString('vi-VN')}
                                </span>
                            </div>
                            <div style={{
                                fontSize: 13, color: '#333', lineHeight: 1.6,
                                display: '-webkit-box', WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical', overflow: 'hidden',
                            }}>
                                <MessageOutlined style={{ color: '#52c41a', marginRight: 6, fontSize: 12 }} />
                                {reply.content}
                            </div>
                        </div>
                        {/* Actions */}
                        <div style={{ flexShrink: 0 }}>
                            <ActionButtons record={reply} parentId={question.id} />
                        </div>
                    </div>
                ))}
                {/* Add answer button */}
                <div style={{ marginTop: 10 }}>
                    <Button
                        size="small" type="dashed" icon={<SendOutlined />}
                        onClick={() => { setAnswerModal(question); setAnswerText(''); }}
                        style={{ color: '#722ed1', borderColor: '#722ed1' }}
                    >
                        Thêm câu trả lời
                    </Button>
                </div>
            </div>
        );
    };

    // ── Main columns ──────────────────────────────────────────────────────────
    const columns = [
        {
            title: 'Người hỏi',
            key: 'user',
            width: 160,
            render: (_: any, r: QuestionItem) => (
                <Space>
                    <Avatar src={r.user?.avatar || undefined}
                        icon={!r.user?.avatar ? <UserOutlined /> : undefined} size={30} />
                    <span style={{ fontWeight: 600, fontSize: 13 }}>{r.user?.fullname ?? '—'}</span>
                </Space>
            ),
        },
        {
            title: 'Sản phẩm',
            key: 'product',
            width: 180,
            render: (_: any, r: QuestionItem) => (
                <Tooltip title={r.product?.name}>
                    <Link to={`/product/${r.product_id}`} target="_blank"
                        style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                        <LinkOutlined style={{ fontSize: 11, flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                            {r.product?.name ?? `#${r.product_id}`}
                        </span>
                    </Link>
                </Tooltip>
            ),
        },
        {
            title: 'Câu hỏi',
            key: 'content',
            render: (_: any, r: QuestionItem) => (
                <div style={{ fontSize: 13, color: '#2d2d2d', lineHeight: 1.55 }}>
                    <span style={{
                        display: '-webkit-box', WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden',
                    }}>
                        {r.content}
                    </span>
                    <div style={{marginTop: 4}}>
                        <Tag color="green" style={{fontSize: 10}}>{r.allReplies?.length ?? 0} câu trả
                            lời
                        </Tag>
                        <Tag color="orange" style={{fontSize: 10, marginLeft: 8}}>
                            {r.allReplies!.filter(x => x.status === 'pending').length} chờ duyệt
                        </Tag>
                    </div>
                </div>
            ),
        },
        {
            title: 'Trạng thái',
            key: 'status',
            align: 'center' as const,
            width: 120,
            render: (_: any, r: QuestionItem) => (
                <Space direction="vertical" size={4} align="center">
                    <Tag color={statusConfig[r.status]?.color}>{statusConfig[r.status]?.label}</Tag>
                    {r.is_hidden && <Tag color="default" icon={<EyeInvisibleOutlined />}>Đã ẩn</Tag>}
                </Space>
            ),
        },
        {
            title: 'Thời gian',
            dataIndex: 'created_at',
            key: 'created_at',
            align: 'center' as const,
            width: 100,
            render: (val: string) => val ? (
                <div style={{ fontSize: 12, color: '#8590a3', lineHeight: 1.45 }}>
                    {new Date(val).toLocaleDateString('vi-VN')}<br />
                    {new Date(val).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </div>
            ) : '—',
        },
        {
            title: 'Hành động',
            key: 'action',
            align: 'center' as const,
            width: 200,
            render: (_: any, r: QuestionItem) => (
                <Space size={4} wrap>
                    {/* View detail */}
                    <Tooltip title="Xem chi tiết">
                        <Button
                            size="small" type="default" icon={<EyeFilled />}
                            onClick={() => navigate(`/admin/comments/${r.id}`)}
                        />
                    </Tooltip>
                    {/* Reply */}
                    <Tooltip title="Trả lời">
                        <Button size="small" type="primary" icon={<SendOutlined />}
                            onClick={() => { setAnswerModal(r); setAnswerText(''); }}
                            style={{ background: '#722ed1', borderColor: '#722ed1' }}
                        />
                    </Tooltip>
                    {/* Approve / Reject for pending */}
                    <ActionButtons record={r} />
                </Space>
            ),
        },
    ];

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div style={{ padding: 24, background: '#f5f6fa', minHeight: 'calc(100vh - 84px)' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <Title level={4} style={{ margin: 0 }}>
                        <QuestionCircleOutlined style={{ marginRight: 10, color: '#1677ff' }} />
                        Quản lý Hỏi &amp; Đáp
                    </Title>
                    {pagination.pending > 0 && (
                        <span
                            style={{
                                background: '#fff7e6', border: '1px solid #ffd591', borderRadius: 8,
                                padding: '2px 10px', fontSize: 12, color: '#d46b08', fontWeight: 600, cursor: 'pointer',
                            }}
                            onClick={() => { setStatus('pending'); setTimeout(() => fetchQuestions(1), 0); }}
                        >
                            ⏳ {pagination.pending} chờ duyệt
                        </span>
                    )}
                </div>
            </div>

            {/* Filters */}
            <Card
                style={{ marginBottom: 16, borderRadius: 10, border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}
                bodyStyle={{ padding: '12px 16px' }}
            >
                <Row gutter={[12, 12]} align="middle">
                    <Col flex="auto">
                        <Input
                            placeholder="Tìm nội dung câu hỏi..."
                            prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                            value={keyword}
                            onChange={e => setKeyword(e.target.value)}
                            onPressEnter={() => fetchQuestions(1)}
                            allowClear
                        />
                    </Col>
                    <Col>
                        <Select
                            placeholder="Trạng thái" allowClear style={{ width: 150 }} value={status}
                            onChange={v => setStatus(v)}
                            options={[
                                { value: 'pending', label: '⏳ Chờ duyệt' },
                                { value: 'approved', label: '✅ Đã duyệt' },
                                { value: 'rejected', label: '❌ Đã từ chối' },
                            ]}
                        />
                    </Col>
                    <Col>
                        <Select
                            placeholder="Hiển thị" allowClear style={{ width: 150 }} value={isHidden}
                            onChange={v => setIsHidden(v)}
                            options={[
                                { value: 'false', label: '👁 Đang hiển thị' },
                                { value: 'true', label: '🙈 Đang ẩn' },
                            ]}
                        />
                    </Col>
                    <Col>
                        <Space>
                            <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchQuestions(1)}>Lọc</Button>
                            <Button icon={<ReloadOutlined />} onClick={handleReset}>Reset</Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* Table */}
            <Card style={{ borderRadius: 10, border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }} bodyStyle={{ padding: 0 }}>
                <Table
                    columns={columns}
                    dataSource={questions}
                    rowKey="id"
                    loading={loading}
                    style={{ borderRadius: 10, overflow: 'hidden' }}
                    rowClassName={r => r.status === 'pending' ? 'comment-row-pending' : ''}
                    expandable={{
                        expandedRowRender,
                        rowExpandable: () => true,
                        expandRowByClick: false,
                        defaultExpandAllRows: false,
                    }}
                    pagination={{
                        current: pagination.current,
                        total: pagination.total,
                        pageSize: pagination.pageSize,
                        showSizeChanger: false,
                        showTotal: t => `Tổng ${t} câu hỏi`,
                        onChange: page => fetchQuestions(page),
                    }}
                    scroll={{ x: 980 }}
                    locale={{
                        emptyText: (
                            <div style={{ padding: '32px 0', color: '#bbb', fontSize: 14 }}>
                                ❓ Chưa có câu hỏi nào
                            </div>
                        ),
                    }}
                />
            </Card>

            {/* ── Answer Modal ─────────────────────────────────────────────────── */}
            <Modal
                open={!!answerModal}
                onCancel={() => { setAnswerModal(null); setAnswerText(''); }}
                onOk={handlePostAnswer}
                confirmLoading={answerSubmitting}
                okText={<><SendOutlined className="me-1" />Gửi câu trả lời</>}
                cancelText="Huỷ"
                title={
                    <Space>
                        <SendOutlined style={{ color: '#722ed1' }} />
                        <span>Trả lời câu hỏi</span>
                    </Space>
                }
                width={560}
            >
                {answerModal && (
                    <>
                        {/* Question preview */}
                        <div
                            style={{
                                background: '#f0f5ff', border: '1px solid #adc6ff', borderRadius: 10,
                                padding: '12px 16px', marginBottom: 16,
                            }}
                        >
                            <div style={{ fontSize: 11, color: '#1677ff', fontWeight: 700, marginBottom: 4 }}>
                                ❓ CÂU HỎI TỪ: {answerModal.user?.fullname?.toUpperCase() ?? 'KHÁCH'}
                            </div>
                            <div style={{ fontSize: 14, color: '#1a1a2e', lineHeight: 1.65, fontStyle: 'italic' }}>
                                "{answerModal.content}"
                            </div>
                            <div style={{ marginTop: 6 }}>
                                <Link to={`/product/${answerModal.product_id}`} target="_blank"
                                    style={{ fontSize: 12, color: '#1677ff' }}>
                                    <LinkOutlined className="me-1" />
                                    {answerModal.product?.name ?? `Sản phẩm #${answerModal.product_id}`}
                                </Link>
                            </div>
                        </div>

                        {/* Answer input */}
                        <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>
                            ✍️ Nội dung câu trả lời của Shop:
                        </div>
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
                    </>
                )}
            </Modal>

            {/* Style */}
            <style>{`
                .comment-row-pending > td { background: #fffbe6 !important; }
                .comment-row-pending:hover > td { background: #fff8d6 !important; }
            `}</style>
        </div>
    );
}

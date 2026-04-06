import { useEffect, useState, useCallback } from 'react';
import {
    Table, Button, Space, Input, Tag, Tooltip, Typography,
    Card, Row, Col, Select, Popconfirm, Avatar, Modal, message, Tabs,
} from 'antd';
import {
    QuestionCircleOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined,
    EyeInvisibleOutlined, EyeOutlined, UserOutlined, CheckCircleOutlined,
    CloseCircleOutlined, ExclamationCircleOutlined, LinkOutlined,
    MessageOutlined, SendOutlined,
} from '@ant-design/icons';
import { axiosInstance } from '../../../api/axios';
import { Link } from 'react-router-dom';

const { Title, Text } = Typography;

// ─── Types ────────────────────────────────────────────────────────────────────

interface CommentUser { id: number; fullname: string; avatar?: string | null; }
interface CommentProduct { id: number; name: string; }

interface CommentItem {
    id: number;
    content: string;
    status: 'pending' | 'approved' | 'rejected';
    is_hidden: boolean;
    parent_id: number | null;
    user_id: number;
    product_id: number;
    created_at: string;
    user?: CommentUser;
    product?: CommentProduct;
}

interface PaginationState { current: number; total: number; pageSize: number; pending: number; }

// ─── Status config ────────────────────────────────────────────────────────────

const statusConfig: Record<string, { color: string; label: string }> = {
    pending:  { color: 'orange', label: 'Chờ duyệt'  },
    approved: { color: 'green',  label: 'Đã duyệt'   },
    rejected: { color: 'red',    label: 'Đã từ chối' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminCommentPage() {
    const [activeTab, setActiveTab] = useState<'questions' | 'answers'>('questions');
    const [comments, setComments]   = useState<CommentItem[]>([]);
    const [loading, setLoading]     = useState(false);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    // Filters
    const [keyword,  setKeyword]  = useState('');
    const [status,   setStatus]   = useState<string | undefined>();
    const [isHidden, setIsHidden] = useState<string | undefined>();

    const [pagination, setPagination] = useState<PaginationState>({
        current: 1, total: 0, pageSize: 15, pending: 0,
    });

    // Detail / Answer modals
    const [detailComment, setDetailComment] = useState<CommentItem | null>(null);
    const [answerModal, setAnswerModal]     = useState<CommentItem | null>(null);
    const [answerText, setAnswerText]       = useState('');
    const [answerSubmitting, setAnswerSubmitting] = useState(false);

    // ── Fetch ──────────────────────────────────────────────────────────────────
    const fetchComments = useCallback(async (page = 1) => {
        setLoading(true);
        try {
            const res = await axiosInstance.get('/admin/comments', {
                params: {
                    page,
                    per_page: pagination.pageSize,
                    keyword:   keyword  || undefined,
                    status:    status   || undefined,
                    is_hidden: isHidden || undefined,
                    // parent_id: null → top-level (questions), else replies (answers)
                    type: activeTab === 'questions' ? 'question' : 'answer',
                },
            });
            setComments(res.data.data ?? []);
            const meta = res.data.meta ?? {};
            setPagination(prev => ({
                ...prev,
                current: meta.current_page ?? page,
                total:   meta.total        ?? 0,
                pending: meta.pending      ?? 0,
            }));
        } catch {
            message.error('Không thể tải danh sách.');
        } finally {
            setLoading(false);
        }
    }, [keyword, status, isHidden, pagination.pageSize, activeTab]);

    useEffect(() => { fetchComments(1); }, [activeTab]);

    const handleReset = () => {
        setKeyword(''); setStatus(undefined); setIsHidden(undefined);
        setTimeout(() => fetchComments(1), 0);
    };

    // ── Approve ────────────────────────────────────────────────────────────────
    const handleApprove = async (id: number) => {
        setActionLoading(id);
        try {
            await axiosInstance.patch(`/admin/comments/${id}/approve`);
            message.success('Đã duyệt thành công.');
            setComments(prev => prev.map(c => c.id === id ? { ...c, status: 'approved', is_hidden: false } : c));
            setPagination(prev => ({ ...prev, pending: Math.max(0, prev.pending - 1) }));
            if (detailComment?.id === id) setDetailComment(d => d ? { ...d, status: 'approved' } : d);
        } catch (err: any) {
            message.error(err?.response?.data?.message ?? 'Lỗi khi duyệt.');
        } finally { setActionLoading(null); }
    };

    // ── Reject ─────────────────────────────────────────────────────────────────
    const handleReject = async (id: number) => {
        setActionLoading(id);
        try {
            await axiosInstance.patch(`/admin/comments/${id}/reject`);
            message.success('Đã từ chối.');
            setComments(prev => prev.map(c => c.id === id ? { ...c, status: 'rejected' } : c));
            setPagination(prev => ({ ...prev, pending: Math.max(0, prev.pending - 1) }));
            if (detailComment?.id === id) setDetailComment(d => d ? { ...d, status: 'rejected' } : d);
        } catch (err: any) {
            message.error(err?.response?.data?.message ?? 'Lỗi khi từ chối.');
        } finally { setActionLoading(null); }
    };

    // ── Toggle hide ────────────────────────────────────────────────────────────
    const handleToggleHide = async (id: number) => {
        setActionLoading(id);
        try {
            const res = await axiosInstance.patch(`/admin/comments/${id}/toggle-hide`);
            const newHidden: boolean = res.data.is_hidden;
            message.success(newHidden ? 'Đã ẩn.' : 'Đã hiện.');
            setComments(prev => prev.map(c => c.id === id ? { ...c, is_hidden: newHidden } : c));
            if (detailComment?.id === id) setDetailComment(d => d ? { ...d, is_hidden: newHidden } : d);
        } catch (err: any) {
            message.error(err?.response?.data?.message ?? 'Lỗi khi đổi trạng thái.');
        } finally { setActionLoading(null); }
    };

    // ── Delete ─────────────────────────────────────────────────────────────────
    const handleDelete = async (id: number) => {
        setActionLoading(id);
        try {
            await axiosInstance.delete(`/admin/comments/${id}`);
            message.success('Đã xoá.');
            setComments(prev => prev.filter(c => c.id !== id));
            setPagination(prev => ({ ...prev, total: Math.max(0, prev.total - 1) }));
            if (detailComment?.id === id) setDetailComment(null);
        } catch (err: any) {
            message.error(err?.response?.data?.message ?? 'Lỗi khi xoá.');
        } finally { setActionLoading(null); }
    };

    // ── Admin answer (POST as client with parent_id) ───────────────────────────
    const handlePostAnswer = async () => {
        if (!answerModal) return;
        const trimmed = answerText.trim();
        if (trimmed.length < 2) { message.warning('Câu trả lời quá ngắn.'); return; }
        setAnswerSubmitting(true);
        try {
            await axiosInstance.post('/client/comments', {
                product_id: answerModal.product_id,
                parent_id:  answerModal.id,
                content:    trimmed,
            });
            message.success('Đã gửi câu trả lời thành công!');
            setAnswerModal(null);
            setAnswerText('');
            fetchComments(pagination.current);
        } catch (err: any) {
            message.error(err?.response?.data?.message ?? 'Lỗi khi gửi câu trả lời.');
        } finally { setAnswerSubmitting(false); }
    };

    // ── Action columns (shared between Q & A tabs) ────────────────────────────
    const actionColumn = {
        title: 'Hành động',
        key: 'action',
        align: 'center' as const,
        width: 200,
        render: (_: any, record: CommentItem) => {
            const busy = actionLoading === record.id;
            return (
                <Space size={4} wrap>
                    {record.status !== 'approved' && (
                        <Tooltip title="Duyệt">
                            <Button size="small" type="primary" icon={<CheckCircleOutlined />}
                                loading={busy} onClick={() => handleApprove(record.id)}
                                style={{ background: '#52c41a', borderColor: '#52c41a' }} />
                        </Tooltip>
                    )}
                    {record.status !== 'rejected' && (
                        <Tooltip title="Từ chối">
                            <Button size="small" danger ghost icon={<CloseCircleOutlined />}
                                loading={busy} onClick={() => handleReject(record.id)} />
                        </Tooltip>
                    )}
                    {activeTab === 'questions' && (
                        <Tooltip title="Trả lời câu hỏi này">
                            <Button size="small" type="primary" icon={<SendOutlined />}
                                loading={busy}
                                onClick={() => { setAnswerModal(record); setAnswerText(''); }}
                                style={{ background: '#722ed1', borderColor: '#722ed1' }}
                            />
                        </Tooltip>
                    )}
                    <Tooltip title={record.is_hidden ? 'Bỏ ẩn' : 'Ẩn'}>
                        <Button size="small" type="dashed"
                            icon={record.is_hidden ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                            loading={busy} onClick={() => handleToggleHide(record.id)} />
                    </Tooltip>
                    <Popconfirm
                        title="Xoá vĩnh viễn?" icon={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
                        onConfirm={() => handleDelete(record.id)} okText="Xoá" okType="danger" cancelText="Huỷ"
                    >
                        <Tooltip title="Xoá">
                            <Button size="small" danger icon={<DeleteOutlined />} loading={busy} />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            );
        },
    };

    // ── Base columns ──────────────────────────────────────────────────────────
    const baseColumns = [
        {
            title: 'Người dùng',
            key: 'user',
            width: 180,
            render: (_: any, r: CommentItem) => (
                <Space>
                    <Avatar src={r.user?.avatar || undefined}
                        icon={!r.user?.avatar ? <UserOutlined /> : undefined} size={32} />
                    <span style={{ fontWeight: 600, fontSize: 13 }}>
                        {r.user?.fullname ?? '—'}
                    </span>
                </Space>
            ),
        },
        {
            title: 'Sản phẩm',
            key: 'product',
            width: 200,
            render: (_: any, r: CommentItem) => (
                <Tooltip title={r.product?.name}>
                    <Link to={`/product/${r.product_id}`} target="_blank"
                        style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, maxWidth: 200 }}>
                        <LinkOutlined style={{ fontSize: 11, flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {r.product?.name ?? `#${r.product_id}`}
                        </span>
                    </Link>
                </Tooltip>
            ),
        },
        {
            title: activeTab === 'questions' ? 'Câu hỏi' : 'Câu trả lời',
            key: 'content',
            render: (_: any, r: CommentItem) => (
                <div
                    style={{
                        maxWidth: 380, fontSize: 13, color: '#2d2d2d', lineHeight: 1.55,
                        display: '-webkit-box', WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical', overflow: 'hidden', cursor: 'pointer',
                    }}
                    onClick={() => setDetailComment(r)} title="Click xem đầy đủ"
                >
                    {activeTab === 'questions' && (
                        <span style={{ color: '#0d6efd', fontWeight: 700, marginRight: 4 }}>Q:</span>
                    )}
                    {activeTab === 'answers' && (
                        <span style={{ color: '#52c41a', fontWeight: 700, marginRight: 4 }}>A:</span>
                    )}
                    {r.content}
                </div>
            ),
        },
        {
            title: 'Trạng thái',
            key: 'status',
            align: 'center' as const,
            width: 130,
            render: (_: any, r: CommentItem) => (
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
            width: 110,
            render: (val: string) => val ? (
                <div style={{ fontSize: 12, color: '#8590a3', lineHeight: 1.45 }}>
                    {new Date(val).toLocaleDateString('vi-VN')}<br />
                    {new Date(val).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </div>
            ) : '—',
        },
        actionColumn,
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
                            onClick={() => { setStatus('pending'); setTimeout(() => fetchComments(1), 0); }}
                        >
                            ⏳ {pagination.pending} chờ duyệt
                        </span>
                    )}
                </div>
            </div>

            {/* Tabs: Questions / Answers */}
            <Tabs
                activeKey={activeTab}
                onChange={k => { setActiveTab(k as 'questions' | 'answers'); }}
                style={{ marginBottom: 0 }}
                items={[
                    {
                        key: 'questions',
                        label: (
                            <span>
                                <QuestionCircleOutlined style={{ marginRight: 6 }} />
                                Câu hỏi
                            </span>
                        ),
                    },
                    {
                        key: 'answers',
                        label: (
                            <span>
                                <MessageOutlined style={{ marginRight: 6 }} />
                                Câu trả lời
                            </span>
                        ),
                    },
                ]}
            />

            {/* Filters */}
            <Card
                style={{ marginBottom: 16, borderRadius: 10, border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }}
                bodyStyle={{ padding: '12px 16px' }}
            >
                <Row gutter={[12, 12]} align="middle">
                    <Col flex="auto">
                        <Input
                            placeholder={activeTab === 'questions' ? 'Tìm nội dung câu hỏi...' : 'Tìm nội dung câu trả lời...'}
                            prefix={<SearchOutlined style={{ color: '#bbb' }} />}
                            value={keyword}
                            onChange={e => setKeyword(e.target.value)}
                            onPressEnter={() => fetchComments(1)}
                            allowClear
                        />
                    </Col>
                    <Col>
                        <Select
                            placeholder="Trạng thái" allowClear style={{ width: 150 }} value={status}
                            onChange={v => setStatus(v)}
                            options={[
                                { value: 'pending',  label: '⏳ Chờ duyệt'  },
                                { value: 'approved', label: '✅ Đã duyệt'   },
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
                                { value: 'true',  label: '🙈 Đang ẩn'       },
                            ]}
                        />
                    </Col>
                    <Col>
                        <Space>
                            <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchComments(1)}>Lọc</Button>
                            <Button icon={<ReloadOutlined />} onClick={handleReset}>Reset</Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* Table */}
            <Card style={{ borderRadius: 10, border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.04)' }} bodyStyle={{ padding: 0 }}>
                <Table
                    columns={baseColumns}
                    dataSource={comments}
                    rowKey="id"
                    loading={loading}
                    style={{ borderRadius: 10, overflow: 'hidden' }}
                    rowClassName={r => r.status === 'pending' ? 'comment-row-pending' : ''}
                    pagination={{
                        current:  pagination.current,
                        total:    pagination.total,
                        pageSize: pagination.pageSize,
                        showSizeChanger: false,
                        showTotal: t => `Tổng ${t} ${activeTab === 'questions' ? 'câu hỏi' : 'câu trả lời'}`,
                        onChange:  page => fetchComments(page),
                    }}
                    scroll={{ x: 980 }}
                    locale={{
                        emptyText: (
                            <div style={{ padding: '32px 0', color: '#bbb', fontSize: 14 }}>
                                {activeTab === 'questions'
                                    ? '❓ Chưa có câu hỏi nào'
                                    : '💬 Chưa có câu trả lời nào'
                                }
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

            {/* ── Detail Modal ─────────────────────────────────────────────────── */}
            <Modal
                open={!!detailComment}
                onCancel={() => setDetailComment(null)}
                footer={null}
                title={
                    <Space>
                        {detailComment?.parent_id ? <MessageOutlined style={{ color: '#52c41a' }} /> : <QuestionCircleOutlined style={{ color: '#1677ff' }} />}
                        <span>{detailComment?.parent_id ? 'Chi tiết câu trả lời' : 'Chi tiết câu hỏi'} #{detailComment?.id}</span>
                    </Space>
                }
                width={520}
            >
                {detailComment && (
                    <div>
                        {/* User */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                            <Avatar src={detailComment.user?.avatar || undefined}
                                icon={!detailComment.user?.avatar ? <UserOutlined /> : undefined} size={40} />
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 14 }}>{detailComment.user?.fullname ?? '—'}</div>
                                <div style={{ fontSize: 12, color: '#8590a3' }}>
                                    {new Date(detailComment.created_at).toLocaleString('vi-VN')}
                                </div>
                            </div>
                            <div style={{ marginLeft: 'auto', display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                <Tag color={statusConfig[detailComment.status]?.color}>{statusConfig[detailComment.status]?.label}</Tag>
                                {detailComment.is_hidden && <Tag color="default" icon={<EyeInvisibleOutlined />}>Ẩn</Tag>}
                            </div>
                        </div>
                        {/* Product */}
                        <div style={{ marginBottom: 10, fontSize: 13 }}>
                            <Text type="secondary">Sản phẩm: </Text>
                            <Link to={`/product/${detailComment.product_id}`} target="_blank">
                                {detailComment.product?.name ?? `#${detailComment.product_id}`}
                                <LinkOutlined style={{ marginLeft: 4, fontSize: 11 }} />
                            </Link>
                        </div>
                        {/* Content */}
                        <div
                            style={{
                                background: detailComment.parent_id ? '#f6ffed' : '#f0f5ff',
                                border: `1px solid ${detailComment.parent_id ? '#b7eb8f' : '#adc6ff'}`,
                                borderRadius: 10, padding: '14px 16px',
                                fontSize: 14.5, lineHeight: 1.7, color: '#1a1a2e',
                                whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginBottom: 20,
                                fontStyle: 'italic',
                            }}
                        >
                            <span style={{ color: detailComment.parent_id ? '#52c41a' : '#1677ff', fontWeight: 700, marginRight: 6 }}>
                                {detailComment.parent_id ? 'A:' : 'Q:'}
                            </span>
                            {detailComment.content}
                        </div>
                        {/* Actions */}
                        <Space wrap>
                            {detailComment.status !== 'approved' && (
                                <Button type="primary" icon={<CheckCircleOutlined />}
                                    loading={actionLoading === detailComment.id}
                                    onClick={() => handleApprove(detailComment.id)}
                                    style={{ background: '#52c41a', borderColor: '#52c41a' }}>
                                    Duyệt
                                </Button>
                            )}
                            {detailComment.status !== 'rejected' && (
                                <Button danger ghost icon={<CloseCircleOutlined />}
                                    loading={actionLoading === detailComment.id}
                                    onClick={() => handleReject(detailComment.id)}>
                                    Từ chối
                                </Button>
                            )}
                            {!detailComment.parent_id && (
                                <Button type="primary" icon={<SendOutlined />}
                                    style={{ background: '#722ed1', borderColor: '#722ed1' }}
                                    onClick={() => { setDetailComment(null); setAnswerModal(detailComment); setAnswerText(''); }}>
                                    Trả lời câu hỏi
                                </Button>
                            )}
                            <Button type="dashed"
                                icon={detailComment.is_hidden ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                                loading={actionLoading === detailComment.id}
                                onClick={() => handleToggleHide(detailComment.id)}>
                                {detailComment.is_hidden ? 'Bỏ ẩn' : 'Ẩn'}
                            </Button>
                            <Popconfirm title="Xoá vĩnh viễn?"
                                icon={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
                                onConfirm={() => handleDelete(detailComment.id)}
                                okText="Xoá" okType="danger" cancelText="Huỷ">
                                <Button danger icon={<DeleteOutlined />} loading={actionLoading === detailComment.id}>Xoá</Button>
                            </Popconfirm>
                        </Space>
                    </div>
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

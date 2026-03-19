import { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Input, message, Tag, Rate, Tooltip, Typography, Card, Row, Col, Select, Popconfirm, Avatar } from 'antd';
import { CommentOutlined, DeleteOutlined, ExclamationCircleOutlined, SearchOutlined, ReloadOutlined, EyeInvisibleOutlined, EyeOutlined, UserOutlined } from '@ant-design/icons';
import { axiosInstance } from '../../../api/axios';

const { confirm } = Modal;
const { TextArea } = Input;
const { Title, Text } = Typography;

export default function AdminReviewPage() {
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Filters
    const [search, setSearch] = useState('');
    const [rating, setRating] = useState<number | undefined>();
    const [isHidden, setIsHidden] = useState<string | undefined>();
    const [pagination, setPagination] = useState({ current: 1, total: 0, pageSize: 15 });

    // Reply Modal state
    const [isReplyModalOpen, setIsReplyModalOpen] = useState(false);
    const [currentReview, setCurrentReview] = useState<any>(null);
    const [replyContent, setReplyContent] = useState('');
    const [submittingReply, setSubmittingReply] = useState(false);

    const fetchReviews = async (page = 1) => {
        setLoading(true);
        try {
            const res = await axiosInstance.get('/admin/reviews', {
                params: {
                    page,
                    per_page: pagination.pageSize,
                    search: search || undefined,
                    rating: rating || undefined,
                    is_hidden: isHidden || undefined
                }
            });
            const data = res.data.data;
            if (data && data.data) {
                // Laravel pagination format
                setReviews(data.data);
                setPagination({
                    current: data.current_page,
                    total: data.total,
                    pageSize: data.per_page,
                });
            } else {
                setReviews(data || []);
            }
        } catch (err) {
            message.error('Không thể tải danh sách đánh giá');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchReviews();
    }, []);

    const handleReset = () => {
        setSearch('');
        setRating(undefined);
        setIsHidden(undefined);
        setTimeout(() => fetchReviews(1), 0);
    };

    const handleDelete = (id: number) => {
        confirm({
            title: 'Hành động này không thể hoàn tác!',
            icon: <ExclamationCircleOutlined />,
            content: 'Bạn có chắc chắn muốn xóa vĩnh viễn đánh giá này?',
            okText: 'Xóa',
            okType: 'danger',
            cancelText: 'Hủy',
            onOk: async () => {
                try {
                    await axiosInstance.delete(`/admin/reviews/${id}`);
                    message.success('Đã xóa đánh giá thành công');
                    fetchReviews(pagination.current);
                } catch (err) {
                    message.error('Lỗi khi xóa đánh giá');
                }
            },
        });
    };

    const handleToggleVisibility = async (id: number) => {
        try {
            const res = await axiosInstance.patch(`/admin/reviews/${id}/toggle-visibility`);
            message.success(res.data?.message || 'Đã cập nhật trạng thái hiển thị');
            setReviews((prev: any) => prev.map((r: any) => r.id === id ? { ...r, is_hidden: !r.is_hidden } : r));
        } catch (err: any) {
            message.error('Không thể cập nhật trạng thái hiển thị');
        }
    };

    const openReplyModal = (record: any) => {
        setCurrentReview(record);
        setReplyContent(record.admin_reply || '');
        setIsReplyModalOpen(true);
    };

    const handleReply = async () => {
        if (!replyContent.trim()) {
            message.warning('Vui lòng nhập nội dung trả lời');
            return;
        }
        setSubmittingReply(true);
        // Try PATCH first based on ReviewController's docblock, fallback to POST
        try {
            await axiosInstance.patch(`/admin/reviews/${currentReview.id}/reply`, {
                admin_reply: replyContent
            });
            message.success('Đã gửi phản hồi thành công');
            setIsReplyModalOpen(false);
            setReviews((prev: any) => prev.map((r: any) => r.id === currentReview.id ? { ...r, admin_reply: replyContent } : r));
        } catch (err: any) {
            if (err.response?.status === 405) {
                try {
                    await axiosInstance.post(`/admin/reviews/${currentReview.id}/reply`, {
                        admin_reply: replyContent
                    });
                    message.success('Đã gửi phản hồi thành công');
                    setIsReplyModalOpen(false);
                    setReviews((prev: any) => prev.map((r: any) => r.id === currentReview.id ? { ...r, admin_reply: replyContent } : r));
                } catch(e: any) {
                    message.error(e.response?.data?.message || 'Có lỗi xảy ra khi gửi phản hồi');
                }
            } else {
                message.error(err.response?.data?.message || 'Có lỗi xảy ra khi gửi phản hồi');
            }
        } finally {
            setSubmittingReply(false);
        }
    };

    const columns = [
        {
            title: 'Khách hàng',
            key: 'user',
            render: (_: any, record: any) => {
                const name = record.user?.fullname || record.user?.name || 'Khách ẩn danh';
                return (
                    <Space>
                        <Avatar icon={<UserOutlined />} src={record.user?.avatar} />
                        <div style={{ fontWeight: 600 }}>{name}</div>
                    </Space>
                );
            }
        },
        {
            title: 'Sản phẩm',
            key: 'product',
            render: (_: any, record: any) => {
                const name = record.product?.name || record.orderItem?.product_name || 'Sản phẩm';
                return <Tooltip title={name}><div style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500, color: '#1677ff' }}>{name}</div></Tooltip>;
            }
        },
        {
            title: 'Đánh giá',
            key: 'rating',
            width: 300,
            render: (_: any, record: any) => (
                <div>
                   <Rate disabled value={record.rating} style={{ fontSize: 13, color: '#faad14' }} />
                   <div style={{ marginTop: 6, fontStyle: 'italic', color: '#5a6275', fontSize: 13 }}>{record.content || <Text type="secondary">Chỉ chấm điểm, không để lại nhận xét.</Text>}</div>
                   {record.admin_reply && (
                       <div style={{ marginTop: 8, padding: '6px 10px', background: '#f6ffed', border: '1px solid #b7eb8f', borderRadius: 4, fontSize: 12 }}>
                           <span style={{ fontWeight: 600, color: '#389e0d' }}>Shop phản hồi: </span>
                           {record.admin_reply}
                       </div>
                   )}
                </div>
            )
        },
        {
            title: 'Trạng thái',
            key: 'status',
            align: 'center' as const,
            render: (_: any, record: any) => {
                return (
                    <Space direction="vertical" size={4} align="center">
                        {record.admin_reply ? <Tag color="green">Đã trả lời</Tag> : <Tag color="orange">Chưa trả lời</Tag>}
                        <Tooltip title={record.is_hidden ? "Đang bị ẩn" : "Đang hiển thị công khai"}>
                            <Tag color={record.is_hidden ? 'default' : 'geekblue'} icon={record.is_hidden ? <EyeInvisibleOutlined /> : <EyeOutlined />}>
                                {record.is_hidden ? 'Đã ẩn' : 'Hiển thị'}
                            </Tag>
                        </Tooltip>
                    </Space>
                );
            }
        },
        {
            title: 'Ngày gửi',
            dataIndex: 'created_at',
            key: 'created_at',
            align: 'center' as const,
            render: (val: string) => val ? (
                <div style={{ fontSize: 13, color: '#8590a3' }}>
                    {new Date(val).toLocaleDateString('vi-VN')}
                    <br />
                    {new Date(val).toLocaleTimeString('vi-VN')}
                </div>
            ) : '',
        },
        {
            title: 'Hành động',
            key: 'action',
            align: 'center' as const,
            render: (_: any, record: any) => (
                <Space>
                    <Tooltip title={record.is_hidden ? "Hiện đánh giá" : "Ẩn đánh giá"}>
                        <Button 
                            size="small"
                            type="dashed"
                            danger={!record.is_hidden}
                            icon={record.is_hidden ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                            onClick={() => handleToggleVisibility(record.id)}
                        />
                    </Tooltip>
                    <Tooltip title={record.admin_reply ? 'Sửa câu trả lời' : 'Trả lời khách'}>
                        <Button 
                            type="primary" 
                            size="small" 
                            icon={<CommentOutlined />} 
                            onClick={() => openReplyModal(record)}
                            ghost={!!record.admin_reply}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Bạn có chắc chắn muốn xóa vĩnh viễn?"
                        onConfirm={() => handleDelete(record.id)}
                        okText="Xóa"
                        okType="danger"
                        cancelText="Hủy"
                    >
                        <Button danger size="small" icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            )
        }
    ];

    return (
        <div style={{ padding: 24, background: '#f5f6fa', minHeight: 'calc(100vh - 84px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Title level={4} style={{ margin: 0 }}>
                    <CommentOutlined style={{ marginRight: 10, color: '#1677ff' }} />
                    Quản lý Đánh giá
                </Title>
            </div>

            <Card style={{ marginBottom: 16, borderRadius: 10, border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                <Row gutter={[12, 12]} align="middle">
                    <Col flex="auto">
                        <Input
                            placeholder="Tìm nội dung, tên khách, sản phẩm..."
                            prefix={<SearchOutlined />}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onPressEnter={() => fetchReviews(1)}
                            allowClear
                        />
                    </Col>
                    <Col>
                        <Select
                            placeholder="Tất cả đánh giá"
                            allowClear
                            style={{ width: 140 }}
                            value={rating}
                            onChange={v => setRating(v)}
                            options={[
                                { value: 5, label: '5 Sao' },
                                { value: 4, label: '4 Sao' },
                                { value: 3, label: '3 Sao' },
                                { value: 2, label: '2 Sao' },
                                { value: 1, label: '1 Sao' },
                            ]}
                        />
                    </Col>
                    <Col>
                        <Select
                            placeholder="Trạng thái hiển thị"
                            allowClear
                            style={{ width: 160 }}
                            value={isHidden}
                            onChange={v => setIsHidden(v)}
                            options={[
                                { value: 'false', label: 'Đang hiển thị' },
                                { value: 'true', label: 'Đang ẩn' },
                            ]}
                        />
                    </Col>
                    <Col>
                        <Space>
                            <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchReviews(1)}>Lọc</Button>
                            <Button icon={<ReloadOutlined />} onClick={handleReset}>Reset</Button>
                        </Space>
                    </Col>
                </Row>
            </Card>
            
            <Table 
                columns={columns} 
                dataSource={reviews} 
                rowKey="id" 
                loading={loading}
                style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}
                pagination={{
                    current: pagination.current,
                    total: pagination.total,
                    pageSize: pagination.pageSize,
                    showSizeChanger: false,
                    showTotal: (total) => `Tổng ${total} đánh giá`,
                    onChange: (page) => fetchReviews(page),
                }}
                scroll={{ x: 'max-content' }}
            />

            <Modal
                title={<div><CommentOutlined style={{ color: '#0d6efd', marginRight: 8 }} />{currentReview?.admin_reply ? 'Sửa câu trả lời' : 'Trả lời đánh giá'}</div>}
                open={isReplyModalOpen}
                onOk={handleReply}
                onCancel={() => setIsReplyModalOpen(false)}
                confirmLoading={submittingReply}
                okText="Gửi phản hồi"
                cancelText="Hủy"
            >
                {currentReview && (
                    <div style={{ marginBottom: 16, padding: 14, background: '#f8f9fa', borderRadius: 8, border: '1px solid #e9ecef' }}>
                        <div style={{ fontWeight: 700, marginBottom: 4 }}>Khách hàng: {currentReview.user?.fullname || currentReview.user?.name || 'Khách'}</div>
                        <Rate disabled value={currentReview.rating} style={{ fontSize: 13, marginBottom: 8, color: '#faad14' }} />
                        <div style={{ fontStyle: 'italic', color: '#5a6275', fontSize: 13, background: '#fff', padding: '8px 12px', borderRadius: 6, border: '1px solid #dee2e6' }}>
                            "{currentReview.content || 'Không có nhận xét'}"
                        </div>
                    </div>
                )}
                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Nội dung phản hồi của Shop:</div>
                <TextArea 
                    rows={4} 
                    placeholder="VD: Cảm ơn bạn đã tin tưởng ủng hộ Shop..." 
                    value={replyContent}
                    onChange={e => setReplyContent(e.target.value)}
                    style={{ borderRadius: 6 }}
                />
            </Modal>
        </div>
    );
}

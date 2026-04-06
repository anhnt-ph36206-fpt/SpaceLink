import { useEffect, useState } from 'react';
import { Table, Button, Space, Modal, Input, message, Tag, Tooltip, Typography, Card, Row, Col, Select, Avatar, Drawer, Form } from 'antd';
import { CustomerServiceOutlined, EyeOutlined, SearchOutlined, ReloadOutlined, UserOutlined, FileImageOutlined } from '@ant-design/icons';
import { axiosInstance } from '../../../api/axios';

const { TextArea } = Input;
const { Title, Text } = Typography;

export default function AdminComplaintPage() {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(false);
    
    // Filters
    const [status, setStatus] = useState<string | undefined>();
    const [pagination, setPagination] = useState({ current: 1, total: 0, pageSize: 15 });

    // Drawer state
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [currentComplaint, setCurrentComplaint] = useState<any>(null);
    const [submitting, setSubmitting] = useState(false);
    
    const [form] = Form.useForm();

    const fetchComplaints = async (page = 1) => {
        setLoading(true);
        try {
            const res = await axiosInstance.get('/admin/complaints', {
                params: {
                    page,
                    per_page: pagination.pageSize,
                    status: status || undefined
                }
            });
            const data = res.data.data;
            if (data && data.data) {
                setComplaints(data.data);
                setPagination({
                    current: data.current_page,
                    total: data.total,
                    pageSize: data.per_page,
                });
            } else {
                setComplaints(data || []);
            }
        } catch (err) {
            message.error('Không thể tải danh sách khiếu nại');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchComplaints();
    }, [status]);

    const handleReset = () => {
        setStatus(undefined);
        setTimeout(() => fetchComplaints(1), 0);
    };

    const openComplaintDrawer = async (record: any) => {
        setLoading(true);
        try {
            const res = await axiosInstance.get(`/admin/complaints/${record.id}`);
            const data = res.data.data;
            setCurrentComplaint(data);
            form.setFieldsValue({
                status: data.status,
                admin_reply: data.admin_reply || ''
            });
            setIsDrawerOpen(true);
        } catch (err) {
            message.error('Không thể tải chi tiết khiếu nại');
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateComplaint = async (values: any) => {
        if (!currentComplaint) return;
        setSubmitting(true);
        try {
            await axiosInstance.put(`/admin/complaints/${currentComplaint.id}`, {
                status: values.status,
                admin_reply: values.admin_reply
            });
            message.success('Cập nhật khiếu nại thành công');
            setIsDrawerOpen(false);
            fetchComplaints(pagination.current);
        } catch (err: any) {
            message.error(err.response?.data?.message || 'Có lỗi xảy ra khi cập nhật');
        } finally {
            setSubmitting(false);
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'wrong_item': return 'Sai sản phẩm/biến thể';
            case 'damaged': return 'Sản phẩm hư hỏng';
            case 'late_delivery': return 'Giao hàng chậm';
            case 'payment_issue': return 'Vấn đề thanh toán';
            default: return 'Khác';
        }
    };

    const getStatusTag = (status: string) => {
        switch (status) {
            case 'pending': return <Tag color="warning">Chờ xử lý</Tag>;
            case 'processing': return <Tag color="processing">Đang xử lý</Tag>;
            case 'resolved': return <Tag color="success">Đã giải quyết</Tag>;
            case 'rejected': return <Tag color="error">Từ chối</Tag>;
            default: return <Tag>{status}</Tag>;
        }
    };

    const columns = [
        {
            title: 'Mã ĐH',
            dataIndex: ['order', 'order_code'],
            key: 'order_code',
            render: (text: string) => <Text strong>{text}</Text>
        },
        {
            title: 'Khách hàng',
            key: 'user',
            render: (_: any, record: any) => {
                const name = record.user?.fullname || record.user?.name || 'Khách';
                return (
                    <Space>
                        <Avatar icon={<UserOutlined />} src={record.user?.avatar} size="small" />
                        <span>{name}</span>
                    </Space>
                );
            }
        },
        {
            title: 'Loại / Tiêu đề',
            key: 'subject',
            render: (_: any, record: any) => (
                <div>
                    <div><Text strong>{getTypeLabel(record.type)}</Text></div>
                    <div style={{ fontSize: 13, color: '#5a6275' }}>{record.subject}</div>
                </div>
            )
        },
        {
            title: 'Trạng thái',
            dataIndex: 'status',
            key: 'status',
            render: (status: string) => getStatusTag(status)
        },
        {
            title: 'Ngày gửi',
            dataIndex: 'created_at',
            key: 'created_at',
            render: (val: string) => val ? new Date(val).toLocaleDateString('vi-VN') : ''
        },
        {
            title: 'Hành động',
            key: 'action',
            align: 'center' as const,
            render: (_: any, record: any) => (
                <Tooltip title="Xem và Xử lý">
                    <Button 
                        type="primary" 
                        size="small" 
                        icon={<EyeOutlined />} 
                        onClick={() => openComplaintDrawer(record)}
                        ghost={record.status === 'resolved' || record.status === 'rejected'}
                    />
                </Tooltip>
            )
        }
    ];

    return (
        <div style={{ padding: 24, background: '#f5f6fa', minHeight: 'calc(100vh - 84px)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Title level={4} style={{ margin: 0 }}>
                    <CustomerServiceOutlined style={{ marginRight: 10, color: '#1677ff' }} />
                    Quản lý Khiếu nại
                </Title>
            </div>

            <Card style={{ marginBottom: 16, borderRadius: 10, border: 'none', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
                <Row gutter={[12, 12]} align="middle">
                    <Col>
                        <Select
                            placeholder="Tất cả trạng thái"
                            allowClear
                            style={{ width: 160 }}
                            value={status}
                            onChange={v => setStatus(v)}
                            options={[
                                { value: 'pending', label: 'Chờ xử lý' },
                                { value: 'processing', label: 'Đang xử lý' },
                                { value: 'resolved', label: 'Đã giải quyết' },
                                { value: 'rejected', label: 'Từ chối' },
                            ]}
                        />
                    </Col>
                    <Col>
                        <Button icon={<ReloadOutlined />} onClick={handleReset}>Làm mới</Button>
                    </Col>
                </Row>
            </Card>
            
            <Table 
                columns={columns} 
                dataSource={complaints} 
                rowKey="id" 
                loading={loading}
                style={{ background: '#fff', borderRadius: 10, boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}
                pagination={{
                    current: pagination.current,
                    total: pagination.total,
                    pageSize: pagination.pageSize,
                    showSizeChanger: false,
                    showTotal: (total) => `Tổng ${total} khiếu nại`,
                    onChange: (page) => fetchComplaints(page),
                }}
                scroll={{ x: 'max-content' }}
            />

            <Drawer
                title={
                    <Space>
                        <CustomerServiceOutlined style={{ color: '#1677ff' }} />
                        <span>Chi tiết khiếu nại {currentComplaint?.order?.order_code ? `#${currentComplaint.order.order_code}` : ''}</span>
                    </Space>
                }
                width={500}
                open={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                extra={
                    getStatusTag(currentComplaint?.status)
                }
            >
                {currentComplaint && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                        {/* TT Khách */}
                        <div style={{ background: '#f8f9fa', padding: 16, borderRadius: 8, border: '1px solid #e9ecef' }}>
                            <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13, textTransform: 'uppercase', color: '#8590a3' }}>Thông tin khách hàng</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <Avatar src={currentComplaint.user?.avatar} icon={<UserOutlined />} />
                                <div>
                                    <div style={{ fontWeight: 600 }}>{currentComplaint.user?.fullname || currentComplaint.user?.name}</div>
                                    <div style={{ fontSize: 13, color: '#5a6275' }}>{currentComplaint.user?.email} • {currentComplaint.user?.phone}</div>
                                </div>
                            </div>
                        </div>

                        {/* Nội dung khiếu nại */}
                        <div>
                            <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13, textTransform: 'uppercase', color: '#8590a3' }}>Nội dung khiếu nại</div>
                            <div style={{ marginBottom: 12 }}>
                                <div style={{ fontSize: 12, color: '#8590a3' }}>Loại vấn đề</div>
                                <Text strong>{getTypeLabel(currentComplaint.type)}</Text>
                            </div>
                            <div style={{ marginBottom: 12 }}>
                                <div style={{ fontSize: 12, color: '#8590a3' }}>Tiêu đề</div>
                                <Text>{currentComplaint.subject}</Text>
                            </div>
                            <div>
                                <div style={{ fontSize: 12, color: '#8590a3' }}>Mô tả chi tiết</div>
                                <div style={{ background: '#f0f9ff', padding: 12, borderRadius: 6, fontSize: 13, whiteSpace: 'pre-line' }}>
                                    {currentComplaint.content}
                                </div>
                            </div>
                        </div>

                        {/* Hình ảnh */}
                        {currentComplaint.images && currentComplaint.images.length > 0 && (
                            <div>
                                <div style={{ fontWeight: 600, marginBottom: 8, fontSize: 13, textTransform: 'uppercase', color: '#8590a3' }}>Hình ảnh đính kèm</div>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                                    {currentComplaint.images.map((img: string, i: number) => (
                                        <a key={i} href={img} target="_blank" rel="noreferrer">
                                            <div style={{ width: 80, height: 80, borderRadius: 8, overflow: 'hidden', border: '1px solid #eaecf0', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#fafafa' }}>
                                                <img src={img} alt={`ev-${i}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                            </div>
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Xử lý của Admin */}
                        <div style={{ borderTop: '1px solid #eaecf0', paddingTop: 20 }}>
                            <div style={{ fontWeight: 600, marginBottom: 16, fontSize: 14 }}>Xử lý khiếu nại</div>
                            <Form form={form} layout="vertical" onFinish={handleUpdateComplaint}>
                                <Form.Item 
                                    name="status" 
                                    label="Trạng thái xử lý" 
                                    rules={[{ required: true, message: 'Vui lòng chọn trạng thái' }]}
                                >
                                    <Select>
                                        <Select.Option value="pending">Chờ xử lý</Select.Option>
                                        <Select.Option value="processing">Đang xử lý</Select.Option>
                                        <Select.Option value="resolved">Đã giải quyết</Select.Option>
                                        <Select.Option value="rejected">Từ chối giải quyết</Select.Option>
                                    </Select>
                                </Form.Item>
                                
                                <Form.Item 
                                    name="admin_reply" 
                                    label="Phản hồi cho khách hàng"
                                    rules={[{ required: true, message: 'Vui lòng nhập phản hồi' }]}
                                >
                                    <TextArea 
                                        rows={4} 
                                        placeholder="Nhập nội dung phản hồi. Khách hàng sẽ nhìn thấy nội dung này..." 
                                    />
                                </Form.Item>

                                <Form.Item>
                                    <Button type="primary" htmlType="submit" loading={submitting} block>
                                        Cập nhật trạng thái
                                    </Button>
                                </Form.Item>
                            </Form>
                        </div>
                    </div>
                )}
            </Drawer>
        </div>
    );
}

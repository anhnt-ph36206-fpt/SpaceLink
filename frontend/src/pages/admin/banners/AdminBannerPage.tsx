import React, { useEffect, useState } from 'react';
import {
    Table, Button, Modal, Form, Input, Switch, Space, Tag,
    Typography, Popconfirm, Card, Row, Col, Upload, InputNumber,
    DatePicker, type UploadFile, Select
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    SearchOutlined, PictureOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { axiosInstance } from '../../../api/axios.ts';
import { toast } from 'react-toastify';
import type { UploadProps } from 'antd';
import { bannerPrefix } from '../../../api/apiAdminPrefix.ts';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const FALLBACK_IMG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='96' height='56' viewBox='0 0 96 56'%3E%3Crect width='96' height='56' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='10' fill='%23aaa'%3ENo Image%3C/text%3E%3C/svg%3E`;

interface Banner {
    id: number;
    title: string;
    image_url: string;
    image_full_url: string;  // full URL trả về từ backend accessor
    description?: string | null;
    link_url?: string | null;
    display_order: number;
    start_date?: string | null;
    end_date?: string | null;
    is_active: boolean;
}

// Dùng image_full_url do backend trả về (absolute URL từ accessor)
const getImageSrc = (banner: Banner) => banner.image_full_url || banner.image_url || '';

const AdminBannerPage: React.FC = () => {
    const [banners, setBanners] = useState<Banner[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingItem, setEditingItem] = useState<Banner | null>(null);
    const [form] = Form.useForm();
    const [search, setSearch] = useState('');
    const [filterActive, setFilterActive] = useState<number | undefined>(undefined);
    const [fileList, setFileList] = useState<UploadFile[]>([]);

    const fetchBanners = async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get(bannerPrefix);
            setBanners(res.data.data ?? []);
        } catch {
            toast.error('Không thể tải danh sách banner');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchBanners(); }, []);

    const openAdd = () => {
        setEditingItem(null);
        form.resetFields();
        form.setFieldsValue({ is_active: true, display_order: 0 });
        setFileList([]);
        setModalOpen(true);
    };

    const openEdit = (item: Banner) => {
        setEditingItem(item);
        form.setFieldsValue({
            title: item.title,
            description: item.description,
            link_url: item.link_url,
            display_order: item.display_order,
            is_active: item.is_active,
            start_date: item.start_date ? dayjs(item.start_date) : null,
            end_date: item.end_date ? dayjs(item.end_date) : null,
        });
        if (item.image_url) {
            setFileList([{
                uid: '-1',
                name: 'banner',
                status: 'done',
                url: getImageSrc(item),
            }]);
        } else {
            setFileList([]);
        }
        setModalOpen(true);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);

            const formData = new FormData();
            formData.append('title', values.title);
            formData.append('is_active', values.is_active ? '1' : '0');
            formData.append('display_order', String(values.display_order ?? 0));
            if (values.description) formData.append('description', values.description);
            if (values.link_url) formData.append('link_url', values.link_url);
            if (values.start_date) formData.append('start_date', values.start_date.format('YYYY-MM-DD HH:mm:ss'));
            if (values.end_date) formData.append('end_date', values.end_date.format('YYYY-MM-DD HH:mm:ss'));

            // Upload file mới
            if (fileList.length > 0 && fileList[0].originFileObj) {
                formData.append('image', fileList[0].originFileObj);
            }

            if (editingItem) {
                formData.append('_method', 'PUT');
                await axiosInstance.post(`${bannerPrefix}/${editingItem.id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                toast.success('Cập nhật banner thành công');
            } else {
                await axiosInstance.post(bannerPrefix, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                toast.success('Thêm banner thành công');
            }

            setModalOpen(false);
            setFileList([]);
            fetchBanners();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await axiosInstance.delete(`${bannerPrefix}/${id}`);
            toast.success('Đã xóa banner');
            fetchBanners();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Xóa thất bại');
        }
    };

    const handleToggle = async (id: number) => {
        try {
            await axiosInstance.patch(`${bannerPrefix}/${id}/toggle`);
            toast.success('Đã cập nhật trạng thái');
            fetchBanners();
        } catch {
            toast.error('Thao tác thất bại');
        }
    };

    const uploadProps: UploadProps = {
        listType: 'picture-card',
        maxCount: 1,
        beforeUpload: () => false,
        fileList,
        onChange: ({ fileList: fl }) => setFileList(fl),
        onRemove: () => setFileList([]),
        accept: 'image/*',
    };

    const filtered = banners.filter(b => {
        const matchSearch = b.title.toLowerCase().includes(search.toLowerCase());
        const matchActive = filterActive === undefined || (b.is_active ? 1 : 0) === filterActive;
        return matchSearch && matchActive;
    });

    const columns: ColumnsType<Banner> = [
        {
            title: 'Ảnh',
            key: 'image',
            width: 120,
            render: (_, r) => (
                <img
                    src={getImageSrc(r)}
                    alt={r.title}
                    style={{
                        width: 96,
                        height: 56,
                        objectFit: 'cover',
                        borderRadius: 8,
                        border: '1px solid #f0f0f0',
                        background: '#f5f5f5',
                    }}
                    onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
                />
            ),
        },
        {
            title: 'Tiêu đề',
            key: 'title',
            render: (_, r) => (
                <div>
                    <div style={{ fontWeight: 600, marginBottom: 2 }}>{r.title}</div>
                    {r.link_url && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            🔗 {r.link_url}
                        </Text>
                    )}
                </div>
            ),
        },
        {
            title: 'Thứ tự',
            dataIndex: 'display_order',
            width: 90,
            align: 'center',
            sorter: (a, b) => a.display_order - b.display_order,
        },
        {
            title: 'Thời gian',
            key: 'dates',
            width: 190,
            render: (_, r) => (
                <div style={{ fontSize: 12 }}>
                    <div>Từ: {r.start_date ? dayjs(r.start_date).format('DD/MM/YYYY') : <Text type="secondary">Không giới hạn</Text>}</div>
                    <div>Đến: {r.end_date ? dayjs(r.end_date).format('DD/MM/YYYY') : <Text type="secondary">Không giới hạn</Text>}</div>
                </div>
            ),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'is_active',
            width: 130,
            align: 'center',
            render: (v: boolean, r) => (
                <Tag
                    color={v ? 'success' : 'default'}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleToggle(r.id)}
                    title="Click để bật/tắt"
                >
                    {v ? '✅ Hoạt động' : '⏸ Tắt'}
                </Tag>
            ),
        },
        {
            title: 'Hành động',
            width: 110,
            align: 'center',
            render: (_, r) => (
                <Space>
                    <Button
                        type="primary" ghost size="small"
                        icon={<EditOutlined />}
                        onClick={() => openEdit(r)}
                    />
                    <Popconfirm
                        title="Xóa banner này?"
                        onConfirm={() => handleDelete(r.id)}
                        okText="Xóa" cancelText="Hủy"
                    >
                        <Button danger size="small" icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <Title level={4} style={{ margin: 0, color: '#1a1a2e' }}>
                    <PictureOutlined style={{ marginRight: 10, color: '#0d6efd' }} />
                    Quản lí Banner
                </Title>
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={openAdd}
                    style={{
                        background: 'linear-gradient(135deg,#0d6efd,#084298)',
                        border: 'none', borderRadius: 10, height: 40, fontWeight: 600,
                        boxShadow: '0 4px 12px rgba(13,110,253,0.35)',
                    }}
                >
                    Thêm banner
                </Button>
            </div>

            {/* Filters */}
            <Card style={{ marginBottom: 20 }}>
                <Row gutter={12}>
                    <Col span={10}>
                        <Input
                            placeholder="Tìm kiếm tiêu đề banner..."
                            prefix={<SearchOutlined />}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            allowClear
                        />
                    </Col>
                    <Col span={6}>
                        <Select
                            placeholder="Trạng thái"
                            value={filterActive}
                            onChange={setFilterActive}
                            allowClear
                            style={{ width: '100%' }}
                            options={[
                                { value: 1, label: 'Hoạt động' },
                                { value: 0, label: 'Tắt' },
                            ]}
                        />
                    </Col>
                </Row>
            </Card>

            {/* Table */}
            <Table
                columns={columns}
                dataSource={filtered}
                rowKey="id"
                loading={loading}
                bordered={false}
                pagination={{ pageSize: 10 }}
            />

            {/* Modal Add/Edit */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: 'linear-gradient(135deg,#0d6efd,#084298)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <PictureOutlined style={{ color: '#fff', fontSize: 15 }} />
                        </div>
                        <span>{editingItem ? 'Sửa banner' : 'Thêm banner mới'}</span>
                    </div>
                }
                open={modalOpen}
                onOk={handleSave}
                onCancel={() => { setModalOpen(false); setFileList([]); }}
                okText={editingItem ? 'Cập nhật' : 'Thêm mới'}
                confirmLoading={submitting}
                cancelText="Hủy"
                width={620}
                style={{ top: 40 }}
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Form.Item
                        name="title"
                        label="Tiêu đề banner"
                        rules={[{ required: true, message: 'Nhập tiêu đề banner' }]}
                    >
                        <Input placeholder="VD: Flash Sale Tháng 3, Banner Sản phẩm Mới..." />
                    </Form.Item>

                    <Form.Item label="Ảnh banner" required>
                        <Upload {...uploadProps}>
                            {fileList.length < 1 && (
                                <div>
                                    <PlusOutlined />
                                    <div style={{ marginTop: 8 }}>Upload ảnh</div>
                                </div>
                            )}
                        </Upload>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            Hỗ trợ: JPG, PNG, GIF, WebP. Tối đa 5MB. Khuyến nghị: 1200×500px
                        </Text>
                    </Form.Item>

                    <Form.Item name="link_url" label="Link URL (khi click vào banner)">
                        <Input placeholder="VD: /shop, /product/1, https://..." />
                    </Form.Item>

                    <Form.Item name="description" label="Mô tả">
                        <Input.TextArea rows={2} placeholder="Mô tả ngắn về banner..." />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="display_order" label="Thứ tự hiển thị">
                                <InputNumber min={0} style={{ width: '100%' }} placeholder="0" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="start_date" label="Ngày bắt đầu">
                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Không giới hạn" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="end_date" label="Ngày kết thúc">
                                <DatePicker style={{ width: '100%' }} format="DD/MM/YYYY" placeholder="Không giới hạn" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="is_active" label="Trạng thái" valuePropName="checked">
                        <Switch checkedChildren="Hoạt động" unCheckedChildren="Tắt" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default AdminBannerPage;

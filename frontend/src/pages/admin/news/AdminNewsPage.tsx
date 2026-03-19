import React, { useEffect, useState, useCallback } from 'react';
import {
    Table, Button, Modal, Form, Input, Switch, Space, Tag,
    Typography, Popconfirm, Card, Row, Col, Select, DatePicker,
    Upload,
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    SearchOutlined, FileTextOutlined, EyeOutlined, EyeInvisibleOutlined,
    UploadOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { axiosInstance } from '../../../api/axios';
import { toast } from 'react-toastify';
import { newsPrefix } from '../../../api/apiAdminPrefix';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface NewsItem {
    id: number;
    title: string;
    slug: string;
    summary?: string | null;
    content: string;
    thumbnail?: string | null;
    thumbnail_url?: string | null;
    is_featured: boolean;
    is_active: boolean;
    view_count: number;
    published_at: string;
    author?: { id: number; fullname: string } | null;
}

interface Pagination {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

function formatDate(d: string) {
    return d ? dayjs(d).format('DD/MM/YYYY HH:mm') : '—';
}

const FALLBACK_IMG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='50' viewBox='0 0 80 50'%3E%3Crect width='80' height='50' fill='%23f0f0f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='9' fill='%23aaa'%3ENo Img%3C/text%3E%3C/svg%3E`;

const AdminNewsPage: React.FC = () => {
    const [newsList, setNewsList] = useState<NewsItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<NewsItem | null>(null);
    const [search, setSearch] = useState('');
    const [filterActive, setFilterActive] = useState<number | undefined>(undefined);
    const [filterFeatured, setFilterFeatured] = useState<number | undefined>(undefined);
    const [pagination, setPagination] = useState<Pagination>({ current_page: 1, last_page: 1, per_page: 15, total: 0 });
    const [form] = Form.useForm();

    // ── Thumbnail upload state ────────────────────────────────────────────────
    const [thumbFile, setThumbFile] = useState<File | null>(null);
    const [thumbPreview, setThumbPreview] = useState<string | null>(null);

    // ── Fetch ──────────────────────────────────────────────────────────────────
    const fetchNews = useCallback(async (page = 1, searchVal = search) => {
        setLoading(true);
        try {
            const params: Record<string, string | number> = { page, per_page: 15 };
            if (searchVal) params.search = searchVal;
            const res = await axiosInstance.get(newsPrefix, { params });
            const data = res.data.data;
            setNewsList(data.data ?? []);
            setPagination({
                current_page: data.current_page,
                last_page: data.last_page,
                per_page: data.per_page,
                total: data.total,
            });
        } catch {
            toast.error('Không thể tải danh sách tin tức');
        } finally {
            setLoading(false);
        }
    }, [search]);

    useEffect(() => { fetchNews(1); }, []);

    // ── Filter client-side (active/featured) ──────────────────────────────────
    const filtered = newsList.filter(item => {
        const matchActive = filterActive === undefined || (item.is_active ? 1 : 0) === filterActive;
        const matchFeatured = filterFeatured === undefined || (item.is_featured ? 1 : 0) === filterFeatured;
        return matchActive && matchFeatured;
    });

    // ── Reset thumbnail state ─────────────────────────────────────────────────
    const resetThumb = () => {
        setThumbFile(null);
        setThumbPreview(null);
    };

    // ── Handlers ──────────────────────────────────────────────────────────────
    const openAdd = () => {
        setEditingItem(null);
        form.resetFields();
        form.setFieldsValue({ is_active: true, is_featured: false, published_at: dayjs() });
        resetThumb();
        setModalOpen(true);
    };

    const openEdit = (item: NewsItem) => {
        setEditingItem(item);
        form.setFieldsValue({
            title: item.title,
            summary: item.summary,
            content: item.content,
            is_featured: item.is_featured,
            is_active: item.is_active,
            published_at: item.published_at ? dayjs(item.published_at) : dayjs(),
        });
        // Show existing thumbnail as preview (no file selected yet)
        setThumbFile(null);
        setThumbPreview(item.thumbnail_url || item.thumbnail || null);
        setModalOpen(true);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);

            // Build FormData to support file upload
            const fd = new FormData();
            fd.append('title', values.title ?? '');
            fd.append('summary', values.summary ?? '');
            fd.append('content', values.content ?? '');
            fd.append('is_featured', values.is_featured ? '1' : '0');
            fd.append('is_active', values.is_active ? '1' : '0');
            if (values.published_at) {
                fd.append('published_at', (values.published_at as dayjs.Dayjs).format('YYYY-MM-DD HH:mm:ss'));
            }
            // Attach new thumbnail file if selected
            if (thumbFile) {
                fd.append('thumbnail', thumbFile);
            }

            if (editingItem) {
                fd.append('_method', 'PUT');
                await axiosInstance.post(`${newsPrefix}/${editingItem.id}`, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                toast.success('Cập nhật tin tức thành công');
            } else {
                await axiosInstance.post(newsPrefix, fd, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                toast.success('Thêm tin tức thành công');
            }

            setModalOpen(false);
            resetThumb();
            fetchNews(pagination.current_page);
        } catch (error: any) {
            if (error?.errorFields) return; // validation error
            toast.error(error?.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await axiosInstance.delete(`${newsPrefix}/${id}`);
            toast.success('Đã xóa tin tức');
            fetchNews(pagination.current_page);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Xóa thất bại');
        }
    };

    const handleToggleActive = async (item: NewsItem) => {
        try {
            const fd = new FormData();
            fd.append('is_active', item.is_active ? '0' : '1');
            fd.append('_method', 'PUT');
            await axiosInstance.post(`${newsPrefix}/${item.id}`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success('Đã cập nhật trạng thái');
            fetchNews(pagination.current_page);
        } catch {
            toast.error('Thao tác thất bại');
        }
    };

    const handleToggleFeatured = async (item: NewsItem) => {
        try {
            const fd = new FormData();
            fd.append('is_featured', item.is_featured ? '0' : '1');
            fd.append('_method', 'PUT');
            await axiosInstance.post(`${newsPrefix}/${item.id}`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });
            toast.success('Đã cập nhật nổi bật');
            fetchNews(pagination.current_page);
        } catch {
            toast.error('Thao tác thất bại');
        }
    };

    // ── Columns ──────────────────────────────────────────────────────────────
    const columns: ColumnsType<NewsItem> = [
        {
            title: 'Ảnh',
            key: 'thumbnail',
            width: 100,
            render: (_, r) => (
                <img
                    src={r.thumbnail_url || r.thumbnail || FALLBACK_IMG}
                    alt={r.title}
                    style={{ width: 80, height: 50, objectFit: 'cover', borderRadius: 6, border: '1px solid #f0f0f0' }}
                    onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
                />
            ),
        },
        {
            title: 'Tiêu đề',
            key: 'title',
            render: (_, r) => (
                <div>
                    <div style={{ fontWeight: 600, marginBottom: 2, color: '#1a1a2e' }}>{r.title}</div>
                    {r.summary && (
                        <Text type="secondary" style={{ fontSize: 12, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {r.summary}
                        </Text>
                    )}
                    <div style={{ marginTop: 4, fontSize: 11, color: '#adb5bd' }}>
                        Slug: {r.slug}
                    </div>
                </div>
            ),
        },
        {
            title: 'Tác giả',
            key: 'author',
            width: 130,
            render: (_, r) => (
                <Text style={{ fontSize: 13 }}>{r.author?.fullname || '—'}</Text>
            ),
        },
        {
            title: 'Ngày đăng',
            key: 'published_at',
            width: 140,
            sorter: (a, b) => new Date(a.published_at).getTime() - new Date(b.published_at).getTime(),
            render: (_, r) => (
                <Text style={{ fontSize: 12 }}>{formatDate(r.published_at)}</Text>
            ),
        },
        {
            title: 'Lượt xem',
            dataIndex: 'view_count',
            width: 90,
            align: 'center',
            sorter: (a, b) => a.view_count - b.view_count,
            render: (v: number) => <Text style={{ fontSize: 13 }}>{v.toLocaleString()}</Text>,
        },
        {
            title: 'Nổi bật',
            dataIndex: 'is_featured',
            width: 100,
            align: 'center',
            render: (v: boolean, r) => (
                <Tag
                    color={v ? 'gold' : 'default'}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleToggleFeatured(r)}
                    title="Click để bật/tắt nổi bật"
                >
                    {v ? '⭐ Nổi bật' : '—'}
                </Tag>
            ),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'is_active',
            width: 120,
            align: 'center',
            render: (v: boolean, r) => (
                <Tag
                    color={v ? 'success' : 'default'}
                    style={{ cursor: 'pointer' }}
                    onClick={() => handleToggleActive(r)}
                    title="Click để bật/tắt"
                    icon={v ? <EyeOutlined /> : <EyeInvisibleOutlined />}
                >
                    {v ? ' Hiển thị' : ' Ẩn'}
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
                        title="Sửa"
                    />
                    <Popconfirm
                        title="Xóa bài viết này?"
                        description="Hành động này không thể hoàn tác."
                        onConfirm={() => handleDelete(r.id)}
                        okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
                    >
                        <Button danger size="small" icon={<DeleteOutlined />} title="Xóa" />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    // ── Render ───────────────────────────────────────────────────────────────
    return (
        <div style={{ padding: 24 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <Title level={4} style={{ margin: 0, color: '#1a1a2e' }}>
                    <FileTextOutlined style={{ marginRight: 10, color: '#0d6efd' }} />
                    Quản lí Tin Tức
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
                    Thêm tin tức
                </Button>
            </div>

            {/* Filters */}
            <Card style={{ marginBottom: 20 }}>
                <Row gutter={12} align="middle">
                    <Col span={10}>
                        <Input
                            placeholder="Tìm kiếm tiêu đề bài viết..."
                            prefix={<SearchOutlined />}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onPressEnter={() => fetchNews(1, search)}
                            allowClear
                            onClear={() => { setSearch(''); fetchNews(1, ''); }}
                        />
                    </Col>
                    <Col span={5}>
                        <Select
                            placeholder="Trạng thái"
                            value={filterActive}
                            onChange={setFilterActive}
                            allowClear
                            style={{ width: '100%' }}
                            options={[
                                { value: 1, label: '👁 Hiển thị' },
                                { value: 0, label: '🚫 Đã ẩn' },
                            ]}
                        />
                    </Col>
                    <Col span={5}>
                        <Select
                            placeholder="Nổi bật"
                            value={filterFeatured}
                            onChange={setFilterFeatured}
                            allowClear
                            style={{ width: '100%' }}
                            options={[
                                { value: 1, label: '⭐ Nổi bật' },
                                { value: 0, label: 'Bình thường' },
                            ]}
                        />
                    </Col>
                    <Col span={4}>
                        <Button onClick={() => fetchNews(1, search)} style={{ width: '100%' }}>
                            Tìm kiếm
                        </Button>
                    </Col>
                </Row>
            </Card>

            {/* Stats bar */}
            <div style={{ marginBottom: 12, fontSize: 13, color: '#6c757d' }}>
                Tổng: <strong>{pagination.total}</strong> bài viết &nbsp;|&nbsp;
                Đang hiển thị: <strong>{filtered.length}</strong>
            </div>

            {/* Table */}
            <Table
                columns={columns}
                dataSource={filtered}
                rowKey="id"
                loading={loading}
                bordered={false}
                scroll={{ x: 900 }}
                pagination={{
                    current: pagination.current_page,
                    total: pagination.total,
                    pageSize: pagination.per_page,
                    showSizeChanger: false,
                    showTotal: (total) => `Tổng ${total} bài`,
                    onChange: (page) => fetchNews(page),
                }}
            />

            {/* ── Modal Thêm / Sửa ── */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: 'linear-gradient(135deg,#0d6efd,#084298)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <FileTextOutlined style={{ color: '#fff', fontSize: 15 }} />
                        </div>
                        <span>{editingItem ? 'Sửa bài viết' : 'Thêm bài viết mới'}</span>
                    </div>
                }
                open={modalOpen}
                onOk={handleSave}
                onCancel={() => { setModalOpen(false); resetThumb(); }}
                okText={editingItem ? 'Cập nhật' : 'Thêm mới'}
                confirmLoading={submitting}
                cancelText="Hủy"
                width={760}
                style={{ top: 30 }}
                styles={{ body: { maxHeight: '75vh', overflowY: 'auto', paddingRight: 4 } }}
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>

                    {/* Tiêu đề */}
                    <Form.Item
                        name="title"
                        label="Tiêu đề bài viết"
                        rules={[{ required: true, message: 'Vui lòng nhập tiêu đề' }]}
                    >
                        <Input placeholder="VD: SpaceLink ra mắt sản phẩm mới 2026..." maxLength={255} showCount />
                    </Form.Item>

                    {/* ── Thumbnail upload (giống sản phẩm) ── */}
                    <Form.Item label="Ảnh đại diện (Thumbnail)">
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
                            {/* Preview */}
                            {thumbPreview ? (
                                <div style={{ position: 'relative', flexShrink: 0 }}>
                                    <img
                                        src={thumbPreview}
                                        alt="Thumbnail preview"
                                        style={{
                                            width: 160,
                                            height: 100,
                                            objectFit: 'cover',
                                            borderRadius: 8,
                                            border: '2px solid #1677ff',
                                        }}
                                        onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG; }}
                                    />
                                    <CloseCircleOutlined
                                        style={{
                                            position: 'absolute', top: -8, right: -8,
                                            color: '#ff4d4f', cursor: 'pointer',
                                            background: '#fff', borderRadius: '50%',
                                            fontSize: 18,
                                        }}
                                        onClick={() => resetThumb()}
                                        title="Xóa ảnh"
                                    />
                                </div>
                            ) : (
                                <div style={{
                                    width: 160, height: 100, borderRadius: 8,
                                    border: '2px dashed #d9d9d9', display: 'flex',
                                    alignItems: 'center', justifyContent: 'center',
                                    color: '#bfbfbf', fontSize: 13, flexShrink: 0,
                                    background: '#fafafa',
                                }}>
                                    Chưa có ảnh
                                </div>
                            )}

                            {/* Upload button */}
                            <div>
                                <Upload
                                    accept="image/*"
                                    showUploadList={false}
                                    beforeUpload={(file) => {
                                        setThumbFile(file);
                                        setThumbPreview(URL.createObjectURL(file));
                                        return false; // prevent auto-upload
                                    }}
                                >
                                    <Button icon={<UploadOutlined />}>
                                        {thumbPreview ? 'Đổi ảnh' : 'Chọn ảnh'}
                                    </Button>
                                </Upload>
                                <Text type="secondary" style={{ display: 'block', marginTop: 8, fontSize: 12 }}>
                                    Hỗ trợ: JPG, PNG, GIF, WebP.<br />Tối đa 5MB. Khuyến nghị: 800×500px.
                                </Text>
                            </div>
                        </div>
                    </Form.Item>

                    {/* Tóm tắt */}
                    <Form.Item
                        name="summary"
                        label="Tóm tắt (excerpt)"
                        extra="Hiển thị dưới tiêu đề trong danh sách, tối đa 500 ký tự."
                    >
                        <TextArea rows={2} placeholder="Mô tả ngắn về nội dung bài viết..." maxLength={500} showCount />
                    </Form.Item>

                    {/* Nội dung */}
                    <Form.Item
                        name="content"
                        label="Nội dung bài viết"
                        rules={[{ required: true, message: 'Vui lòng nhập nội dung bài viết' }]}
                        extra="Hỗ trợ HTML. Ví dụ: <h2>Tiêu đề</h2><p>Nội dung...</p>"
                    >
                        <TextArea
                            rows={10}
                            placeholder="<h2>Tiêu đề phần</h2>&#10;<p>Nội dung bài viết của bạn ở đây...</p>"
                            style={{ fontFamily: 'monospace', fontSize: 13 }}
                        />
                    </Form.Item>

                    {/* Config row */}
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="published_at" label="Ngày đăng">
                                <DatePicker
                                    showTime
                                    format="DD/MM/YYYY HH:mm"
                                    style={{ width: '100%' }}
                                    placeholder="Chọn ngày đăng"
                                />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="is_featured" label="Bài nổi bật" valuePropName="checked">
                                <Switch checkedChildren="⭐ Nổi bật" unCheckedChildren="Bình thường" />
                            </Form.Item>
                        </Col>
                        <Col span={6}>
                            <Form.Item name="is_active" label="Hiển thị" valuePropName="checked">
                                <Switch checkedChildren="Hiển thị" unCheckedChildren="Ẩn" />
                            </Form.Item>
                        </Col>
                    </Row>
                </Form>
            </Modal>
        </div>
    );
};

export default AdminNewsPage;

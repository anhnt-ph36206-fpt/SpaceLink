import React, { useEffect, useState } from 'react';
import {
    Table, Button, Modal, Form, Input, Switch, Space, Tag,
    Typography, Card, Row, Col, Select, Avatar, Upload, type UploadFile,
    Alert, Spin, Badge
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    SearchOutlined, AppstoreOutlined, ExclamationCircleOutlined,
    FolderOutlined, FolderOpenOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { axiosInstance } from "../../../api/axios.ts";
import { toast } from "react-toastify";
import type { UploadProps } from 'antd';
import { categoryPrefix } from "../../../api/apiAdminPrefix.ts";

const { Title, Text } = Typography;

interface Category {
    id: number;
    parent_id: number | null;
    name: string;
    slug: string;
    image?: string | null;
    description?: string | null;
    is_active?: boolean;
    products_count?: number;
    children?: Category[];
}

// ── Slugify tiếng Việt (chỉ dùng để preview real-time, backend luôn generate lại) ──
const convertToSlug = (text: string) => {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[đĐ]/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
};

// ── Làm phẳng cây để lấy danh sách option cho Select (hiển thị thụt lề) ──
const flattenTree = (items: Category[], depth = 0, excludeId?: number): { value: number; label: string }[] => {
    let result: { value: number; label: string }[] = [];
    for (const item of items) {
        if (item.id === excludeId) continue;
        result.push({
            value: item.id,
            label: `${'— '.repeat(depth)}${item.name}`,
        });
        if (item.children?.length) {
            result = [...result, ...flattenTree(item.children, depth + 1, excludeId)];
        }
    }
    return result;
};

// ── Build tree từ danh sách phẳng (frontend fallback) ──
const buildTree = (data: Category[]): Category[] => {
    const map = new Map<number, Category>();
    const roots: Category[] = [];

    data.forEach(item => map.set(item.id, { ...item, children: [] }));

    map.forEach(item => {
        if (item.parent_id && map.has(item.parent_id)) {
            map.get(item.parent_id)!.children!.push(item);
        } else {
            roots.push(item);
        }
    });

    // Dọn các node không có con
    map.forEach(item => {
        if (!item.children?.length) delete item.children;
    });

    return roots;
};


const AdminCategoryPage: React.FC = () => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Category | null>(null);
    const [form] = Form.useForm();

    const [search, setSearch] = useState('');
    const [isActive, setIsActive] = useState<number | undefined>(undefined);
    const [parentId, setParentId] = useState<number | undefined>(undefined);

    const [fileList, setFileList] = useState<UploadFile[]>([]);

    const [deleteModalVisible, setDeleteModalVisible] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
    const [categoryChildrenCount, setCategoryChildrenCount] = useState<number>(0);
    const [categoryProductCount, setCategoryProductCount] = useState<number>(0);
    const [transferCategoryId, setTransferCategoryId] = useState<number | undefined>();
    const [isTransferring, setIsTransferring] = useState(false);
    const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

    // ── Fetch danh sách phẳng từ API, build tree ở frontend ──
    const fetchCategories = async (params?: {
        search?: string;
        is_active?: number;
        parent_id?: number;
    }) => {
        setLoading(true);
        try {
            const res = await axiosInstance.get(categoryPrefix, {
                params: {
                    all: 1,
                    search: params?.search,
                    is_active: params?.is_active,
                    parent_id: params?.parent_id,
                },
            });
            setCategories(res.data.data);
        } catch {
            toast.error('Không thể tải danh mục');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchCategories(); }, []);

    const treeData = buildTree(categories);
    const allOptions = flattenTree(treeData);                              // Tất cả (dùng cho filter & delete transfer)
    const parentOptions = flattenTree(treeData, 0, editingItem?.id ?? -1); // Loại trừ chính nó (update trả lỗi nếu chọn con)

    // ── Filters ──────────────────────────────────────────────────────────────
    const handleFilter = () => fetchCategories({ search, is_active: isActive, parent_id: parentId });
    const handleReset = () => {
        setSearch('');
        setIsActive(undefined);
        setParentId(undefined);
        fetchCategories({});
    };

    // ── Modal thêm / sửa ─────────────────────────────────────────────────────
    const openAdd = () => {
        setEditingItem(null);
        form.resetFields();
        form.setFieldsValue({ is_active: true });
        setFileList([]);
        setModalOpen(true);
    };

    const openEdit = (item: Category) => {
        setEditingItem(item);
        form.setFieldsValue({ ...item });
        setFileList(item.image ? [{ uid: '-1', name: 'image', status: 'done', url: item.image }] : []);
        setModalOpen(true);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();

            const formData = new FormData();
            formData.append('name', values.name);
            // Slug được backend tự generate — chỉ gửi nếu user tự nhập vào
            // (backend sẽ bỏ qua nếu không hợp lệ)
            if (values.slug) formData.append('slug', values.slug);
            if (values.parent_id) formData.append('parent_id', String(values.parent_id));
            if (values.description) formData.append('description', values.description);
            formData.append('is_active', values.is_active ? '1' : '0');
            formData.append('display_order', '0');
            if (fileList.length > 0 && fileList[0].originFileObj) {
                formData.append('image', fileList[0].originFileObj);
            }

            if (editingItem) {
                formData.append('_method', 'PUT');
                await axiosInstance.post(`${categoryPrefix}/${editingItem.id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                toast.success('Cập nhật danh mục thành công');
            } else {
                await axiosInstance.post(categoryPrefix, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                toast.success('Thêm danh mục thành công');
            }

            setModalOpen(false);
            setFileList([]);
            fetchCategories();
        } catch (error: any) {
            const msg = error?.response?.data?.message
                ?? error?.response?.data?.errors?.name?.[0]
                ?? 'Có lỗi xảy ra';
            toast.error(msg);
        }
    };

    // ── Modal xóa ────────────────────────────────────────────────────────────
    const openDeleteModal = (item: Category) => {
        setCategoryToDelete(item);
        setCategoryProductCount(item.products_count ?? 0);
        // Đếm children ngay từ treeData
        const found = findInTree(treeData, item.id);
        setCategoryChildrenCount(found?.children?.length ?? 0);
        setTransferCategoryId(undefined);
        setIsTransferring(false);
        setDeleteModalVisible(true);
    };

    const findInTree = (nodes: Category[], id: number): Category | null => {
        for (const n of nodes) {
            if (n.id === id) return n;
            if (n.children) {
                const r = findInTree(n.children, id);
                if (r) return r;
            }
        }
        return null;
    };

    // Hard delete (xóa vĩnh viễn)
    const handleHardDelete = async () => {
        if (!categoryToDelete) return;
        try {
            await axiosInstance.delete(`${categoryPrefix}/${categoryToDelete.id}/force`);
            toast.success('Đã xóa vĩnh viễn danh mục');
            setDeleteModalVisible(false);
            setDeleteConfirmVisible(false);
            fetchCategories();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Xóa thất bại');
        }
    };

    // Chuyển sản phẩm sang danh mục khác rồi xóa (bulk — 1 API call duy nhất)
    const handleTransferAndDelete = async () => {
        if (!categoryToDelete || !transferCategoryId) return;
        setIsTransferring(true);
        try {
            // Bước 1: Bulk reassign tất cả sản phẩm (1 câu query, không cần loop)
            const reassignRes = await axiosInstance.post(
                `${categoryPrefix}/${categoryToDelete.id}/reassign-products`,
                { target_category_id: transferCategoryId }
            );
            const moved: number = reassignRes.data?.moved ?? 0;

            // Bước 2: Xóa vĩnh viễn danh mục (lúc này products_count = 0)
            await axiosInstance.delete(`${categoryPrefix}/${categoryToDelete.id}/force`);

            toast.success(`Đã chuyển ${moved} sản phẩm và xóa danh mục thành công`);
            setDeleteModalVisible(false);
            fetchCategories();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi chuyển và xóa danh mục');
        } finally {
            setIsTransferring(false);
        }
    };


    // ── Upload ────────────────────────────────────────────────────────────────
    const uploadProps: UploadProps = {
        listType: 'picture-card',
        maxCount: 1,
        beforeUpload: () => false,
        fileList,
        onChange: ({ fileList }) => setFileList(fileList),
        onRemove: () => setFileList([]),
    };

    // ── Columns (dạng cây thụt lề) ────────────────────────────────────────────
    const columns: ColumnsType<Category> = [
        {
            title: 'Danh mục',
            key: 'name',
            render: (_, r) => (
                <Space>
                    {r.image
                        ? <Avatar src={r.image} size={36} style={{ borderRadius: 8 }} />
                        : <Avatar icon={r.children?.length ? <FolderOpenOutlined /> : <FolderOutlined />}
                            size={36} style={{ borderRadius: 8, background: '#e8f0fe', color: '#0d6efd' }} />
                    }
                    <div>
                        <div style={{ fontWeight: 600 }}>{r.name}</div>
                        <Text type="secondary" style={{ fontSize: 12 }}>/{r.slug}</Text>
                    </div>
                </Space>
            ),
        },
        {
            title: 'Sản phẩm',
            dataIndex: 'products_count',
            width: 100,
            align: 'center',
            render: (v: number) => (
                <Badge
                    count={v ?? 0}
                    showZero
                    style={{ backgroundColor: v > 0 ? '#0d6efd' : '#d9d9d9' }}
                />
            ),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'is_active',
            width: 120,
            align: 'center',
            render: (v: boolean) => (
                <Tag color={v ? 'success' : 'default'}>
                    {v ? 'Hoạt động' : 'Tắt'}
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
                        type="primary" ghost size="small" icon={<EditOutlined />}
                        onClick={() => openEdit(r)}
                    />
                    <Button
                        danger size="small" icon={<DeleteOutlined />}
                        onClick={() => openDeleteModal(r)}
                    />
                </Space>
            ),
        },
    ];

    const hasBlocker = categoryChildrenCount > 0 || categoryProductCount > 0;

    return (
        <div style={{ padding: 24 }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <Title level={4} style={{ margin: 0, color: '#1a1a2e' }}>
                    <AppstoreOutlined style={{ marginRight: 10, color: '#0d6efd' }} />
                    Quản lý Danh mục
                </Title>
                <Button
                    type="primary" icon={<PlusOutlined />} onClick={openAdd}
                    style={{
                        background: 'linear-gradient(135deg,#0d6efd,#084298)',
                        border: 'none', borderRadius: 10, height: 40, fontWeight: 600,
                        boxShadow: '0 4px 12px rgba(13,110,253,0.35)',
                    }}
                >
                    Thêm danh mục
                </Button>
            </div>

            {/* Filter */}
            <Card style={{ marginBottom: 20, borderRadius: 12 }}>
                <Row gutter={12}>
                    <Col span={8}>
                        <Input
                            placeholder="Tìm kiếm theo tên..."
                            prefix={<SearchOutlined />}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            allowClear
                        />
                    </Col>
                    <Col span={6}>
                        <Select
                            placeholder="Trạng thái"
                            value={isActive}
                            onChange={setIsActive}
                            allowClear
                            style={{ width: '100%' }}
                            options={[
                                { value: 1, label: 'Hoạt động' },
                                { value: 0, label: 'Tắt' },
                            ]}
                        />
                    </Col>
                    <Col span={6}>
                        <Select
                            placeholder="Danh mục cha"
                            value={parentId}
                            onChange={setParentId}
                            allowClear
                            style={{ width: '100%' }}
                            options={allOptions}
                        />
                    </Col>
                    <Col span={4}>
                        <Space>
                            <Button type="primary" onClick={handleFilter}>Lọc</Button>
                            <Button onClick={handleReset}>Reset</Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* Bảng dạng cây thụt lề (A → A1 → A1.1) */}
            <Card style={{ borderRadius: 12 }}>
                <Table
                    columns={columns}
                    dataSource={treeData}
                    rowKey="id"
                    loading={loading}
                    expandable={{
                        childrenColumnName: 'children',
                        indentSize: 28,
                        // @ts-expect-error antd typing
                        rowExpandable: (record) => record.children && record.children.length > 0,
                    }}
                    pagination={{ pageSize: 20, showSizeChanger: true }}
                />
            </Card>

            {/* ── Modal Thêm / Sửa ── */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: 'linear-gradient(135deg,#0d6efd,#084298)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <AppstoreOutlined style={{ color: '#fff', fontSize: 15 }} />
                        </div>
                        <span>{editingItem ? 'Sửa danh mục' : 'Thêm danh mục mới'}</span>
                    </div>
                }
                open={modalOpen}
                onOk={handleSave}
                onCancel={() => setModalOpen(false)}
                okText={editingItem ? 'Cập nhật' : 'Thêm mới'}
                cancelText="Hủy"
                okButtonProps={{
                    style: {
                        background: 'linear-gradient(135deg,#0d6efd,#084298)',
                        border: 'none', borderRadius: 8
                    }
                }}
                cancelButtonProps={{ style: { borderRadius: 8 } }}
                width={580}
                style={{ top: 40 }}
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="name"
                                label="Tên danh mục"
                                rules={[{ required: true, message: 'Nhập tên danh mục' }]}
                            >
                                <Input
                                    placeholder="VD: SmartPhone"
                                    style={{ borderRadius: 8 }}
                                    onChange={e => {
                                        // Preview slug (backend sẽ generate chính xác)
                                        form.setFieldsValue({ slug: convertToSlug(e.target.value) });
                                    }}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="slug"
                                label={
                                    <span>
                                        Slug (URL)&nbsp;
                                        <Text type="secondary" style={{ fontSize: 11, fontWeight: 400 }}>
                                            — tự động từ tên, có thể chỉnh
                                        </Text>
                                    </span>
                                }
                            >
                                <Input placeholder="VD: smartphone" style={{ borderRadius: 8 }} />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="parent_id" label="Danh mục cha">
                                <Select
                                    placeholder="Chọn danh mục cha (nếu có)"
                                    allowClear
                                    options={parentOptions}
                                    style={{ borderRadius: 8 }}
                                    showSearch
                                    filterOption={(input, option) =>
                                        String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                    }
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="is_active" label="Trạng thái" valuePropName="checked">
                                <Switch checkedChildren="Hoạt động" unCheckedChildren="Tắt" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="description" label="Mô tả">
                        <Input.TextArea rows={3} placeholder="Mô tả ngắn về danh mục..." style={{ borderRadius: 8 }} />
                    </Form.Item>

                    <Form.Item label="Hình ảnh">
                        <Upload {...uploadProps}>
                            {fileList.length < 1 && (
                                <div>
                                    <PlusOutlined />
                                    <div style={{ marginTop: 8 }}>Upload</div>
                                </div>
                            )}
                        </Upload>
                    </Form.Item>
                </Form>
            </Modal>

            {/* ── Modal Xóa ── */}
            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 32, height: 32, borderRadius: 8,
                            background: '#ffe5e5', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <DeleteOutlined style={{ color: '#ff4d4f', fontSize: 16 }} />
                        </div>
                        <span>Xóa Danh Mục</span>
                    </div>
                }
                open={deleteModalVisible}
                onCancel={() => setDeleteModalVisible(false)}
                footer={null}
                width={560}
            >
                {isTransferring ? (
                    <div style={{ textAlign: 'center', padding: '40px 0' }}>
                        <Spin size="large" />
                        <div style={{ marginTop: 16, color: '#666' }}>
                            Đang chuyển sản phẩm và xóa danh mục...
                        </div>
                    </div>
                ) : (
                    <div style={{ marginTop: 16 }}>
                        <div style={{ marginBottom: 20, fontSize: 15 }}>
                            Thao tác với danh mục:{' '}
                            <strong style={{ color: '#1a1a2e' }}>{categoryToDelete?.name}</strong>
                        </div>

                        {/* Cảnh báo nếu có danh mục con */}
                        {categoryChildrenCount > 0 && (
                            <Alert
                                type="error"
                                showIcon
                                icon={<ExclamationCircleOutlined />}
                                message={<strong>⛔ Đang chứa {categoryChildrenCount} danh mục con</strong>}
                                description="Bắt buộc phải xóa hoặc chuyển các danh mục con trước khi xóa danh mục này."
                                style={{ marginBottom: 12, borderRadius: 8 }}
                            />
                        )}

                        {/* Cảnh báo nếu có sản phẩm */}
                        {categoryProductCount > 0 && (
                            <Alert
                                type="warning"
                                showIcon
                                message={<strong>⚠️ Đang chứa {categoryProductCount} sản phẩm</strong>}
                                description="Vui lòng chuyển sản phẩm sang danh mục khác trước khi xóa, hoặc dùng tính năng Chuyển & Xóa bên dưới."
                                style={{ marginBottom: 20, borderRadius: 8 }}
                            />
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                            {/* Chuyển sản phẩm & Xóa (chỉ hiện khi có sản phẩm và không có con) */}
                            {categoryProductCount > 0 && categoryChildrenCount === 0 && (
                                <Card
                                    size="small" hoverable
                                    style={{ borderColor: '#faad14', borderRadius: 10 }}
                                    bodyStyle={{ padding: 16 }}
                                >
                                    <div style={{ fontWeight: 700, color: '#d48806', fontSize: 15, marginBottom: 6 }}>
                                        🔁 Chuyển sản phẩm sang danh mục khác rồi Xóa
                                    </div>
                                    <div style={{ fontSize: 13, color: '#666', marginBottom: 14 }}>
                                        Sản phẩm sẽ được tự động chuyển, sau đó danh mục này bị xóa vĩnh viễn.
                                    </div>
                                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                        <Select
                                            style={{ flex: 1, minWidth: 200 }}
                                            placeholder="-- Chọn danh mục đích --"
                                            options={allOptions.filter(o => o.value !== categoryToDelete?.id)}
                                            value={transferCategoryId}
                                            onChange={setTransferCategoryId}
                                            showSearch
                                            filterOption={(input, option) =>
                                                String(option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                                            }
                                        />
                                        <Button
                                            type="primary"
                                            disabled={!transferCategoryId}
                                            onClick={handleTransferAndDelete}
                                            style={{ borderRadius: 8 }}
                                        >
                                            Chuyển &amp; Xóa
                                        </Button>
                                    </div>
                                </Card>
                            )}

                            {/* Xóa vĩnh viễn */}
                            <Card
                                size="small" hoverable
                                style={{
                                    borderColor: hasBlocker ? '#f0f0f0' : '#ff4d4f',
                                    opacity: hasBlocker ? 0.5 : 1,
                                    borderRadius: 10
                                }}
                                bodyStyle={{ padding: 16 }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ fontWeight: 700, color: hasBlocker ? '#aaa' : '#ff4d4f', fontSize: 15, marginBottom: 4 }}>
                                            ❌ Xóa vĩnh viễn
                                        </div>
                                        <div style={{ fontSize: 13, color: '#666' }}>
                                            {hasBlocker
                                                ? 'Bị khóa. Vui lòng xử lý danh mục con / sản phẩm trước.'
                                                : 'Xóa hoàn toàn khỏi Database. Không thể khôi phục.'}
                                        </div>
                                    </div>
                                    {!hasBlocker && !deleteConfirmVisible ? (
                                        <Button
                                            danger
                                            onClick={() => setDeleteConfirmVisible(true)}
                                            style={{ borderRadius: 8 }}
                                        >
                                            Xóa
                                        </Button>
                                    ) : !hasBlocker && deleteConfirmVisible ? (
                                        <Space>
                                            <Button size="small" onClick={() => setDeleteConfirmVisible(false)}>Hủy</Button>
                                            <Button danger size="small" onClick={handleHardDelete}>Xác nhận xóa</Button>
                                        </Space>
                                    ) : (
                                        <Button danger disabled style={{ borderRadius: 8 }}>Xóa</Button>
                                    )}
                                </div>
                            </Card>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default AdminCategoryPage;
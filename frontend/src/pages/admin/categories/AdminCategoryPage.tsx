import React, { useEffect, useState } from 'react';
import {
    Table, Button, Modal, Form, Input, Switch, Space, Tag,
    Typography, Card, Row, Col, Select, Avatar, Upload, type UploadFile,
    Alert, Spin
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    SearchOutlined, AppstoreOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { axiosInstance } from "../../../api/axios.ts";
import { toast } from "react-toastify";
import type { UploadProps } from 'antd';
import { categoryPrefix, productPrefix } from "../../../api/apiAdminPrefix.ts";

const { Title, Text } = Typography;

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
    const [categoryProductCount, setCategoryProductCount] = useState<number | null>(null);
    const [transferCategoryId, setTransferCategoryId] = useState<number | undefined>();
    const [isTransferring, setIsTransferring] = useState(false);

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

    useEffect(() => {
        fetchCategories();
    }, []);

    const buildTree = (data: Category[]) => {
        const map = new Map<number, Category>();
        const roots: Category[] = [];

        data.forEach(item => {
            map.set(item.id, { ...item, children: [] });
        });

        map.forEach(item => {
            if (item.parent_id && map.has(item.parent_id)) {
                map.get(item.parent_id)!.children!.push(item);
            } else {
                roots.push(item);
            }
        });

        map.forEach(item => {
            if (!item.children || item.children.length === 0) {
                delete item.children;
            }
        });

        return roots;
    };

    const sortByOrder = (arr: Category[]): Category[] => {
        arr.sort((a, b) => a.name.localeCompare(b.name));

        arr.forEach(item => {
            if (item.children?.length) {
                sortByOrder(item.children);
            }
        });

        return arr;
    };

    const treeData = sortByOrder(buildTree(categories));


    const handleFilter = () => {
        fetchCategories({
            search,
            is_active: isActive,
            parent_id: parentId,
        });
    };

    const handleReset = () => {
        setSearch('');
        setIsActive(undefined);
        setParentId(undefined);
        fetchCategories({});
    };


    const openAdd = () => {
        setEditingItem(null);
        form.resetFields();
        form.setFieldsValue({ is_active: true });
        setFileList([]);
        setModalOpen(true);
    };

    const openEdit = (item: Category) => {
        setEditingItem(item);
        form.setFieldsValue({
            ...item,
        });

        if (item.image) {
            setFileList([
                {
                    uid: '-1',
                    name: 'image',
                    status: 'done',
                    url: item.image,
                },
            ]);
        } else {
            setFileList([]);
        }

        setModalOpen(true);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();

            const formData = new FormData();

            formData.append('name', values.name);
            formData.append(
                'slug',
                values.slug || values.name.toLowerCase().replace(/\s+/g, '-')
            );

            if (values.parent_id) {
                formData.append('parent_id', values.parent_id);
            }

            if (values.description) {
                formData.append('description', values.description);
            }

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
                toast.success('Cập nhật thành công');
            } else {
                await axiosInstance.post(categoryPrefix, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                toast.success('Thêm thành công');
            }

            setModalOpen(false);
            setFileList([]);
            fetchCategories();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Có lỗi xảy ra');
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await axiosInstance.delete(`${categoryPrefix}/${id}/force`);
            toast.success('Đã xóa vĩnh viễn');
            setDeleteModalVisible(false);
            fetchCategories();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || error.message || "Xóa thất bại");
        }
    };

    const openDeleteModal = async (item: Category) => {
        setCategoryToDelete(item);
        setDeleteModalVisible(true);
        setCategoryProductCount(item.products_count || 0);
        setTransferCategoryId(undefined);
        setIsTransferring(false);
    };

    const handleSoftDelete = async () => {
        if (!categoryToDelete) return;
        try {
            await axiosInstance.delete(`${categoryPrefix}/${categoryToDelete.id}`);
            toast.success('Đã ẩn danh mục thành công (Soft delete)');
            setDeleteModalVisible(false);
            fetchCategories();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi ẩn');
        }
    };

    const handleTransferAndDelete = async () => {
        if (!categoryToDelete || !transferCategoryId) return;
        setIsTransferring(true);
        try {
            const res = await axiosInstance.get(productPrefix, { params: { category_id: categoryToDelete.id, all: 1 } });
            const products = res.data?.data || [];

            let successTransfer = 0;
            for (const prod of products) {
                const fd = new FormData();
                fd.append('category_id', String(transferCategoryId));
                fd.append('_method', 'PUT');
                await axiosInstance.post(`${productPrefix}/${prod.id}`, fd).then(() => successTransfer++).catch(() => null);
            }

            await axiosInstance.delete(`${categoryPrefix}/${categoryToDelete.id}/force`);
            if (products.length > 0 && successTransfer < products.length) {
                toast.warning(`Đã xóa danh mục nhưng chỉ chuyển được ${successTransfer}/${products.length} sản phẩm do thiếu dữ liệu.`);
            } else {
                toast.success('Đã chuyển sản phẩm và xóa danh mục');
            }
            setDeleteModalVisible(false);
            fetchCategories();
        } catch (e: any) {
            toast.error('Có lỗi xảy ra khi thực hiện');
        } finally {
            setIsTransferring(false);
        }
    };

    const uploadProps: UploadProps = {
        listType: 'picture-card',
        maxCount: 1,
        beforeUpload: () => false,
        fileList,
        onChange: ({ fileList }) => {
            setFileList(fileList);
        },
        onRemove: () => {
            setFileList([]);
        },
    };

    const getFlatOptions = (items: Category[], depth = 0, excludeId?: number): { value: number; label: string }[] => {
        let result: { value: number; label: string }[] = [];
        items.forEach(item => {
            if (item.id === excludeId) return;
            result.push({
                value: item.id,
                label: `${'— '.repeat(depth)}${item.name}`
            });
            if (item.children && item.children.length > 0) {
                // If we are excluding an ID, we also exclude all its children
                result = [...result, ...getFlatOptions(item.children, depth + 1, excludeId)];
            }
        });
        return result;
    };

    const parentOptions = getFlatOptions(treeData, 0, editingItem?.id);
    const filterParentOptions = getFlatOptions(treeData);

    const columns: ColumnsType<Category> = [
        {
            title: 'Danh mục',
            key: 'name',
            render: (_, r) => (
                <Space>
                    <Avatar
                        src={r.image || undefined}
                        size={36}
                        style={{ borderRadius: 8, background: '#e8f0fe' }}
                    />
                    <div>
                        <div style={{ fontWeight: 600 }}>{r.name}</div>
                        <Text type="secondary">/{r.slug}</Text>
                    </div>
                </Space>
            ),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'is_active',
            width: 120,
            align: 'center',
            render: (v: number) => (
                <Tag color={v == 1 ? 'success' : 'default'}>
                    {v ? 'Hoạt động' : 'Tắt'}
                </Tag>
            ),
        },
        {
            title: 'Hành động',
            width: 120,
            align: 'center',
            render: (_, r) => (
                <Space>
                    <Button
                        type="primary"
                        ghost
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => openEdit(r)}
                    />
                    <Button danger size="small" icon={<DeleteOutlined />} onClick={() => openDeleteModal(r)} />
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <Title level={4} style={{ margin: 0, color: '#1a1a2e' }}>
                        <AppstoreOutlined style={{ marginRight: 10, color: '#0d6efd' }} />
                        Quản lí Danh mục
                    </Title>
                </div>
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

            <Card style={{ marginBottom: 20 }}>
                <Row gutter={12}>
                    <Col span={8}>
                        <Input
                            placeholder="Tìm kiếm..."
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
                            options={filterParentOptions}
                        />
                    </Col>

                    <Col span={4}>
                        <Space>
                            <Button type="primary" onClick={handleFilter}>
                                Lọc
                            </Button>
                            <Button onClick={handleReset}>
                                Reset
                            </Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            <Table
                columns={columns}
                dataSource={treeData}
                rowKey="id"
                loading={loading}
                expandable={{
                    childrenColumnName: 'children',
                    indentSize: 25,
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-expect-error
                    rowExpandable: (record) =>
                        record.children && record.children.length > 0,
                }}
            />

            <Modal
                title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: 'linear-gradient(135deg,#0d6efd,#084298)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
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
                        border: 'none',
                        borderRadius: 8
                    }
                }}
                cancelButtonProps={{ style: { borderRadius: 8 } }}
                width={560}
                style={{ top: 40 }}
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="name" label="Tên danh mục"
                                rules={[{ required: true, message: 'Nhập tên danh mục' }]}>
                                <Input
                                    placeholder="VD: SmartPhone"
                                    style={{ borderRadius: 8 }}
                                    onChange={(e) => {
                                        const name = e.target.value;
                                        form.setFieldsValue({ slug: convertToSlug(name) });
                                    }}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="slug" label="Slug (URL)"
                                rules={[{ required: true, message: 'Nhập slug' }]}>
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
                width={550}
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
                            Bạn đang thao tác với danh mục: <strong style={{ color: '#1a1a2e' }}>{categoryToDelete?.name}</strong>
                        </div>

                        {categoryProductCount !== null && categoryProductCount > 0 && (
                            <Alert
                                type="warning"
                                showIcon
                                message={<strong>Danh mục này đang có {categoryProductCount} sản phẩm</strong>}
                                description="Để đảm bảo toàn vẹn dữ liệu, hệ thống không cho phép xóa tĩnh danh mục đang chứa sản phẩm. Vui lòng chọn 1 trong 2 phương án bên dưới:"
                                style={{ marginBottom: 24, borderRadius: 8 }}
                            />
                        )}

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                            {/* Option 1: Soft Delete */}
                            <Card
                                size="small"
                                hoverable
                                style={{ borderColor: '#0d6efd', background: '#f8fbff', borderRadius: 10 }}
                                bodyStyle={{ padding: 16 }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                                    <div style={{ flex: 1, minWidth: 200 }}>
                                        <div style={{ fontWeight: 700, color: '#0d6efd', fontSize: 15, marginBottom: 4 }}>
                                            👻 Ẩn danh mục (Soft Delete)
                                        </div>
                                        <div style={{ fontSize: 13, color: '#444' }}>
                                            Chuẩn production: Danh mục được ẩn khỏi trang Khách, nhưng vẫn giữ nguyên dữ liệu gốc để tra cứu sau này.
                                        </div>
                                    </div>
                                    <Button type="primary" onClick={handleSoftDelete} style={{ borderRadius: 8, background: '#0d6efd' }}>
                                        Tiến hành Ẩn
                                    </Button>
                                </div>
                            </Card>

                            {/* Option 2: Transfer & Delete */}
                            {categoryProductCount !== null && categoryProductCount > 0 && (
                                <Card size="small" hoverable style={{ borderColor: '#e9ecef', borderRadius: 10 }} bodyStyle={{ padding: 16 }}>
                                    <div style={{ fontWeight: 700, color: '#2b2b2b', fontSize: 15, marginBottom: 4 }}>
                                        🔁 Chuyển sang danh mục khác rồi Xóa
                                    </div>
                                    <div style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
                                        Các sản phẩm sẽ được tự động chuyển sang danh mục mới được chỉ định, sau đó danh mục hiện tại sẽ bị xóa vĩnh viễn.
                                    </div>
                                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                        <Select
                                            style={{ flex: 1, minWidth: 200 }}
                                            placeholder="-- Chọn danh mục đích để chuyển đến --"
                                            options={filterParentOptions.filter(o => o.value !== categoryToDelete?.id)}
                                            value={transferCategoryId}
                                            onChange={setTransferCategoryId}
                                        />
                                        <Button
                                            type="default"
                                            disabled={!transferCategoryId}
                                            onClick={handleTransferAndDelete}
                                            style={{ borderRadius: 8 }}
                                        >
                                            Chuyển & Xóa
                                        </Button>
                                    </div>
                                </Card>
                            )}

                            {/* Option 3: Hard Delete */}
                            <Card
                                size="small"
                                hoverable
                                style={{
                                    borderColor: categoryProductCount ? '#f5f5f5' : '#ff4d4f',
                                    opacity: categoryProductCount ? 0.6 : 1,
                                    borderRadius: 10
                                }}
                                bodyStyle={{ padding: 16 }}
                            >
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                                    <div style={{ flex: 1, minWidth: 200 }}>
                                        <div style={{ fontWeight: 700, color: categoryProductCount ? '#999' : '#ff4d4f', fontSize: 15, marginBottom: 4 }}>
                                            ❌ Xóa vĩnh viễn (Hard Delete)
                                        </div>
                                        <div style={{ fontSize: 13, color: '#666' }}>
                                            {categoryProductCount
                                                ? "Tính năng bị khóa. Vui lòng chuyển sản phẩm đi nơi khác để được phép xóa vĩnh viễn."
                                                : "Hệ thống sẽ xóa vĩnh viễn danh mục này và không thể khôi phục."}
                                        </div>
                                    </div>
                                    <Button
                                        danger
                                        disabled={!!categoryProductCount}
                                        onClick={() => categoryToDelete && handleDelete(categoryToDelete.id)}
                                        style={{ borderRadius: 8 }}
                                    >
                                        Xóa ngay
                                    </Button>
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
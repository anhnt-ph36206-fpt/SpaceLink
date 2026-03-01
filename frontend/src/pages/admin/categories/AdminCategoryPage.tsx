import React, { useEffect, useState } from 'react';
import {
    Table, Button, Modal, Form, Input, Switch, Space, Tag,
    Typography, Popconfirm, Card, Row, Col, Select, Avatar, Upload, type UploadFile,
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    SearchOutlined, AppstoreOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { axiosInstance } from "../../../api/axios.ts";
import { toast } from "react-toastify";
import type { UploadProps } from 'antd';
import {categoryPrefix} from "../../../api/apiAdminPrefix.ts";

const { Title, Text } = Typography;

interface Category {
    id: number;
    parent_id: number | null;
    name: string;
    slug: string;
    image?: string | null;
    description?: string | null;
    is_active?: boolean;
    meta?: {
        display_order?: number;
    };
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

    const fetchCategories = async (params?: {
        search?: string;
        is_active?: number;
        parent_id?: number;
    }) => {
        setLoading(true);
        try {
            const res = await axiosInstance.get(categoryPrefix, {
                params: {
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
        arr.sort((a, b) =>
            (a.meta?.display_order || 0) - (b.meta?.display_order || 0)
        );

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
            display_order: item.meta?.display_order
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

            if (values.display_order) {
                formData.append('display_order', values.display_order);
            }

            if (values.description) {
                formData.append('description', values.description);
            }

            formData.append('is_active', values.is_active ? '1' : '0');

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
            await axiosInstance.delete(`${categoryPrefix}/${id}`);
            toast.success('Đã xóa');
            fetchCategories();
        } catch (error: any) {
            toast.error(error.message || "Xóa thất bại");
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

    const parentOptions = categories
        .filter(c => !c.parent_id)
        .map(c => ({ value: c.id, label: c.name }));

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
            title: 'Thứ tự',
            key: 'order',
            width: 100,
            align: 'center',
            render: (_, r) => r.meta?.display_order || 0,
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
                    <Popconfirm
                        title="Xóa danh mục?"
                        onConfirm={() => handleDelete(r.id)}
                        okText="Xóa"
                        cancelText="Hủy"
                    >
                        <Button danger size="small" icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20}}>
                <div>
                    <Title level={4} style={{margin: 0, color: '#1a1a2e'}}>
                        <AppstoreOutlined style={{marginRight: 10, color: '#0d6efd'}}/>
                        Quản lí Danh mục
                    </Title>
                </div>
                <Button
                    type="primary" icon={<PlusOutlined/>} onClick={openAdd}
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
                            options={parentOptions}
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
                    <div style={{display: 'flex', alignItems: 'center', gap: 10}}>
                        <div style={{
                            width: 32,
                            height: 32,
                            borderRadius: 8,
                            background: 'linear-gradient(135deg,#0d6efd,#084298)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <AppstoreOutlined style={{color: '#fff', fontSize: 15}}/>
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
                cancelButtonProps={{style: {borderRadius: 8}}}
                width={560}
                style={{top: 40}}
            >
                <Form form={form} layout="vertical" style={{marginTop: 16}}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="name" label="Tên danh mục"
                                       rules={[{required: true, message: 'Nhập tên danh mục'}]}>
                                <Input placeholder="VD: SmartPhone" style={{borderRadius: 8}}/>
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="slug" label="Slug (URL)">
                                <Input placeholder="VD: smartphone" style={{borderRadius: 8}}/>
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
                                    style={{borderRadius: 8}}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="display_order" label="Thứ tự hiển thị">
                                <Input type="number" min={1} placeholder="1" style={{borderRadius: 8}}/>
                            </Form.Item>
                        </Col>
                    </Row>

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

                    <Form.Item name="description" label="Mô tả">
                        <Input.TextArea rows={3} placeholder="Mô tả ngắn về danh mục..." style={{borderRadius: 8}}/>
                    </Form.Item>

                    <Form.Item name="is_active" label="Trạng thái" valuePropName="checked">
                        <Switch checkedChildren="Hoạt động" unCheckedChildren="Tắt"/>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default AdminCategoryPage;
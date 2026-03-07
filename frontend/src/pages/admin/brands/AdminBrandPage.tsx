import React, { useEffect, useState } from 'react';
import {
    Table, Button, Modal, Form, Input, Switch, Space, Tag,
    Typography, Popconfirm, Card, Row, Col, Avatar, Upload, type UploadFile, Select
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    SearchOutlined, ShopOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { axiosInstance } from "../../../api/axios.ts";
import { toast } from "react-toastify";
import type { UploadProps } from 'antd';
import { brandPrefix } from "../../../api/apiAdminPrefix.ts";

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

interface Brand {
    id: number;
    name: string;
    slug: string;
    logo?: string | null;
    description?: string | null;
    is_active?: boolean;
    display_order?: number;
}

const AdminBrandPage: React.FC = () => {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [editingItem, setEditingItem] = useState<Brand | null>(null);
    const [form] = Form.useForm();

    const [search, setSearch] = useState('');
    const [isActive, setIsActive] = useState<number | undefined>(undefined);
    const [fileList, setFileList] = useState<UploadFile[]>([]);

    const fetchBrands = async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get(brandPrefix);
            setBrands(res.data.data);
        } catch {
            toast.error('Không thể tải thương hiệu');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBrands();
    }, []);

    const openAdd = () => {
        setEditingItem(null);
        form.resetFields();
        form.setFieldsValue({ is_active: true });
        setFileList([]);
        setModalOpen(true);
    };

    const openEdit = (item: Brand) => {
        setEditingItem(item);
        form.setFieldsValue({
            ...item,
        });

        if (item.logo) {
            setFileList([
                {
                    uid: '-1',
                    name: 'logo',
                    status: 'done',
                    url: item.logo.startsWith('http') ? item.logo : `http://localhost:8000/storage/${item.logo}`,
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
            setSubmitting(true);

            const formData = new FormData();
            formData.append('name', values.name);
            formData.append('slug', values.slug || convertToSlug(values.name));
            formData.append('is_active', values.is_active ? '1' : '0');
            formData.append('display_order', '0');

            if (values.description) {
                formData.append('description', values.description);
            }

            if (fileList.length > 0 && fileList[0].originFileObj) {
                formData.append('logo', fileList[0].originFileObj);
            }

            if (editingItem) {
                formData.append('_method', 'PUT');
                await axiosInstance.post(`${brandPrefix}/${editingItem.id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                toast.success('Cập nhật thành công');
            } else {
                await axiosInstance.post(brandPrefix, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                toast.success('Thêm thành công');
            }

            setModalOpen(false);
            setFileList([]);
            fetchBrands();
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await axiosInstance.delete(`${brandPrefix}/${id}`);
            toast.success('Đã xóa');
            fetchBrands();
        } catch (error: any) {
            toast.error(error.message || "Xóa thất bại");
        }
    };

    const uploadProps: UploadProps = {
        listType: 'picture-card',
        maxCount: 1,
        beforeUpload: () => false,
        fileList,
        onChange: ({ fileList }) => setFileList(fileList),
        onRemove: () => setFileList([]),
    };

    const filteredBrands = brands.filter(b => {
        const matchSearch = b.name.toLowerCase().includes(search.toLowerCase());
        const matchActive = isActive === undefined || (b.is_active ? 1 : 0) === isActive;
        return matchSearch && matchActive;
    });

    const columns: ColumnsType<Brand> = [
        {
            title: 'Thương hiệu',
            key: 'name',
            render: (_, r) => (
                <Space>
                    <Avatar
                        src={r.logo ? (r.logo.startsWith('http') ? r.logo : `http://localhost:8000/storage/${r.logo}`) : undefined}
                        size={36}
                        style={{ borderRadius: 8, background: '#f0f0f0' }}
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
            render: (v: boolean) => (
                <Tag color={v ? 'success' : 'default'}>
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
                        title="Xóa thương hiệu?"
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <Title level={4} style={{ margin: 0, color: '#1a1a2e' }}>
                        <ShopOutlined style={{ marginRight: 10, color: '#0d6efd' }} />
                        Quản lí Thương hiệu
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
                    Thêm thương hiệu
                </Button>
            </div>

            <Card style={{ marginBottom: 20 }}>
                <Row gutter={12}>
                    <Col span={10}>
                        <Input
                            placeholder="Tìm kiếm tên thương hiệu..."
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
                </Row>
            </Card>

            <Table
                columns={columns}
                dataSource={filteredBrands}
                rowKey="id"
                loading={loading}
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
                            <ShopOutlined style={{ color: '#fff', fontSize: 15 }} />
                        </div>
                        <span>{editingItem ? 'Sửa thương hiệu' : 'Thêm thương hiệu mới'}</span>
                    </div>
                }
                open={modalOpen}
                onOk={handleSave}
                onCancel={() => setModalOpen(false)}
                okText={editingItem ? 'Cập nhật' : 'Thêm mới'}
                confirmLoading={submitting}
                cancelText="Hủy"
                width={560}
                style={{ top: 40 }}
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="name" label="Tên thương hiệu"
                                rules={[{ required: true, message: 'Nhập tên thương hiệu' }]}>
                                <Input
                                    placeholder="VD: Apple, Samsung"
                                    onChange={(e) => {
                                        if (!editingItem) {
                                            form.setFieldsValue({ slug: convertToSlug(e.target.value) });
                                        }
                                    }}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="slug" label="Slug (URL)"
                                rules={[{ required: true, message: 'Nhập slug' }]}>
                                <Input placeholder="VD: apple" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={24}>
                            <Form.Item name="is_active" label="Trạng thái" valuePropName="checked">
                                <Switch checkedChildren="Hoạt động" unCheckedChildren="Tắt" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="description" label="Mô tả">
                        <Input.TextArea rows={3} placeholder="Mô tả về thương hiệu..." />
                    </Form.Item>

                    <Form.Item label="Logo">
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
        </div>
    );
};

export default AdminBrandPage;

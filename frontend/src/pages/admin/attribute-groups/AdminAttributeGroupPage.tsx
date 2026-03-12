import React, { useEffect, useState } from 'react';
import {
    Table, Button, Space, Typography, Popconfirm, Card,
    Row, Col, Input, Tag, Modal, Form, Tooltip,
    ColorPicker,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    TagsOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
    SearchOutlined, ReloadOutlined, ThunderboltOutlined,
    MinusCircleOutlined,
} from '@ant-design/icons';
import { axiosInstance } from '../../../api/axios';
import { attributeGroupPrefix } from '../../../api/apiAdminPrefix';
import { toast } from 'react-toastify';

const { Title, Text } = Typography;

interface Attribute {
    id: number;
    value: string;
    color_code?: string | null;
    display_order: number;
}

interface AttributeGroup {
    id: number;
    name: string;
    display_name?: string | null;
    display_order: number;
    attributes: Attribute[];
}

const AdminAttributeGroupPage: React.FC = () => {
    const [groups, setGroups] = useState<AttributeGroup[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({ current: 1, total: 0, pageSize: 10 });

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [currentGroup, setCurrentGroup] = useState<AttributeGroup | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [form] = Form.useForm();

    const fetchGroups = async (page = 1) => {
        try {
            setLoading(true);
            const res = await axiosInstance.get(attributeGroupPrefix, {
                params: {
                    page,
                    search: search || undefined,
                    per_page: 10,
                }
            });
            setGroups(res.data.data);
            if (res.data.meta) {
                setPagination({
                    current: res.data.meta.current_page,
                    total: res.data.meta.total,
                    pageSize: res.data.meta.per_page,
                });
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Lỗi tải danh sách nhóm thuộc tính');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, []);

    const handleDelete = async (id: number) => {
        try {
            await axiosInstance.delete(`${attributeGroupPrefix}/${id}`);
            toast.success('Đã xóa nhóm thuộc tính');
            fetchGroups();
        } catch {
            toast.error('Xóa thất bại');
        }
    };

    const openAddModal = () => {
        setModalMode('add');
        setCurrentGroup(null);
        form.resetFields();
        // default empty attribute to encourage typing
        form.setFieldsValue({ display_order: 0, attributes: [{ value: '', color_code: '' }] });
        setIsModalOpen(true);
    };

    const openEditModal = (group: AttributeGroup) => {
        setModalMode('edit');
        setCurrentGroup(group);
        form.setFieldsValue({
            name: group.name,
            display_name: group.display_name,
            display_order: group.display_order,
            // mapping attributes to fit form
            attributes: group.attributes.length > 0 ? group.attributes.map(a => ({
                id: a.id,
                value: a.value,
                color_code: a.color_code || undefined,
            })) : [{ value: '', color_code: '' }],
        });
        setIsModalOpen(true);
    };

    const handleModalSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);

            // Clean up attributes before sending
            const attributes = values.attributes
                ?.filter((a: any) => a && a.value && a.value.trim() !== '')
                .map((a: any, index: number) => ({
                    id: a.id || undefined,
                    value: a.value.trim(),
                    color_code: a.color_code?.trim() || undefined,
                    display_order: index,
                })) || [];

            const payload = {
                name: values.name.trim(),
                display_name: values.display_name?.trim() || null,
                display_order: values.display_order || 0,
                attributes: attributes.length > 0 ? attributes : [],
            };

            if (modalMode === 'add') {
                await axiosInstance.post(attributeGroupPrefix, payload);
                toast.success('Thêm nhóm thuộc tính thành công');
            } else {
                await axiosInstance.put(`${attributeGroupPrefix}/${currentGroup!.id}`, payload);
                toast.success('Cập nhật nhóm thuộc tính thành công');
            }

            setIsModalOpen(false);
            fetchGroups();
        } catch (error: any) {
            if (error?.errorFields) {
                // Form validation error, let it be handled visually
                return;
            }
            toast.error(error?.response?.data?.message || 'Có lỗi xảy ra khi lưu');
        } finally {
            setSubmitting(false);
        }
    };

    const handleSearch = () => {
        fetchGroups(1);
    };

    const handleReset = () => {
        setSearch('');
        setTimeout(() => fetchGroups(1), 0);
    };

    const columns: ColumnsType<AttributeGroup> = [
        {
            title: '# ID',
            dataIndex: 'id',
            width: 80,
            align: 'center',
            sorter: (a, b) => a.id - b.id,
        },
        {
            title: 'Tên hệ thống',
            dataIndex: 'name',
            render: (v) => <Text strong>{v}</Text>,
            sorter: (a, b) => a.name.localeCompare(b.name),
        },
        {
            title: 'Tên hiển thị (KH)',
            dataIndex: 'display_name',
            render: (v) => v ? <Text>{v}</Text> : <Text type="secondary">—</Text>,
        },
        {
            title: 'Giá trị thuộc tính',
            dataIndex: 'attributes',
            render: (attrs: Attribute[]) => {
                if (!attrs || attrs.length === 0) return <Text type="secondary">Chưa có giá trị</Text>;
                return (
                    <Space wrap>
                        {attrs.map(a => (
                            <Tag key={a.id} color="blue" style={{ borderRadius: 20 }}>
                                {a.color_code && (
                                    <span style={{
                                        display: 'inline-block', width: 10, height: 10,
                                        borderRadius: '50%', background: a.color_code,
                                        marginRight: 6, border: '1px solid #ddd'
                                    }} />
                                )}
                                {a.value}
                            </Tag>
                        ))}
                    </Space>
                );
            },
        },
        {
            title: 'Hành động',
            align: 'center',
            width: 120,
            render: (_, r) => (
                <Space>
                    <Tooltip title="Sửa">
                        <Button type="primary" ghost size="small" icon={<EditOutlined />} onClick={() => openEditModal(r)} />
                    </Tooltip>
                    <Popconfirm
                        title={<>Xóa nhóm thuộc tính này?<br /><Text type="danger" style={{ fontSize: 12 }}>Các biến thể đang dùng thuộc tính này có thể bị ảnh hưởng.</Text></>}
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Title level={4} style={{ margin: 0 }}>
                    <TagsOutlined style={{ marginRight: 10, color: '#1677ff' }} />
                    Nhóm Thuộc Tính (Attribute Groups)
                </Title>
                <Button
                    type="primary" icon={<PlusOutlined />}
                    onClick={openAddModal}
                    style={{ background: 'linear-gradient(135deg,#1677ff,#0958d9)', border: 'none', borderRadius: 8, height: 38, fontWeight: 600 }}
                >
                    Thêm nhóm mới
                </Button>
            </div>

            <Card style={{ marginBottom: 16, borderRadius: 10 }}>
                <Row gutter={[12, 12]} align="middle">
                    <Col flex="auto">
                        <Input
                            placeholder="Tìm kiếm nhóm thuộc tính..."
                            prefix={<SearchOutlined />}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onPressEnter={handleSearch}
                            allowClear
                        />
                    </Col>
                    <Col>
                        <Space>
                            <Button type="primary" onClick={handleSearch} icon={<SearchOutlined />}>Lọc</Button>
                            <Button icon={<ReloadOutlined />} onClick={handleReset}>Reset</Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            <Table
                columns={columns}
                dataSource={groups}
                rowKey="id"
                loading={loading}
                style={{ background: '#fff', borderRadius: 10 }}
                pagination={{
                    current: pagination.current,
                    total: pagination.total,
                    pageSize: pagination.pageSize,
                    showTotal: (t) => `Tổng ${t} nhóm`,
                    onChange: (page) => fetchGroups(page),
                }}
            />

            {/* Modal Add/Edit */}
            <Modal
                title={
                    <Space>
                        <ThunderboltOutlined style={{ color: '#fa8c16' }} />
                        {modalMode === 'add' ? 'Thêm nhóm thuộc tính' : 'Sửa nhóm thuộc tính'}
                    </Space>
                }
                open={isModalOpen}
                onCancel={() => setIsModalOpen(false)}
                onOk={handleModalSubmit}
                confirmLoading={submitting}
                okText="Lưu lại"
                cancelText="Hủy bỏ"
                width={700}
                destroyOnClose
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="name" label="Tên hệ thống (vd: MauSac, Size)" rules={[{ required: true, message: 'Nhập tên hệ thống' }]}>
                                <Input placeholder="Color / Size..." />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="display_name" label="Tên hiển thị ngoại vi (vd: Màu sắc, Kích cỡ)">
                                <Input placeholder="Tùy chọn, sẽ hiển thị ra frontend" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Card title={<><TagsOutlined /> Các giá trị thuộc tính</>} size="small" type="inner" style={{ background: '#fafafa' }}>
                        <Form.List name="attributes">
                            {(fields, { add, remove }) => {
                                return (
                                    <>
                                        {fields.map(({ key, name, ...restField }) => (
                                            <Space key={key} style={{ display: 'flex', marginBottom: 8 }} align="baseline">
                                                {/* Hidden ID field for edit mapping */}
                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'id']}
                                                    style={{ display: 'none' }}
                                                >
                                                    <Input />
                                                </Form.Item>

                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'value']}
                                                    rules={[{ required: true, message: 'Nhập giá trị' }]}
                                                    style={{ width: 200, margin: 0 }}
                                                >
                                                    <Input placeholder="Giá trị (Đỏ, Xanh, S, M...)" />
                                                </Form.Item>

                                                <Form.Item
                                                    {...restField}
                                                    name={[name, 'color_code']}
                                                    style={{ width: 160, margin: 0 }}
                                                >
                                                    <Input
                                                        placeholder="Mã màu (#hex)"
                                                        suffix={
                                                            <ColorPicker
                                                                size="small"
                                                                onChange={(c) => {
                                                                    const hex = c.toHexString();
                                                                    const attrs = form.getFieldValue('attributes');
                                                                    attrs[name].color_code = hex;
                                                                    form.setFieldsValue({ attributes: [...attrs] });
                                                                }}
                                                            />
                                                        }
                                                    />
                                                </Form.Item>

                                                <MinusCircleOutlined
                                                    style={{ color: '#ff4d4f', fontSize: 16, cursor: 'pointer' }}
                                                    onClick={() => remove(name)}
                                                />
                                            </Space>
                                        ))}
                                        <Form.Item style={{ marginTop: 12, marginBottom: 0 }}>
                                            <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                                Thêm giá trị thuộc tính
                                            </Button>
                                        </Form.Item>
                                    </>
                                )
                            }}
                        </Form.List>
                    </Card>
                </Form>
            </Modal>
        </div>
    );
};

export default AdminAttributeGroupPage;

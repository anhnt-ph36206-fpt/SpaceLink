import React, { useEffect, useState } from 'react';
import {
    Table, Button, Space, Typography, Popconfirm, Card,
    Row, Col, Input, Tag, Modal, Form, Tooltip
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    TagsOutlined, PlusOutlined, EditOutlined, DeleteOutlined,
    SearchOutlined, ReloadOutlined, ThunderboltOutlined,
    MinusCircleOutlined,
} from '@ant-design/icons';
import { axiosInstance } from '../../../api/axios';
import { toast } from 'react-toastify';

const { Title, Text } = Typography;

interface Specification {
    id: number;
    name: string;
    display_order: number;
}

interface SpecificationGroup {
    id: number;
    name: string;
    display_order: number;
    specifications: Specification[];
}

const API_URL = '/admin/specification-groups';

const AdminSpecificationGroupPage: React.FC = () => {
    const [groups, setGroups] = useState<SpecificationGroup[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');
    const [pagination, setPagination] = useState({ current: 1, total: 0, pageSize: 10 });

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
    const [currentGroup, setCurrentGroup] = useState<SpecificationGroup | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const [form] = Form.useForm();

    const fetchGroups = async (page = 1) => {
        try {
            setLoading(true);
            const res = await axiosInstance.get(API_URL, {
                params: {
                    page,
                    search: search || undefined,
                    per_page: 10,
                }
            });
            setGroups(res.data.data);
            // Laravel paginator fields inside data object when using custom json structure or paginator
            if (res.data.current_page) {
                setPagination({
                    current: res.data.current_page,
                    total: res.data.total,
                    pageSize: res.data.per_page,
                });
            }
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Lỗi tải danh sách nhóm thông số');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchGroups();
    }, []);

    const handleDelete = async (id: number) => {
        try {
            await axiosInstance.delete(`${API_URL}/${id}`);
            toast.success('Đã xóa nhóm thông số kỹ thuật');
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
        form.setFieldsValue({ display_order: 0, specifications: [{ name: '' }] });
        setIsModalOpen(true);
    };

    const openEditModal = (group: SpecificationGroup) => {
        setModalMode('edit');
        setCurrentGroup(group);
        form.setFieldsValue({
            name: group.name,
            display_order: group.display_order,
            // mapping specifications to fit form
            specifications: group.specifications?.length > 0 ? group.specifications.map(a => ({
                id: a.id,
                name: a.name,
            })) : [{ name: '' }],
        });
        setIsModalOpen(true);
    };

    const handleModalSubmit = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);

            // Clean up specifications before sending
            const specifications = values.specifications
                ?.filter((a: any) => a && a.name && a.name.trim() !== '')
                .map((a: any, index: number) => ({
                    id: a.id || undefined,
                    name: a.name.trim(),
                    display_order: index,
                })) || [];

            const payload = {
                name: values.name.trim(),
                display_order: values.display_order || 0,
                specifications: specifications.length > 0 ? specifications : [],
            };

            if (modalMode === 'add') {
                await axiosInstance.post(API_URL, payload);
                toast.success('Thêm nhóm thông số thành công');
            } else {
                await axiosInstance.put(`${API_URL}/${currentGroup!.id}`, payload);
                toast.success('Cập nhật nhóm thông số thành công');
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

    const columns: ColumnsType<SpecificationGroup> = [
        {
            title: '# ID',
            dataIndex: 'id',
            width: 80,
            align: 'center',
            sorter: (a, b) => a.id - b.id,
        },
        {
            title: 'Tên Nhóm Thông Số',
            dataIndex: 'name',
            render: (v) => <Text strong>{v}</Text>,
            sorter: (a, b) => a.name.localeCompare(b.name),
        },
        {
            title: 'Các Thông Số',
            dataIndex: 'specifications',
            render: (specs: Specification[]) => {
                if (!specs || specs.length === 0) return <Text type="secondary">Chưa có thông số</Text>;
                return (
                    <Space wrap>
                        {specs.map(a => (
                            <Tag key={a.id} color="purple" style={{ borderRadius: 20 }}>
                                {a.name}
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
                        title={<>Xóa nhóm thông số này?<br /><Text type="danger" style={{ fontSize: 12 }}>Các thông số sản phẩm đang dùng có thể bị ảnh hưởng.</Text></>}
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
                    <ThunderboltOutlined style={{ marginRight: 10, color: '#722ed1' }} />
                    Nhóm Thông Số Kỹ Thuật
                </Title>
                <Button
                    type="primary" icon={<PlusOutlined />}
                    onClick={openAddModal}
                    style={{ background: 'linear-gradient(135deg,#722ed1,#9254de)', border: 'none', borderRadius: 8, height: 38, fontWeight: 600 }}
                >
                    Thêm nhóm mới
                </Button>
            </div>

            <Card style={{ marginBottom: 16, borderRadius: 10 }}>
                <Row gutter={[12, 12]} align="middle">
                    <Col flex="auto">
                        <Input
                            placeholder="Tìm kiếm nhóm thông số..."
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
                        <ThunderboltOutlined style={{ color: '#722ed1' }} />
                        {modalMode === 'add' ? 'Thêm nhóm thông số' : 'Sửa nhóm thông số'}
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
                        <Col span={24}>
                            <Form.Item name="name" label="Tên nhóm thông số (vd: Màn hình, Camera)" rules={[{ required: true, message: 'Nhập tên nhóm' }]}>
                                <Input placeholder="Vd: Màn hình" />
                            </Form.Item>
                        </Col>
                        {/* Ẩn display_order để gọn (mặc định lấy theo thứ tự gửi lên hoặc 0) */}
                        <Form.Item name="display_order" hidden><Input /></Form.Item>
                    </Row>

                    <Card title={<><TagsOutlined /> Các thông số chi tiết (Specifications)</>} size="small" type="inner" style={{ background: '#fafafa' }}>
                        <Form.List name="specifications">
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
                                                    name={[name, 'name']}
                                                    rules={[{ required: true, message: 'Nhập tên thông số' }]}
                                                    style={{ width: 400, margin: 0 }}
                                                >
                                                    <Input placeholder="Vd: Kích thước màn hình, Tần số quét..." />
                                                </Form.Item>

                                                <MinusCircleOutlined
                                                    style={{ color: '#ff4d4f', fontSize: 16, cursor: 'pointer' }}
                                                    onClick={() => remove(name)}
                                                />
                                            </Space>
                                        ))}
                                        <Form.Item style={{ marginTop: 12, marginBottom: 0 }}>
                                            <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined />}>
                                                Thêm thông số mới
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

export default AdminSpecificationGroupPage;

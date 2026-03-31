import React, { useEffect, useState, useCallback } from 'react';
import {
    Button, Table, Modal, Form, Input, Select,
    Space, Popconfirm, Typography, Tag, Collapse,
    Empty, Spin, Tooltip, Badge, Divider, Alert
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    SaveOutlined, ReloadOutlined, SettingOutlined,
    AppstoreAddOutlined, BulbOutlined, CheckCircleOutlined
} from '@ant-design/icons';
import { axiosInstance } from '../../../api/axios';
import { toast } from 'react-toastify';

const { Text, Title } = Typography;
const { Panel } = Collapse;

// ─── Types ────────────────────────────────────────────────────────────────────
interface SpecGroup {
    id: number;
    name: string;
    display_name: string;
    display_order?: number;
}

interface Spec {
    id: number;
    spec_group_id: number;
    name: string;
    value: string;
    display_order: number;
}

interface GroupedSpec {
    group: string;
    specs: Spec[];
}

interface Props {
    productId: number;
}

// ─── Component ────────────────────────────────────────────────────────────────
const ProductSpecifications: React.FC<Props> = ({ productId }) => {
    const [groupedSpecs, setGroupedSpecs] = useState<GroupedSpec[]>([]);
    const [specGroups, setSpecGroups] = useState<SpecGroup[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingSpec, setEditingSpec] = useState<Spec | null>(null);
    const [modalForm] = Form.useForm();

    // ── Data fetching ──────────────────────────────────────────────────────────
    const fetchSpecs = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get(`/admin/products/${productId}/specifications`);
            setGroupedSpecs(res.data.data || []);
        } catch {
            toast.error('Không thể tải thông số kỹ thuật');
        } finally {
            setLoading(false);
        }
    }, [productId]);

    const fetchSpecGroups = useCallback(async () => {
        try {
            const res = await axiosInstance.get('/admin/specification-groups');
            setSpecGroups(res.data.data || []);
        } catch {
            // Silently fail — groups list is optional
        }
    }, []);

    useEffect(() => {
        fetchSpecs();
        fetchSpecGroups();
    }, [fetchSpecs, fetchSpecGroups]);

    // ── Helpers ───────────────────────────────────────────────────────────────
    const totalCount = groupedSpecs.reduce((sum, g) => sum + g.specs.length, 0);

    // ── Add / Edit Modal ──────────────────────────────────────────────────────
    const openAdd = () => {
        setEditingSpec(null);
        modalForm.resetFields();
        setModalOpen(true);
    };

    const openEdit = (spec: Spec) => {
        setEditingSpec(spec);
        modalForm.setFieldsValue({
            spec_group_id: spec.spec_group_id,
            name: spec.name,
            value: spec.value,
            display_order: spec.display_order,
        });
        setModalOpen(true);
    };

    const handleModalOk = async () => {
        try {
            const values = await modalForm.validateFields();
            setSaving(true);
            if (editingSpec) {
                await axiosInstance.put(
                    `/admin/products/${productId}/specifications/${editingSpec.id}`,
                    values
                );
                toast.success('Cập nhật thông số thành công');
            } else {
                await axiosInstance.post(
                    `/admin/products/${productId}/specifications`,
                    values
                );
                toast.success('Thêm thông số thành công');
            }
            setModalOpen(false);
            fetchSpecs();
        } catch (err: any) {
            if (err?.errorFields) return; // validation error, already shown
            const msg = err?.response?.data?.message || 'Lưu thất bại';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    // ── Delete ────────────────────────────────────────────────────────────────
    const handleDelete = async (spec: Spec) => {
        try {
            await axiosInstance.delete(
                `/admin/products/${productId}/specifications/${spec.id}`
            );
            toast.success('Đã xóa thông số');
            // Optimistic update
            setGroupedSpecs(prev =>
                prev
                    .map(g => ({ ...g, specs: g.specs.filter(s => s.id !== spec.id) }))
                    .filter(g => g.specs.length > 0)
            );
        } catch {
            toast.error('Xóa thất bại');
        }
    };

    // ── Table columns ─────────────────────────────────────────────────────────
    const columns = [
        {
            title: '#',
            dataIndex: 'display_order',
            width: 50,
            render: (_: any, __: any, idx: number) => (
                <Text type="secondary" style={{ fontSize: 12 }}>{idx + 1}</Text>
            ),
        },
        {
            title: 'Tên thông số',
            dataIndex: 'name',
            key: 'name',
            render: (v: string) => <Text strong>{v}</Text>,
        },
        {
            title: 'Giá trị',
            dataIndex: 'value',
            key: 'value',
            render: (v: string) => (
                <Tag
                    color="blue"
                    style={{ borderRadius: 6, padding: '2px 10px', fontSize: 13 }}
                >
                    {v}
                </Tag>
            ),
        },
        {
            title: '',
            key: 'actions',
            width: 90,
            align: 'right' as const,
            render: (_: any, record: Spec) => (
                <Space size={4}>
                    <Tooltip title="Chỉnh sửa">
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            size="small"
                            onClick={() => openEdit(record)}
                            style={{ color: '#1677ff' }}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Xóa thông số này?"
                        description="Thao tác này không thể hoàn tác."
                        onConfirm={() => handleDelete(record)}
                        okText="Xóa"
                        cancelText="Huỷ"
                        okButtonProps={{ danger: true }}
                    >
                        <Tooltip title="Xóa">
                            <Button
                                type="text"
                                icon={<DeleteOutlined />}
                                size="small"
                                danger
                            />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    // ── Render ────────────────────────────────────────────────────────────────
    return (
        <div style={{ padding: '4px 0' }}>
            {/* Header bar */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: 20,
                }}
            >
                <Space align="center">
                    <Title level={5} style={{ margin: 0 }}>
                        <SettingOutlined style={{ color: '#1677ff', marginRight: 8 }} />
                        Thông số kỹ thuật sản phẩm
                    </Title>
                    <Badge
                        count={totalCount}
                        style={{ backgroundColor: totalCount > 0 ? '#1677ff' : '#d9d9d9' }}
                        showZero
                    />
                </Space>
                <Space>
                    <Tooltip title="Làm mới">
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={fetchSpecs}
                            loading={loading}
                        />
                    </Tooltip>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={openAdd}
                        style={{ borderRadius: 8 }}
                    >
                        Thêm thông số
                    </Button>
                </Space>
            </div>

            {/* Hint */}
            {totalCount === 0 && !loading && (
                <Alert
                    type="info"
                    showIcon
                    icon={<BulbOutlined />}
                    message="Chưa có thông số kỹ thuật nào"
                    description='Nhấn "Thêm thông số" để bắt đầu thêm thông tin như CPU, RAM, màn hình, v.v.'
                    style={{ marginBottom: 20, borderRadius: 10 }}
                />
            )}

            {/* Grouped spec panels */}
            <Spin spinning={loading} tip="Đang tải...">
                {groupedSpecs.length > 0 ? (
                    <Collapse
                        defaultActiveKey={groupedSpecs.map((_, i) => String(i))}
                        style={{ borderRadius: 12, overflow: 'hidden' }}
                        expandIconPosition="end"
                    >
                        {groupedSpecs.map((group, idx) => (
                            <Panel
                                key={String(idx)}
                                header={
                                    <Space>
                                        <AppstoreAddOutlined style={{ color: '#722ed1' }} />
                                        <Text strong style={{ fontSize: 14 }}>
                                            {group.group}
                                        </Text>
                                        <Tag color="purple" style={{ borderRadius: 10, fontSize: 11 }}>
                                            {group.specs.length} mục
                                        </Tag>
                                    </Space>
                                }
                                style={{ marginBottom: 4 }}
                            >
                                <Table
                                    dataSource={group.specs}
                                    rowKey="id"
                                    columns={columns}
                                    pagination={false}
                                    size="small"
                                    showHeader={false}
                                    style={{ borderRadius: 8 }}
                                    rowClassName={() => 'spec-row'}
                                />
                            </Panel>
                        ))}
                    </Collapse>
                ) : (
                    !loading && (
                        <Empty
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                            description="Chưa có thông số kỹ thuật"
                        />
                    )
                )}
            </Spin>

            {totalCount > 0 && (
                <div style={{ marginTop: 16, textAlign: 'right' }}>
                    <Space>
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        <Text type="secondary">
                            Tổng cộng <Text strong>{totalCount}</Text> thông số trong{' '}
                            <Text strong>{groupedSpecs.length}</Text> nhóm
                        </Text>
                    </Space>
                </div>
            )}

            <Divider />

            {/* ── Modal: Add / Edit ───────────────────────────────────────────── */}
            <Modal
                open={modalOpen}
                title={
                    <Space>
                        {editingSpec ? <EditOutlined style={{ color: '#1677ff' }} /> : <PlusOutlined style={{ color: '#52c41a' }} />}
                        <span>{editingSpec ? 'Chỉnh sửa thông số' : 'Thêm thông số kỹ thuật'}</span>
                    </Space>
                }
                onCancel={() => setModalOpen(false)}
                onOk={handleModalOk}
                confirmLoading={saving}
                okText={editingSpec ? <><SaveOutlined /> Cập nhật</> : <><PlusOutlined /> Thêm mới</>}
                cancelText="Huỷ"
                width={560}
                destroyOnClose
                bodyStyle={{ paddingTop: 20 }}
                okButtonProps={{ style: { borderRadius: 8 } }}
                cancelButtonProps={{ style: { borderRadius: 8 } }}
            >
                <Form form={modalForm} layout="vertical" size="middle">
                    <Form.Item
                        name="spec_group_id"
                        label="Nhóm thông số"
                        rules={[{ required: true, message: 'Vui lòng chọn nhóm thông số' }]}
                    >
                        <Select
                            placeholder="Chọn nhóm thông số..."
                            showSearch
                            optionFilterProp="label"
                            style={{ borderRadius: 8 }}
                            options={specGroups.map(g => ({
                                value: g.id,
                                label: g.display_name,
                            }))}
                            notFoundContent={
                                <Text type="secondary">Không có nhóm nào. Hãy tạo nhóm trước.</Text>
                            }
                        />
                    </Form.Item>

                    <Form.Item
                        name="name"
                        label="Tên thông số"
                        rules={[
                            { required: true, message: 'Vui lòng nhập tên thông số' },
                            { max: 150, message: 'Tối đa 150 ký tự' },
                        ]}
                    >
                        <Input
                            placeholder="Ví dụ: CPU, RAM, Màn hình, Dung lượng pin..."
                            allowClear
                            style={{ borderRadius: 8 }}
                        />
                    </Form.Item>

                    <Form.Item
                        name="value"
                        label="Giá trị"
                        rules={[
                            { required: true, message: 'Vui lòng nhập giá trị' },
                            { max: 500, message: 'Tối đa 500 ký tự' },
                        ]}
                    >
                        <Input.TextArea
                            rows={2}
                            placeholder="Ví dụ: Apple M3 Pro, 16GB DDR5, 6.1 inch OLED..."
                            allowClear
                            style={{ borderRadius: 8 }}
                        />
                    </Form.Item>

                    <Form.Item
                        name="display_order"
                        label="Thứ tự hiển thị"
                        initialValue={0}
                        tooltip="Số nhỏ hơn sẽ hiển thị trước"
                    >
                        <Input
                            type="number"
                            min={0}
                            style={{ borderRadius: 8, width: 120 }}
                            placeholder="0"
                        />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ProductSpecifications;

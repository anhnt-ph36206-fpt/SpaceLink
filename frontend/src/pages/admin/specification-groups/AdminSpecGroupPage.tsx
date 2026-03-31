import React, { useEffect, useState, useCallback } from 'react';
import {
    Table, Button, Modal, Form, Input, InputNumber,
    Space, Popconfirm, Typography, Tag, Card,
    Tooltip, Badge, Breadcrumb, Divider, Empty, Spin
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    ReloadOutlined, SettingOutlined, SaveOutlined,
    OrderedListOutlined, SearchOutlined
} from '@ant-design/icons';
import { axiosInstance } from '../../../api/axios';
import { toast } from 'react-toastify';

const { Title, Text } = Typography;

// ─── Types ────────────────────────────────────────────────────────────────────
interface SpecGroup {
    id: number;
    name: string;
    display_name: string;
    display_order: number;
    created_at?: string;
    updated_at?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────
const AdminSpecGroupPage: React.FC = () => {
    const [groups, setGroups] = useState<SpecGroup[]>([]);
    const [filtered, setFiltered] = useState<SpecGroup[]>([]);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [searchText, setSearchText] = useState('');

    const [modalOpen, setModalOpen] = useState(false);
    const [editingGroup, setEditingGroup] = useState<SpecGroup | null>(null);
    const [form] = Form.useForm();

    // ── Fetch ──────────────────────────────────────────────────────────────────
    const fetchGroups = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get('/admin/specification-groups');
            const data: SpecGroup[] = res.data.data || [];
            setGroups(data);
            setFiltered(data);
        } catch {
            toast.error('Không thể tải danh sách nhóm thông số');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchGroups();
    }, [fetchGroups]);

    // ── Search ─────────────────────────────────────────────────────────────────
    useEffect(() => {
        const q = searchText.trim().toLowerCase();
        if (!q) {
            setFiltered(groups);
        } else {
            setFiltered(
                groups.filter(
                    g =>
                        g.name.toLowerCase().includes(q) ||
                        g.display_name.toLowerCase().includes(q)
                )
            );
        }
    }, [searchText, groups]);

    // ── Modal open ─────────────────────────────────────────────────────────────
    const openAdd = () => {
        setEditingGroup(null);
        form.resetFields();
        form.setFieldsValue({ display_order: 0 });
        setModalOpen(true);
    };

    const openEdit = (group: SpecGroup) => {
        setEditingGroup(group);
        form.setFieldsValue({
            name: group.name,
            display_name: group.display_name,
            display_order: group.display_order ?? 0,
        });
        setModalOpen(true);
    };

    // ── Save ───────────────────────────────────────────────────────────────────
    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);

            if (editingGroup) {
                const res = await axiosInstance.put(`/admin/specification-groups/${editingGroup.id}`, values);
                const updated: SpecGroup = res.data.data;
                setGroups(prev => prev.map(g => g.id === updated.id ? updated : g));
                toast.success('Cập nhật nhóm thành công');
            } else {
                const res = await axiosInstance.post('/admin/specification-groups', values);
                setGroups(prev => [...prev, res.data.data]);
                toast.success('Thêm nhóm thông số thành công');
            }

            setModalOpen(false);
        } catch (err: any) {
            if (err?.errorFields) return;
            const msg = err?.response?.data?.message || 'Lưu thất bại';
            toast.error(msg);
        } finally {
            setSaving(false);
        }
    };

    // ── Delete ─────────────────────────────────────────────────────────────────
    const handleDelete = async (group: SpecGroup) => {
        try {
            await axiosInstance.delete(`/admin/specification-groups/${group.id}`);
            setGroups(prev => prev.filter(g => g.id !== group.id));
            toast.success('Đã xóa nhóm thông số');
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Xóa thất bại');
        }
    };

    // ── Columns ────────────────────────────────────────────────────────────────
    const columns: ColumnsType<SpecGroup> = [
        {
            title: 'STT',
            width: 60,
            align: 'center',
            render: (_, __, idx) => (
                <Text type="secondary" style={{ fontSize: 12 }}>{idx + 1}</Text>
            ),
        },
        {
            title: 'Tên kỹ thuật (name)',
            dataIndex: 'name',
            key: 'name',
            render: (v: string) => (
                <Tag
                    color="geekblue"
                    style={{ fontFamily: 'monospace', fontSize: 13, borderRadius: 6, padding: '2px 10px' }}
                >
                    {v}
                </Tag>
            ),
        },
        {
            title: 'Tên hiển thị',
            dataIndex: 'display_name',
            key: 'display_name',
            render: (v: string) => <Text strong>{v}</Text>,
        },
        {
            title: 'Thứ tự',
            dataIndex: 'display_order',
            key: 'display_order',
            width: 100,
            align: 'center',
            sorter: (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0),
            render: (v: number) => (
                <Badge
                    count={v ?? 0}
                    showZero
                    style={{
                        backgroundColor: '#f0f5ff',
                        color: '#1677ff',
                        boxShadow: 'none',
                        border: '1px solid #adc6ff',
                        fontWeight: 600,
                    }}
                />
            ),
        },
        {
            title: 'Thao tác',
            key: 'actions',
            width: 120,
            align: 'center',
            render: (_, record) => (
                <Space size={4}>
                    <Tooltip title="Chỉnh sửa">
                        <Button
                            type="primary"
                            ghost
                            icon={<EditOutlined />}
                            size="small"
                            onClick={() => openEdit(record)}
                            style={{ borderRadius: 6 }}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Xóa nhóm thông số này?"
                        description={
                            <Text type="secondary">
                                Tất cả thông số kỹ thuật thuộc nhóm này cũng sẽ bị xóa.
                            </Text>
                        }
                        onConfirm={() => handleDelete(record)}
                        okText="Xóa"
                        cancelText="Huỷ"
                        okButtonProps={{ danger: true }}
                        placement="left"
                    >
                        <Tooltip title="Xóa">
                            <Button
                                danger
                                ghost
                                icon={<DeleteOutlined />}
                                size="small"
                                style={{ borderRadius: 6 }}
                            />
                        </Tooltip>
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div style={{ padding: 24, maxWidth: 1000, margin: '0 auto' }}>
            {/* Breadcrumb */}
            <Breadcrumb
                style={{ marginBottom: 16 }}
                items={[
                    { title: 'Admin' },
                    { title: 'Cấu hình' },
                    { title: 'Nhóm thông số kỹ thuật' },
                ]}
            />

            {/* Page header */}
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 24,
                    flexWrap: 'wrap',
                    gap: 12,
                }}
            >
                <div>
                    <Title level={3} style={{ margin: 0 }}>
                        <SettingOutlined style={{ color: '#1677ff', marginRight: 10 }} />
                        Nhóm thông số kỹ thuật
                    </Title>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                        Quản lý các nhóm phân loại thông số (CPU, Màn hình, Pin, v.v.)
                    </Text>
                </div>
                <Space wrap>
                    <Tooltip title="Làm mới">
                        <Button
                            icon={<ReloadOutlined />}
                            onClick={fetchGroups}
                            loading={loading}
                            style={{ borderRadius: 8 }}
                        />
                    </Tooltip>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={openAdd}
                        size="large"
                        style={{ borderRadius: 8, height: 45, padding: '0 20px' }}
                    >
                        Thêm nhóm mới
                    </Button>
                </Space>
            </div>

            {/* Main card */}
            <Card
                style={{ borderRadius: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}
                styles={{ body: { padding: 0 } }}
            >
                {/* Toolbar */}
                <div
                    style={{
                        padding: '16px 20px',
                        borderBottom: '1px solid #f0f0f0',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: 12,
                    }}
                >
                    <Space>
                        <OrderedListOutlined style={{ color: '#1677ff' }} />
                        <Text strong>
                            Tổng cộng:{' '}
                            <Text style={{ color: '#1677ff' }}>{filtered.length}</Text> nhóm
                        </Text>
                    </Space>
                    <Input
                        placeholder="Tìm kiếm nhóm thông số..."
                        prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
                        value={searchText}
                        onChange={e => setSearchText(e.target.value)}
                        allowClear
                        style={{ width: 260, borderRadius: 8 }}
                    />
                </div>

                {/* Table */}
                <Spin spinning={loading}>
                    <Table<SpecGroup>
                        columns={columns}
                        dataSource={filtered}
                        rowKey="id"
                        pagination={{
                            pageSize: 15,
                            showSizeChanger: false,
                            showTotal: (total) => `${total} nhóm`,
                            style: { padding: '8px 20px' }
                        }}
                        locale={{
                            emptyText: (
                                <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description="Chưa có nhóm thông số nào. Nhấn 'Thêm nhóm mới' để bắt đầu."
                                />
                            )
                        }}
                        style={{ borderRadius: 0 }}
                        size="middle"
                        rowClassName={(_, idx) =>
                            idx % 2 === 0 ? 'table-row-light' : 'table-row-dark'
                        }
                    />
                </Spin>
            </Card>

            {/* Info box */}
            <div
                style={{
                    marginTop: 16,
                    padding: '12px 16px',
                    background: '#f0f5ff',
                    borderRadius: 10,
                    border: '1px solid #adc6ff',
                }}
            >
                <Text style={{ fontSize: 12, color: '#1677ff' }}>
                    💡 <strong>Lưu ý:</strong> Nhóm thông số được dùng để phân loại các thông số cho sản phẩm.
                    Ví dụ: nhóm <em>"Bộ vi xử lý"</em> chứa các thông số CPU, Số nhân, Tốc độ xử lý.
                    Xóa nhóm sẽ xóa toàn bộ thông số thuộc nhóm đó trên tất cả sản phẩm.
                </Text>
            </div>

            {/* ── Modal Add/Edit ───────────────────────────────────────────────── */}
            <Modal
                open={modalOpen}
                title={
                    <Space>
                        {editingGroup
                            ? <EditOutlined style={{ color: '#1677ff' }} />
                            : <PlusOutlined style={{ color: '#52c41a' }} />
                        }
                        <span style={{ fontSize: 16 }}>
                            {editingGroup ? 'Chỉnh sửa nhóm thông số' : 'Thêm nhóm thông số mới'}
                        </span>
                    </Space>
                }
                onCancel={() => setModalOpen(false)}
                onOk={handleSave}
                confirmLoading={saving}
                okText={editingGroup ? <><SaveOutlined /> Cập nhật</> : <><PlusOutlined /> Thêm mới</>}
                cancelText="Huỷ"
                width={520}
                destroyOnClose
                styles={{ body: { paddingTop: 24 } }}
                okButtonProps={{ style: { borderRadius: 8, height: 38 } }}
                cancelButtonProps={{ style: { borderRadius: 8, height: 38 } }}
            >
                <Form form={form} layout="vertical" size="large">
                    <Form.Item
                        name="name"
                        label={
                            <span>
                                Tên kỹ thuật{' '}
                                <Text type="secondary" style={{ fontSize: 12 }}>(dùng trong code)</Text>
                            </span>
                        }
                        rules={[
                            { required: true, message: 'Vui lòng nhập tên kỹ thuật' },
                            { max: 100, message: 'Tối đa 100 ký tự' },
                            {
                                pattern: /^[a-z0-9_-]+$/,
                                message: 'Chỉ dùng chữ thường, số, dấu gạch dưới (_) hoặc gạch ngang (-)'
                            }
                        ]}
                        tooltip="Tên nội bộ, không dùng dấu, viết thường. VD: cpu, ram, display"
                    >
                        <Input
                            placeholder="vd: cpu, ram, display, battery"
                            allowClear
                            style={{ borderRadius: 8, fontFamily: 'monospace' }}
                            disabled={!!editingGroup}
                        />
                    </Form.Item>

                    <Form.Item
                        name="display_name"
                        label="Tên hiển thị"
                        rules={[
                            { required: true, message: 'Vui lòng nhập tên hiển thị' },
                            { max: 100, message: 'Tối đa 100 ký tự' },
                        ]}
                        tooltip="Tên hiển thị cho người dùng thấy trên trang sản phẩm"
                    >
                        <Input
                            placeholder="vd: Bộ vi xử lý, RAM, Màn hình, Dung lượng pin"
                            allowClear
                            style={{ borderRadius: 8 }}
                        />
                    </Form.Item>

                    <Form.Item
                        name="display_order"
                        label="Thứ tự hiển thị"
                        tooltip="Số nhỏ hơn sẽ hiển thị trước trong danh sách thông số sản phẩm"
                    >
                        <InputNumber
                            min={0}
                            max={9999}
                            style={{ width: 150, borderRadius: 8 }}
                            placeholder="0"
                        />
                    </Form.Item>

                    <Divider style={{ margin: '0 0 8px' }} />
                    {editingGroup && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                            ⚠️ Tên kỹ thuật không thể chỉnh sửa sau khi tạo để tránh ảnh hưởng dữ liệu.
                        </Text>
                    )}
                </Form>
            </Modal>
        </div>
    );
};

export default AdminSpecGroupPage;

import React, { useEffect, useState } from 'react';
import {
    Table, Button, Modal, Form, Input, Switch, Space, Tag,
    Typography, Popconfirm, Card, Row, Col, Select, DatePicker, InputNumber
} from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, GiftOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { axiosInstance } from "../../../api/axios";
import { toast } from "react-toastify";
import { voucherPrefix } from "../../../api/apiAdminPrefix";
import dayjs from 'dayjs';

const { Title } = Typography;
const { RangePicker } = DatePicker;

interface Voucher {
    id: number;
    code: string;
    name: string;
    description: string | null;
    discount_type: 'percent' | 'fixed';
    discount_value: number;
    max_discount: number | null;
    min_order_amount: number | null;
    quantity: number | null;
    usage_limit_per_user: number | null;
    used_count: number;
    start_date: string;
    end_date: string;
    is_active: boolean;
    usages_count?: number;
}

const formatVND = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

const AdminVoucherPage: React.FC = () => {
    const [vouchers, setVouchers] = useState<Voucher[]>([]);
    const [loading, setLoading] = useState(false);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Voucher | null>(null);
    const [form] = Form.useForm();

    const [search, setSearch] = useState('');
    const [isActive, setIsActive] = useState<boolean | undefined>(undefined);

    const [pagination, setPagination] = useState({ current: 1, pageSize: 15, total: 0 });

    const fetchVouchers = async (page = 1, pageSize = 15) => {
        setLoading(true);
        try {
            const params: any = { page, per_page: pageSize };
            if (search) params.search = search;
            if (isActive !== undefined) params.is_active = isActive ? 1 : 0;

            const res = await axiosInstance.get(voucherPrefix, { params });
            const payload = res.data;
            setVouchers(payload.data?.data || payload.data || []);
            setPagination({
                current: payload.data?.meta?.current_page || payload.meta?.current_page || page,
                pageSize: payload.data?.meta?.per_page || payload.meta?.per_page || pageSize,
                total: payload.data?.meta?.total || payload.meta?.total || 0,
            });
        } catch (error) {
            toast.error('Không thể tải danh sách mã giảm giá');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchVouchers();
    }, []);

    const handleTableChange = (pag: any) => {
        fetchVouchers(pag.current, pag.pageSize);
    };

    const handleFilter = () => {
        fetchVouchers(1, pagination.pageSize);
    };

    const openAdd = () => {
        setEditingItem(null);
        form.resetFields();
        form.setFieldsValue({ 
            is_active: true, 
            discount_type: 'percent',
            min_order_amount: 0
        });
        setModalOpen(true);
    };

    const openEdit = (item: Voucher) => {
        setEditingItem(item);
        form.setFieldsValue({
            ...item,
            dates: [dayjs(item.start_date), dayjs(item.end_date)],
        });
        setModalOpen(true);
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            
            const payload = {
                ...values,
                start_date: values.dates[0].format('YYYY-MM-DD HH:mm:ss'),
                end_date: values.dates[1].format('YYYY-MM-DD HH:mm:ss'),
            };
            delete payload.dates;

            if (editingItem) {
                await axiosInstance.put(`${voucherPrefix}/${editingItem.id}`, payload);
                toast.success('Cập nhật voucher thành công');
            } else {
                await axiosInstance.post(voucherPrefix, payload);
                toast.success('Thêm voucher thành công');
            }

            setModalOpen(false);
            fetchVouchers(pagination.current, pagination.pageSize);
        } catch (error: any) {
            if (error?.response?.data?.errors) {
                const msgs = Object.values(error.response.data.errors).flat().join(', ');
                toast.error(msgs);
            } else {
                toast.error(error?.response?.data?.message || 'Có lỗi xảy ra');
            }
        }
    };

    const handleDelete = async (item: Voucher) => {
        try {
            await axiosInstance.delete(`${voucherPrefix}/${item.id}`);
            toast.success('Đã xóa mã giảm giá');
            fetchVouchers(pagination.current, pagination.pageSize);
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Xóa thất bại');
        }
    };

    const columns: ColumnsType<Voucher> = [
        {
            title: 'Mã Voucher',
            dataIndex: 'code',
            render: (text) => <div style={{ fontWeight: 600, color: '#0d6efd' }}>{text}</div>,
        },
        {
            title: 'Tên Voucher',
            dataIndex: 'name',
        },
        {
            title: 'Giảm giá',
            render: (_, r) => (
                r.discount_type === 'percent' ? `${r.discount_value}%` : formatVND(r.discount_value)
            )
        },
        {
            title: 'Hạn sử dụng',
            render: (_, r) => (
                <div style={{ fontSize: '12px' }}>
                    <div>Từ: {dayjs(r.start_date).format('DD/MM/YYYY')}</div>
                    <div>Đến: {dayjs(r.end_date).format('DD/MM/YYYY')}</div>
                </div>
            )
        },
        {
            title: 'Đã dùng / Tổng',
            render: (_, r) => `${r.usages_count || 0} / ${r.quantity || '∞'}`,
            align: 'center',
            width: 120,
        },
        {
            title: 'Trạng thái',
            dataIndex: 'is_active',
            align: 'center',
            width: 110,
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
                        type="primary" ghost size="small" icon={<EditOutlined />}
                        onClick={() => openEdit(r)}
                    />
                    <Popconfirm
                        title="Xóa mã giảm giá?"
                        description={r.usages_count && r.usages_count > 0 ? "Voucher này đã có người dùng, hãy tắt trạng thái Hoạt động thay vì xóa. Bạn vẫn muốn xóa?" : "Chắc chắn xóa voucher này?"}
                        onConfirm={() => handleDelete(r)}
                        okText="Xóa"
                        cancelText="Hủy"
                        okButtonProps={{ danger: true }}
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
                <Title level={4} style={{ margin: 0, color: '#1a1a2e' }}>
                    <GiftOutlined style={{ marginRight: 10, color: '#0d6efd' }} />
                    Quản lí Mã giảm giá
                </Title>
                <Button
                    type="primary" icon={<PlusOutlined />} onClick={openAdd}
                    style={{
                        background: 'linear-gradient(135deg,#0d6efd,#084298)', border: 'none', borderRadius: 10,
                        height: 40, fontWeight: 600, boxShadow: '0 4px 12px rgba(13,110,253,0.35)'
                    }}
                >
                    Thêm Voucher
                </Button>
            </div>

            <Card style={{ marginBottom: 20 }}>
                <Row gutter={12}>
                    <Col span={8}>
                        <Input
                            placeholder="Tìm mã hoặc tên voucher..."
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
                                { value: true, label: 'Hoạt động' },
                                { value: false, label: 'Tắt' },
                            ]}
                        />
                    </Col>
                    <Col span={4}>
                        <Space>
                            <Button type="primary" onClick={handleFilter}>Lọc</Button>
                            <Button onClick={() => { setSearch(''); setIsActive(undefined); fetchVouchers(1, pagination.pageSize); }}>Reset</Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            <Table
                columns={columns}
                dataSource={vouchers}
                rowKey="id"
                loading={loading}
                pagination={pagination}
                onChange={handleTableChange}
            />

            <Modal
                title={editingItem ? 'Sửa thông tin Voucher' : 'Thêm Voucher mới'}
                open={modalOpen}
                onOk={handleSave}
                onCancel={() => setModalOpen(false)}
                width={700}
                okText={editingItem ? 'Cập nhật' : 'Thêm mới'}
                cancelText="Hủy"
            >
                <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="code" label="Mã Voucher" rules={[{ required: true, message: 'Nhập mã voucher' }, { max: 50, message: 'Tối đa 50 ký tự' }]}>
                                <Input placeholder="Vd: SUMMER2023" style={{ textTransform: 'uppercase' }} />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="name" label="Tên chương trình" rules={[{ required: true, message: 'Nhập tên chương trình' }]}>
                                <Input placeholder="Vd: Giảm giá mùa hè" />
                            </Form.Item>
                        </Col>
                    </Row>
                    
                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="discount_type" label="Loại giảm giá" rules={[{ required: true }]}>
                                <Select>
                                    <Select.Option value="percent">Phần trăm (%)</Select.Option>
                                    <Select.Option value="fixed">Số tiền (VNĐ)</Select.Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="discount_value" label="Giá trị giảm" rules={[{ required: true, message: 'Nhập giá trị' }]}>
                                <InputNumber style={{ width: '100%' }} min={0} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="max_discount" label="Giảm tối đa (VNĐ)">
                                <InputNumber style={{ width: '100%' }} min={0} placeholder="Tùy chọn cho loại %" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={8}>
                            <Form.Item name="min_order_amount" label="Đơn tối thiểu (VNĐ)" rules={[{ required: true, message: 'Cần nhập' }]}>
                                <InputNumber style={{ width: '100%' }} min={0} />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="quantity" label="Số lượng phát hành">
                                <InputNumber style={{ width: '100%' }} min={1} placeholder="Để trống = vô hạn" />
                            </Form.Item>
                        </Col>
                        <Col span={8}>
                            <Form.Item name="usage_limit_per_user" label="Giới hạn / 1 KH">
                                <InputNumber style={{ width: '100%' }} min={1} placeholder="Để trống = vô hạn" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={14}>
                            <Form.Item name="dates" label="Thời gian hiệu lực" rules={[{ required: true, message: 'Chọn ngày bắt đầu và kết thúc' }]}>
                                <RangePicker showTime format="YYYY-MM-DD HH:mm:ss" style={{ width: '100%' }} />
                            </Form.Item>
                        </Col>
                        <Col span={10}>
                            <Form.Item name="is_active" label="Trạng thái" valuePropName="checked">
                                <Switch checkedChildren="Hoạt động" unCheckedChildren="Tắt" />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="description" label="Mô tả / Điều kiện">
                        <Input.TextArea rows={2} />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default AdminVoucherPage;

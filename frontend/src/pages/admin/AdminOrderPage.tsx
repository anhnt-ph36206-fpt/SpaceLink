import React, { useEffect, useState } from 'react';
import {
  Table, Button, Modal, Space, Tag, Typography, message, Card,
  Row, Col, Select, Input, Descriptions, Badge,
} from 'antd';
import {
  SearchOutlined, ShoppingCartOutlined, EyeOutlined, ReloadOutlined,
  CheckCircleOutlined, ClockCircleOutlined, CarOutlined, CloseCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { Order } from '../../types/index';

const { Title, Text } = Typography;

const formatVND = (v: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

const STATUS_CONFIG: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  pending: { color: 'orange', label: 'Chờ xác nhận', icon: <ClockCircleOutlined /> },
  confirmed: { color: 'blue', label: 'Đã xác nhận', icon: <CheckCircleOutlined /> },
  shipping: { color: 'geekblue', label: 'Đang giao hàng', icon: <CarOutlined /> },
  delivered: { color: 'success', label: 'Đã giao hàng', icon: <CheckCircleOutlined /> },
  cancelled: { color: 'error', label: 'Đã hủy', icon: <CloseCircleOutlined /> },
};

const MOCK_ORDERS: Order[] = [
  {
    id: 'ORD-2026-001', userId: '2', customerName: 'Nguyễn Văn An',
    customerEmail: 'user@gmail.com', customerPhone: '0901234567',
    address: '123 Nguyễn Huệ, Q1, TP.HCM',
    items: [
      { productId: '1', productName: 'iPhone 15 Pro Max', quantity: 1, price: 34990000, image: '' },
    ],
    totalAmount: 34990000, status: 'delivered', paymentMethod: 'COD',
    createdAt: '2026-02-25T10:00:00Z', updatedAt: '2026-02-27T15:00:00Z',
  },
  {
    id: 'ORD-2026-002', userId: '17c2', customerName: 'Anh Thanh Niên',
    customerEmail: 'abc@gmail.com', customerPhone: '0912345678',
    address: '45 Lê Lợi, Q3, TP.HCM',
    items: [
      { productId: '2', productName: 'Samsung Galaxy S24 Ultra', quantity: 1, price: 31990000 },
    ],
    totalAmount: 31990000, status: 'shipping', paymentMethod: 'Banking',
    createdAt: '2026-02-26T11:30:00Z',
  },
  {
    id: 'ORD-2026-003', userId: '3ddb', customerName: 'Nguyễn Duy Mạnh',
    customerEmail: '123@gmail.com', customerPhone: '0987654321',
    address: '78 Trần Hưng Đạo, Q5, TP.HCM',
    items: [
      { productId: '1', productName: 'iPhone 15 Pro Max', quantity: 1, price: 32990000 },
    ],
    totalAmount: 32990000, status: 'pending', paymentMethod: 'COD',
    createdAt: '2026-02-28T08:00:00Z',
  },
  {
    id: 'ORD-2026-004', userId: 'VtKwh8e', customerName: 'Doãn Chí Bình',
    customerEmail: 'duybinh123@gmail.com', customerPhone: '0934567890',
    address: '12 Võ Thị Sáu, Q3, TP.HCM',
    items: [
      { productId: '2', productName: 'Samsung Galaxy S24 Ultra', quantity: 1, price: 29990000 },
    ],
    totalAmount: 29990000, status: 'confirmed', paymentMethod: 'Banking',
    createdAt: '2026-02-27T14:00:00Z',
  },
  {
    id: 'ORD-2026-005', userId: 'af3d', customerName: 'Nguyễn Duy Hùng',
    customerEmail: 'nguyenduyhung123@gmail.com', customerPhone: '0956789012',
    address: '34 Đinh Tiên Hoàng, Q1, TP.HCM',
    items: [
      { productId: '1', productName: 'iPhone 15 Pro Max', quantity: 1, price: 34990000 },
    ],
    totalAmount: 34990000, status: 'cancelled', paymentMethod: 'COD',
    createdAt: '2026-02-24T16:00:00Z',
  },
];

const AdminOrderPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>(MOCK_ORDERS);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:3000/orders');
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) setOrders(data);
      else setOrders(MOCK_ORDERS);
    } catch {
      setOrders(MOCK_ORDERS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleStatusChange = async (orderId: string, newStatus: string) => {
    setOrders(prev =>
      prev.map(o => o.id === orderId ? { ...o, status: newStatus as Order['status'] } : o)
    );
    message.success(`Đã cập nhật trạng thái đơn hàng!`);
    try {
      await fetch(`http://localhost:3000/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus, updatedAt: new Date().toISOString() }),
      });
    } catch { /* silent */ }
  };

  const filtered = orders.filter(o => {
    const matchSearch =
      o.id.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      o.customerEmail.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter ? o.status === statusFilter : true;
    return matchSearch && matchStatus;
  });

  const totalRevenue = orders
    .filter(o => o.status === 'delivered')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  const columns: ColumnsType<Order> = [
    {
      title: 'Mã đơn hàng', dataIndex: 'id', key: 'id', width: 160,
      render: (v: string) => <Text code style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: 'Khách hàng', key: 'customer',
      render: (_: unknown, r: Order) => (
        <div>
          <div style={{ fontWeight: 600, fontSize: 14 }}>{r.customerName}</div>
          <Text type="secondary" style={{ fontSize: 12 }}>{r.customerEmail}</Text>
        </div>
      ),
    },
    {
      title: 'Thanh toán', dataIndex: 'paymentMethod', key: 'paymentMethod', width: 110,
      render: (v: string) => (
        <Tag color={v === 'Banking' ? 'blue' : 'orange'} style={{ borderRadius: 20 }}>{v}</Tag>
      ),
    },
    {
      title: 'Tổng tiền', dataIndex: 'totalAmount', key: 'totalAmount', width: 150, align: 'right',
      render: (v: number) => <Text strong style={{ color: '#0d6efd', fontSize: 14 }}>{formatVND(v)}</Text>,
      sorter: (a: Order, b: Order) => a.totalAmount - b.totalAmount,
    },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 180,
      render: (v: string, r: Order) => (
        <Select
          value={v}
          size="small"
          style={{ width: 165 }}
          onChange={(newVal) => handleStatusChange(r.id, newVal)}
          options={Object.entries(STATUS_CONFIG).map(([k, cfg]) => ({
            value: k,
            label: (
              <Space size={4}>
                <Tag color={cfg.color} style={{ margin: 0, borderRadius: 20, fontSize: 12 }}>
                  {cfg.label}
                </Tag>
              </Space>
            ),
          }))}
        />
      ),
    },
    {
      title: 'Ngày đặt', dataIndex: 'createdAt', key: 'createdAt', width: 115,
      render: (v: string) => (
        <Text type="secondary" style={{ fontSize: 13 }}>
          {new Date(v).toLocaleDateString('vi-VN')}
        </Text>
      ),
      sorter: (a: Order, b: Order) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
    },
    {
      title: '', key: 'action', width: 60, align: 'center',
      render: (_: unknown, r: Order) => (
        <Button
          type="text" icon={<EyeOutlined style={{ color: '#0d6efd' }} />}
          onClick={() => { setDetailOrder(r); setDetailOpen(true); }}
        />
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: '#1a1a2e' }}>
            <ShoppingCartOutlined style={{ marginRight: 10, color: '#0d6efd' }} />
            Quản lí Đơn hàng
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Hiển thị {filtered.length} / {orders.length} đơn hàng
          </Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={fetchOrders} style={{ borderRadius: 10, height: 40 }}>
          Làm mới
        </Button>
      </div>

      {/* Summary Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => {
          const count = orders.filter(o => o.status === key).length;
          return (
            <Col key={key} xs={12} sm={8} lg={4}>
              <Card
                style={{
                  borderRadius: 12, border: '1px solid #f0f0f0', textAlign: 'center',
                  cursor: 'pointer', transition: 'all 0.2s',
                  boxShadow: statusFilter === key ? '0 4px 16px rgba(13,110,253,0.2)' : '0 2px 8px rgba(0,0,0,0.05)',
                  borderColor: statusFilter === key ? '#0d6efd' : undefined,
                }}
                bodyStyle={{ padding: '14px 12px' }}
                onClick={() => setStatusFilter(statusFilter === key ? '' : key)}
              >
                <Badge color={cfg.color} text="" />
                <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a2e' }}>{count}</div>
                <div style={{ fontSize: 12, color: '#868e96', marginTop: 2 }}>{cfg.label}</div>
              </Card>
            </Col>
          );
        })}
        <Col xs={12} sm={8} lg={4}>
          <Card
            style={{ borderRadius: 12, border: '1px solid #f0f0f0', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
            bodyStyle={{ padding: '14px 12px' }}
          >
            <div style={{ fontSize: 16, fontWeight: 700, color: '#0d6efd' }}>
              {(totalRevenue / 1000000).toFixed(1)}M
            </div>
            <div style={{ fontSize: 12, color: '#868e96', marginTop: 2 }}>Doanh thu</div>
          </Card>
        </Col>
      </Row>

      {/* Search & Filter */}
      <Card style={{ borderRadius: 14, border: '1px solid #f0f0f0', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }} bodyStyle={{ padding: '14px 20px' }}>
        <Row gutter={12} align="middle">
          <Col flex="auto">
            <Input
              placeholder="Tìm mã đơn, tên khách hàng, email..."
              prefix={<SearchOutlined style={{ color: '#adb5bd' }} />}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ borderRadius: 10, height: 38 }}
              allowClear
            />
          </Col>
          <Col>
            <Select
              placeholder="Lọc trạng thái"
              style={{ width: 170, borderRadius: 10 }}
              allowClear
              value={statusFilter || undefined}
              onChange={v => setStatusFilter(v || '')}
              options={Object.entries(STATUS_CONFIG).map(([k, cfg]) => ({
                value: k,
                label: <Tag color={cfg.color} style={{ margin: 0, borderRadius: 20 }}>{cfg.label}</Tag>,
              }))}
            />
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card style={{ borderRadius: 14, border: '1px solid #f0f0f0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }} bodyStyle={{ padding: 0 }}>
        <Table
          columns={columns}
          dataSource={filtered}
          rowKey="id"
          loading={loading}
          scroll={{ x: 900 }}
          pagination={{ pageSize: 8, showSizeChanger: false, showTotal: t => `Tổng ${t} đơn hàng` }}
        />
      </Card>

      {/* Detail Modal */}
      <Modal
        title={
          <Space>
            <ShoppingCartOutlined style={{ color: '#0d6efd' }} />
            <span>Chi tiết đơn hàng – <Text code>{detailOrder?.id}</Text></span>
          </Space>
        }
        open={detailOpen}
        onCancel={() => setDetailOpen(false)}
        footer={null}
        width={640}
        style={{ top: 40 }}
      >
        {detailOrder && (
          <div>
            <Descriptions column={2} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="Khách hàng" span={2}>
                <Text strong>{detailOrder.customerName}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Email">{detailOrder.customerEmail}</Descriptions.Item>
              <Descriptions.Item label="SĐT">{detailOrder.customerPhone || '—'}</Descriptions.Item>
              <Descriptions.Item label="Địa chỉ" span={2}>{detailOrder.address || '—'}</Descriptions.Item>
              <Descriptions.Item label="Thanh toán">{detailOrder.paymentMethod}</Descriptions.Item>
              <Descriptions.Item label="Ngày đặt">
                {new Date(detailOrder.createdAt).toLocaleString('vi-VN')}
              </Descriptions.Item>
            </Descriptions>

            <Card style={{ borderRadius: 10, marginBottom: 16, background: '#f8f9fa' }} bodyStyle={{ padding: 16 }}>
              <Text strong style={{ marginBottom: 10, display: 'block' }}>Sản phẩm đặt mua:</Text>
              {detailOrder.items.map((item, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: i < detailOrder.items.length - 1 ? '1px solid #e9ecef' : 'none' }}>
                  <Text>{item.productName} × {item.quantity}</Text>
                  <Text strong style={{ color: '#0d6efd' }}>{formatVND(item.price * item.quantity)}</Text>
                </div>
              ))}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12, paddingTop: 12, borderTop: '2px solid #dee2e6' }}>
                <Text strong style={{ fontSize: 15 }}>Tổng cộng</Text>
                <Text strong style={{ fontSize: 15, color: '#0d6efd' }}>{formatVND(detailOrder.totalAmount)}</Text>
              </div>
            </Card>

            <div>
              <Text strong style={{ marginBottom: 10, display: 'block' }}>Trạng thái:</Text>
              <Tag
                color={STATUS_CONFIG[detailOrder.status]?.color}
                style={{ borderRadius: 20, padding: '4px 14px', fontSize: 13 }}
                icon={STATUS_CONFIG[detailOrder.status]?.icon}
              >
                &nbsp;{STATUS_CONFIG[detailOrder.status]?.label}
              </Tag>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminOrderPage;

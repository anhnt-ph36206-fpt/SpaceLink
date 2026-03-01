import React, { useEffect, useState } from 'react';
import {
  Table, Button, Drawer, Form, Input, Switch, Space, Tag,
  Typography, Popconfirm, message, Card, Row, Col, Tooltip,
  Select, InputNumber, Badge,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  SearchOutlined, ShoppingOutlined, ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface Category {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  slug?: string;
  sku?: string;
  category_id?: number;
  category?: string;
  description?: string;
  price: number;
  sale_price?: number;
  quantity: number;
  sold_count?: number;
  rating?: number;
  is_featured?: boolean;
  is_active?: boolean;
}

const API_PRODUCTS = 'http://localhost:3000/products';
const API_CATEGORIES = 'http://localhost:3000/categories';

const formatVND = (v: number) =>
  new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

const AdminProductPage: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Product | null>(null);
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState<string>('');
  const [form] = Form.useForm();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pRes, cRes] = await Promise.all([
        fetch(API_PRODUCTS),
        fetch(API_CATEGORIES),
      ]);
      setProducts(await pRes.json());
      setCategories(await cRes.json());
    } catch { message.error('Không thể tải dữ liệu'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const openAdd = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({ is_active: true, is_featured: false, quantity: 0 });
    setDrawerOpen(true);
  };

  const openEdit = (item: Product) => {
    setEditingItem(item);
    form.setFieldsValue(item);
    setDrawerOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const body = {
        ...values,
        slug: values.slug || values.name.toLowerCase().replace(/\s+/g, '-'),
      };

      if (editingItem) {
        await fetch(`${API_PRODUCTS}/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...editingItem, ...body }),
        });
        message.success('Cập nhật sản phẩm thành công!');
      } else {
        await fetch(API_PRODUCTS, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...body, id: Date.now().toString() }),
        });
        message.success('Thêm sản phẩm thành công!');
      }

      setDrawerOpen(false);
      fetchData();
    } catch {
      // validation error
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API_PRODUCTS}/${id}`, { method: 'DELETE' });
      message.success('Đã xóa sản phẩm');
      fetchData();
    } catch { message.error('Xóa thất bại'); }
  };

  const filtered = products.filter(p => {
    const matchSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.sku || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat ? (p.category === filterCat || String(p.category_id) === filterCat) : true;
    return matchSearch && matchCat;
  });

  const columns: ColumnsType<Product> = [
    {
      title: '#', key: 'index', width: 50,
      render: (_: unknown, __: Product, i: number) => <Text type="secondary">{i + 1}</Text>,
    },
    {
      title: 'Sản phẩm', key: 'name',
      render: (_: unknown, r: Product) => (
        <Space>
          <div
            style={{
              width: 48, height: 48, borderRadius: 10,
              background: 'linear-gradient(135deg,#e8f0fe,#c7d8fb)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
            }}
          >
            <ShoppingOutlined style={{ color: '#0d6efd', fontSize: 20 }} />
          </div>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>SKU: {r.sku || '—'}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Danh mục', dataIndex: 'category', key: 'category', width: 130,
      render: (v: string) => <Tag color="blue" style={{ borderRadius: 20 }}>{v || '—'}</Tag>,
    },
    {
      title: 'Giá gốc', dataIndex: 'price', key: 'price', width: 140, align: 'right',
      render: (v: number) => <Text style={{ fontSize: 13 }}>{formatVND(v)}</Text>,
      sorter: (a: Product, b: Product) => a.price - b.price,
    },
    {
      title: 'Giá KM', dataIndex: 'sale_price', key: 'sale_price', width: 140, align: 'right',
      render: (v: number) =>
        v ? <Text strong style={{ color: '#dc3545', fontSize: 13 }}>{formatVND(v)}</Text> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Tồn kho', dataIndex: 'quantity', key: 'quantity', width: 100, align: 'center',
      render: (v: number) => (
        <Badge
          count={v}
          showZero
          style={{
            background: v === 0 ? '#dc3545' : v < 10 ? '#fd7e14' : '#198754',
            fontSize: 12, fontWeight: 600,
          }}
        />
      ),
      sorter: (a: Product, b: Product) => a.quantity - b.quantity,
    },
    {
      title: 'Nổi bật', dataIndex: 'is_featured', key: 'is_featured', width: 85, align: 'center',
      render: (v: boolean) => (
        <Tag color={v ? 'gold' : 'default'} style={{ borderRadius: 20 }}>
          {v ? '⭐ Có' : 'Không'}
        </Tag>
      ),
    },
    {
      title: 'Trạng thái', dataIndex: 'is_active', key: 'is_active', width: 110, align: 'center',
      render: (v: boolean) => (
        <Tag color={v !== false ? 'success' : 'default'} style={{ borderRadius: 20, padding: '2px 10px' }}>
          {v !== false ? 'Hoạt động' : 'Tắt'}
        </Tag>
      ),
    },
    {
      title: 'Hành động', key: 'action', width: 110, align: 'center',
      render: (_: unknown, r: Product) => (
        <Space>
          <Tooltip title="Sửa">
            <Button type="primary" ghost size="small" icon={<EditOutlined />} style={{ borderRadius: 8 }} onClick={() => openEdit(r)} />
          </Tooltip>
          <Tooltip title="Xóa">
            <Popconfirm
              title="Xóa sản phẩm này?"
              description="Hành động này không thể hoàn tác"
              onConfirm={() => handleDelete(r.id)}
              okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
            >
              <Button danger size="small" icon={<DeleteOutlined />} style={{ borderRadius: 8 }} />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  const catOptions = categories.map(c => ({ value: c.name, label: c.name }));

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: '#1a1a2e' }}>
            <ShoppingOutlined style={{ marginRight: 10, color: '#0d6efd' }} />
            Quản lí Sản phẩm
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Hiển thị {filtered.length} / {products.length} sản phẩm
          </Text>
        </div>
        <Button
          type="primary" icon={<PlusOutlined />} onClick={openAdd}
          style={{
            background: 'linear-gradient(135deg,#0d6efd,#084298)',
            border: 'none', borderRadius: 10, height: 40, fontWeight: 600,
            boxShadow: '0 4px 12px rgba(13,110,253,0.35)',
          }}
        >
          Thêm sản phẩm
        </Button>
      </div>

      {/* Filters */}
      <Card style={{ borderRadius: 14, border: '1px solid #f0f0f0', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }} bodyStyle={{ padding: '14px 20px' }}>
        <Row gutter={12} align="middle">
          <Col flex="auto">
            <Input
              placeholder="Tìm theo tên hoặc SKU..."
              prefix={<SearchOutlined style={{ color: '#adb5bd' }} />}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ borderRadius: 10, height: 38 }}
              allowClear
            />
          </Col>
          <Col>
            <Select
              placeholder="Lọc danh mục"
              style={{ width: 180, borderRadius: 10 }}
              allowClear
              options={catOptions}
              onChange={v => setFilterCat(v || '')}
            />
          </Col>
          <Col>
            <Button icon={<ReloadOutlined />} onClick={fetchData} style={{ borderRadius: 10, height: 38 }}>
              Làm mới
            </Button>
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
          scroll={{ x: 1000 }}
          pagination={{ pageSize: 8, showSizeChanger: false, showTotal: t => `Tổng ${t} sản phẩm` }}
        />
      </Card>

      {/* Drawer Add/Edit */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#0d6efd,#084298)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShoppingOutlined style={{ color: '#fff', fontSize: 15 }} />
            </div>
            <span>{editingItem ? 'Sửa sản phẩm' : 'Thêm sản phẩm mới'}</span>
          </div>
        }
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={560}
        footer={
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <Button onClick={() => setDrawerOpen(false)} style={{ borderRadius: 8 }}>Hủy</Button>
            <Button
              type="primary" onClick={handleSave}
              style={{ background: 'linear-gradient(135deg,#0d6efd,#084298)', border: 'none', borderRadius: 8 }}
            >
              {editingItem ? 'Cập nhật' : 'Thêm mới'}
            </Button>
          </div>
        }
      >
        <Form form={form} layout="vertical">
          <Form.Item name="name" label="Tên sản phẩm" rules={[{ required: true, message: 'Nhập tên sản phẩm' }]}>
            <Input placeholder="VD: iPhone 15 Pro Max" style={{ borderRadius: 8 }} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="sku" label="SKU">
                <Input placeholder="VD: IP15PM" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="category" label="Danh mục">
                <Select placeholder="Chọn danh mục" options={catOptions} style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="price" label="Giá gốc (VNĐ)" rules={[{ required: true, message: 'Nhập giá' }]}>
                <InputNumber
                  style={{ width: '100%', borderRadius: 8 }} min={0}
                  formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  placeholder="34990000"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="sale_price" label="Giá khuyến mãi">
                <InputNumber
                  style={{ width: '100%', borderRadius: 8 }} min={0}
                  formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                  placeholder="32990000"
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="quantity" label="Số lượng tồn">
                <InputNumber style={{ width: '100%', borderRadius: 8 }} min={0} placeholder="50" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="rating" label="Đánh giá (1–5)">
                <InputNumber style={{ width: '100%', borderRadius: 8 }} min={1} max={5} placeholder="5" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="description" label="Mô tả ngắn">
            <TextArea rows={3} placeholder="Mô tả ngắn về sản phẩm..." style={{ borderRadius: 8 }} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="is_featured" label="Sản phẩm nổi bật" valuePropName="checked">
                <Switch checkedChildren="Có" unCheckedChildren="Không" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="is_active" label="Trạng thái" valuePropName="checked">
                <Switch checkedChildren="Hoạt động" unCheckedChildren="Tắt" />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Drawer>
    </div>
  );
};

export default AdminProductPage;

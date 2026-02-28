import React, { useEffect, useState } from 'react';
import {
  Table, Button, Modal, Form, Input, Switch, Space, Tag,
  Typography, Popconfirm, message, Card, Row, Col, Tooltip, Select, Avatar,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  SearchOutlined, AppstoreOutlined, ReloadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';

const { Title, Text } = Typography;

interface Category {
  id: string;
  parent_id: string | null;
  name: string;
  slug: string;
  image?: string;
  icon?: string;
  description?: string;
  display_order?: number;
  is_active: boolean;
  created_at?: string;
}

const API = 'http://localhost:3000/categories';

const AdminCategoryPage: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Category | null>(null);
  const [search, setSearch] = useState('');
  const [form] = Form.useForm();

  const fetchCategories = async () => {
    setLoading(true);
    try {
      const res = await fetch(API);
      setCategories(await res.json());
    } catch { message.error('Không thể tải danh mục'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchCategories(); }, []);

  const openAdd = () => {
    setEditingItem(null);
    form.resetFields();
    form.setFieldsValue({ is_active: true, parent_id: null, display_order: 1 });
    setModalOpen(true);
  };

  const openEdit = (item: Category) => {
    setEditingItem(item);
    form.setFieldsValue(item);
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      const body = {
        ...values,
        slug: values.slug || values.name.toLowerCase().replace(/\s+/g, '-'),
        updated_at: new Date().toISOString(),
      };

      if (editingItem) {
        await fetch(`${API}/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...editingItem, ...body }),
        });
        message.success('Cập nhật danh mục thành công!');
      } else {
        await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...body,
            id: Date.now().toString(),
            created_at: new Date().toISOString(),
          }),
        });
        message.success('Thêm danh mục thành công!');
      }

      setModalOpen(false);
      fetchCategories();
    } catch (e) {
      // validation error
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await fetch(`${API}/${id}`, { method: 'DELETE' });
      message.success('Đã xóa danh mục');
      fetchCategories();
    } catch { message.error('Xóa thất bại'); }
  };

  const filtered = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.slug?.toLowerCase().includes(search.toLowerCase())
  );

  const parentOptions = categories
    .filter(c => !c.parent_id)
    .map(c => ({ value: c.id, label: c.name }));

  const columns: ColumnsType<Category> = [
    {
      title: '#', key: 'index', width: 55,
      render: (_: unknown, __: Category, i: number) => (
        <Text type="secondary" style={{ fontSize: 13 }}>{i + 1}</Text>
      ),
    },
    {
      title: 'Danh mục', key: 'name',
      render: (_: unknown, r: Category) => (
        <Space>
          <Avatar
            src={r.image}
            size={36}
            style={{ borderRadius: 8, background: '#e8f0fe', flexShrink: 0 }}
          />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{r.name}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>/{r.slug}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Danh mục cha', dataIndex: 'parent_id', key: 'parent_id', width: 140,
      render: (v: string | null) => {
        if (!v) return <Tag color="blue" style={{ borderRadius: 20 }}>Gốc</Tag>;
        const parent = categories.find(c => c.id === String(v));
        return <Text style={{ fontSize: 13 }}>{parent?.name || v}</Text>;
      },
    },
    {
      title: 'Mô tả', dataIndex: 'description', key: 'description',
      render: (v: string) => <Text type="secondary" style={{ fontSize: 13 }}>{v || '—'}</Text>,
    },
    {
      title: 'Thứ tự', dataIndex: 'display_order', key: 'display_order', width: 90, align: 'center',
      render: (v: number) => (
        <div
          style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg,#0d6efd,#084298)',
            color: '#fff', fontWeight: 700, display: 'flex', alignItems: 'center',
            justifyContent: 'center', margin: 'auto',
          }}
        >
          {v}
        </div>
      ),
    },
    {
      title: 'Trạng thái', dataIndex: 'is_active', key: 'is_active', width: 120, align: 'center',
      render: (v: boolean) => (
        <Tag
          color={v ? 'success' : 'default'}
          style={{ borderRadius: 20, padding: '2px 12px', fontWeight: 600 }}
        >
          {v ? 'Hoạt động' : 'Tắt'}
        </Tag>
      ),
    },
    {
      title: 'Hành động', key: 'action', width: 120, align: 'center',
      render: (_: unknown, r: Category) => (
        <Space>
          <Tooltip title="Sửa">
            <Button
              type="primary" ghost size="small" icon={<EditOutlined />}
              style={{ borderRadius: 8 }}
              onClick={() => openEdit(r)}
            />
          </Tooltip>
          <Tooltip title="Xóa">
            <Popconfirm
              title="Xóa danh mục này?"
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

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: '#1a1a2e' }}>
            <AppstoreOutlined style={{ marginRight: 10, color: '#0d6efd' }} />
            Quản lí Danh mục
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Hiển thị {filtered.length} / {categories.length} danh mục
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
          Thêm danh mục
        </Button>
      </div>

      {/* Search Bar */}
      <Card
        style={{ borderRadius: 14, border: '1px solid #f0f0f0', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
        bodyStyle={{ padding: '14px 20px' }}
      >
        <Row gutter={12} align="middle">
          <Col flex="auto">
            <Input
              placeholder="Tìm kiếm theo tên hoặc slug..."
              prefix={<SearchOutlined style={{ color: '#adb5bd' }} />}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ borderRadius: 10, height: 38 }}
              allowClear
            />
          </Col>
          <Col>
            <Button icon={<ReloadOutlined />} onClick={fetchCategories} style={{ borderRadius: 10, height: 38 }}>
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
          pagination={{ pageSize: 8, showSizeChanger: false, showTotal: (total) => `Tổng ${total} danh mục` }}
          rowClassName={(_, i) => i % 2 === 0 ? '' : 'table-row-alt'}
        />
      </Card>

      {/* Modal Add/Edit */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#0d6efd,#084298)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
        okButtonProps={{ style: { background: 'linear-gradient(135deg,#0d6efd,#084298)', border: 'none', borderRadius: 8 } }}
        cancelButtonProps={{ style: { borderRadius: 8 } }}
        width={560}
        style={{ top: 40 }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="name" label="Tên danh mục" rules={[{ required: true, message: 'Nhập tên danh mục' }]}>
                <Input placeholder="VD: SmartPhone" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="slug" label="Slug (URL)">
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
              <Form.Item name="display_order" label="Thứ tự hiển thị">
                <Input type="number" min={1} placeholder="1" style={{ borderRadius: 8 }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="image" label="URL hình ảnh">
            <Input placeholder="https://..." style={{ borderRadius: 8 }} />
          </Form.Item>

          <Form.Item name="description" label="Mô tả">
            <Input.TextArea rows={3} placeholder="Mô tả ngắn về danh mục..." style={{ borderRadius: 8 }} />
          </Form.Item>

          <Form.Item name="is_active" label="Trạng thái" valuePropName="checked">
            <Switch checkedChildren="Hoạt động" unCheckedChildren="Tắt" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminCategoryPage;

import React, { useEffect, useState } from 'react';
import {
  Table, Button, Modal, Form, Input, Space, Tag,
  Typography, Popconfirm, message, Card, Row, Col, Tooltip,
  Select, Avatar,
} from 'antd';
import {
  PlusOutlined, EditOutlined, DeleteOutlined,
  SearchOutlined, TeamOutlined, ReloadOutlined,
  UserOutlined, CrownOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { User } from '../../types/user';
import { axiosInstance } from '../../api/axios';
import { userPrefix } from '../../api/apiAdminPrefix';

const { Title, Text } = Typography;

const API_PREFIX = userPrefix;

const ROLE_CONFIG: Record<string, { color: string; label: string; icon: React.ReactNode }> = {
  admin: { color: 'gold', label: 'Admin', icon: <CrownOutlined /> },
  staff: { color: 'purple', label: 'Nhân viên', icon: <UserOutlined /> },
  customer: { color: 'blue', label: 'Khách hàng', icon: <UserOutlined /> },
};

const ROLE_NAME_TO_ID: Record<string, number> = {
  admin: 1,
  staff: 2,
  customer: 3,
};




const AdminUserPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [form] = Form.useForm();

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get(API_PREFIX, {
        params: {
          per_page: 100,
        },
      });
      const data = (res.data && res.data.data) ? res.data.data : res.data;
      setUsers(data as User[]);
    } catch (error) {
      console.error('Error fetching users:', error);
      message.error('Không thể tải danh sách người dùng');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const openAdd = () => {
    setEditingUser(null);
    form.resetFields();
    form.setFieldsValue({ role: 'customer', status: 'active' });
    setModalOpen(true);
  };

  const openEdit = (u: User) => {
    setEditingUser(u);
    form.setFieldsValue({
      fullname: u.fullname,
      email: u.email,
      role: u.role || 'customer',
      status: u.status || 'active',
      avatar: u.avatar || '',
      password: '',
    });
    setModalOpen(true);
  };

  const handleSave = async () => {
    try {
      const values = await form.validateFields();

      if (editingUser) {
        const payload: Record<string, unknown> = {};

        if (values.fullname) {
          payload.fullname = values.fullname;
        }
        if (values.status) {
          payload.status = values.status;
        }
        if (values.role) {
          const roleId = ROLE_NAME_TO_ID[values.role];
          if (roleId) {
            payload.role_id = roleId;
          }
        }

        await axiosInstance.put(`${API_PREFIX}/${editingUser.id}`, payload);
        message.success('Cập nhật người dùng thành công!');
      } else {
        // Đăng ký user mới qua backend
        const registerRes = await axiosInstance.post('/auth/register', {
          name: values.fullname,
          email: values.email,
          password: values.password,
          password_confirmation: values.password,
        });

        const newUser: User | undefined = registerRes.data?.data?.user;

        // Nếu admin chọn role/status khác mặc định thì cập nhật lại qua admin users
        if (newUser?.id) {
          const updatePayload: Record<string, unknown> = {};

          if (values.role) {
            const roleId = ROLE_NAME_TO_ID[values.role];
            if (roleId) {
              updatePayload.role_id = roleId;
            }
          }

          if (values.status) {
            updatePayload.status = values.status;
          }

          if (Object.keys(updatePayload).length > 0) {
            await axiosInstance.put(`${API_PREFIX}/${newUser.id}`, updatePayload);
          }
        }

        message.success('Thêm người dùng thành công!');
      }

      setModalOpen(false);
      fetchUsers();
    } catch (error: any) {
      console.error('Error saving user:', error);
      const msg = error?.response?.data?.message ?? 'Có lỗi xảy ra khi lưu người dùng';
      message.error(msg);
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await axiosInstance.delete(`${API_PREFIX}/${id}`);
      message.success('Đã xóa người dùng');
      fetchUsers();
    } catch (error: any) {
      console.error('Error deleting user:', error);
      const msg = error?.response?.data?.message ?? 'Xóa thất bại';
      message.error(msg);
    }
  };

  const handleQuickRole = async (userId: string | number, newRole: string) => {
    try {
      const roleId = ROLE_NAME_TO_ID[newRole];
      if (!roleId) {
        message.error('Quyền không hợp lệ');
        return;
      }

      const res = await axiosInstance.put(`${API_PREFIX}/${userId}`, {
        role_id: roleId,
      });

      if (res.data && res.data.status === false) {
        message.error(res.data.message || 'Cập nhật quyền thất bại');
        return;
      }

      setUsers(prev =>
        prev.map(u => (u.id === userId ? { ...u, role: newRole } : u))
      );
      message.success('Đã cập nhật quyền!');
    } catch (error: any) {
      console.error('Error updating role:', error);
      const msg = error?.response?.data?.message ?? 'Có lỗi xảy ra khi cập nhật quyền';
      message.error(msg);
    }
  };
 

    const handleQuickStatus = async (userId: string | number, newStatus: string) => {
      try {
        const res = await axiosInstance.put(`${API_PREFIX}/${userId}`, {
          status: newStatus,
        });

        if (res.data && res.data.status === false) {
          message.error(res.data.message || 'Cập nhật trạng thái thất bại');
          return;
        }

        setUsers(prev =>
          prev.map(u => (u.id === userId ? { ...u, status: newStatus } : u))
        );
        message.success('Đã cập nhật trạng thái!');
      } catch (error: any) {
        console.error('Error updating status:', error);
        const msg = error?.response?.data?.message ?? 'Có lỗi xảy ra khi cập nhật trạng thái';
        message.error(msg);
      }
    };

 

  const filtered = users.filter(u => {
    const matchSearch =
      (u.fullname || '').toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole = roleFilter ? u.role === roleFilter : true;
    return matchSearch && matchRole;
  });

  const columns: ColumnsType<User> = [
    {
      title: '#', key: 'index', width: 50,
      render: (_: unknown, __: User, i: number) => <Text type="secondary">{i + 1}</Text>,
    },
    {
      title: 'Người dùng', key: 'user',
      render: (_: unknown, r: User) => (
        <Space>
          <Avatar
            src={r.avatar || undefined}
            icon={!r.avatar ? <UserOutlined /> : undefined}
            size={40}
            style={{
              border: '2px solid',
              borderColor: r.role === 'admin' ? '#ffc107' : '#0d6efd',
              background: r.avatar ? undefined : '#e8f0fe',
              color: '#0d6efd',
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{r.fullname || '—'}</div>
            <Text type="secondary" style={{ fontSize: 12 }}>{r.email}</Text>
          </div>
        </Space>
      ),
    },
    {
      title: 'Phân quyền', dataIndex: 'role', key: 'role', width: 170,
      render: (v: string, r: User) => (
        <Select
          value={v || 'customer'}
          size="small"
          style={{ width: 155 }}
          onChange={(newRole) => handleQuickRole(r.id, newRole)}
          options={Object.entries(ROLE_CONFIG).map(([k, cfg]) => ({
            value: k,
            label: (
              <Tag
                color={cfg.color}
                icon={cfg.icon}
                style={{ margin: 0, borderRadius: 20, fontSize: 12 }}
              >
                &nbsp;{cfg.label}
              </Tag>
            ),
          }))}
        />
      ),
    },
    {
      title: 'Trạng thái', dataIndex: 'status', key: 'status', width: 150,
      render: (v: string, r: User) => (
        <Select
          value={v || 'active'}
          size="small"
          style={{ width: 135 }}
          onChange={(ns) => handleQuickStatus(r.id, ns)}
          options={[
            { value: 'active', label: <Tag color="success" style={{ margin: 0, borderRadius: 20 }}>Hoạt động</Tag> },
            { value: 'inactive', label: <Tag color="default" style={{ margin: 0, borderRadius: 20 }}>Tạm khóa</Tag> },
            { value: 'banned', label: <Tag color="error" style={{ margin: 0, borderRadius: 20 }}>Cấm</Tag> },
          ]}
        />
      ),
    },
    {
      title: 'Hành động', key: 'action', width: 110, align: 'center',
      render: (_: unknown, r: User) => (
        <Space>
          <Tooltip title="Sửa">
            <Button
              type="primary" ghost size="small" icon={<EditOutlined />}
              style={{ borderRadius: 8 }}
              onClick={() => openEdit(r)}
            />
          </Tooltip>
          {/* <Tooltip title="Xóa">
            <Popconfirm
              title="Xóa người dùng này?"
              description="Hành động này không thể hoàn tác"
              onConfirm={() => handleDelete(r.id)}
              okText="Xóa" cancelText="Hủy" okButtonProps={{ danger: true }}
            >
              <Button danger size="small" icon={<DeleteOutlined />} style={{ borderRadius: 8 }} />
            </Popconfirm>
          </Tooltip> */}
        </Space>
      ),
    },
  ];

  const adminCount = users.filter(u => u.role === 'admin').length;
  const customerCount = users.filter(u => u.role === 'customer').length;
  const activeCount = users.filter(u => !u.status || u.status === 'active').length;

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <Title level={4} style={{ margin: 0, color: '#1a1a2e' }}>
            <TeamOutlined style={{ marginRight: 10, color: '#0d6efd' }} />
            Quản lí Người dùng
          </Title>
          <Text type="secondary" style={{ fontSize: 13 }}>
            Hiển thị {filtered.length} / {users.length} người dùng
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
          Thêm người dùng
        </Button>
      </div>

      {/* Summary Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        {[
          { label: 'Tổng người dùng', value: users.length, color: '#0d6efd' },
          { label: 'Admin', value: adminCount, color: '#ffc107' },
          { label: 'Khách hàng', value: customerCount, color: '#198754' },
          { label: 'Đang hoạt động', value: activeCount, color: '#0dcaf0' },
        ].map((item) => (
          <Col xs={12} sm={6} key={item.label}>
            <Card
              style={{ borderRadius: 12, border: '1px solid #f0f0f0', textAlign: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}
              bodyStyle={{ padding: '16px 12px' }}
            >
              <div style={{ fontSize: 28, fontWeight: 700, color: item.color }}>{item.value}</div>
              <div style={{ fontSize: 12, color: '#868e96', marginTop: 2 }}>{item.label}</div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* Filters */}
      <Card style={{ borderRadius: 14, border: '1px solid #f0f0f0', marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }} bodyStyle={{ padding: '14px 20px' }}>
        <Row gutter={12} align="middle">
          <Col flex="auto">
            <Input
              placeholder="Tìm tên, email người dùng..."
              prefix={<SearchOutlined style={{ color: '#adb5bd' }} />}
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ borderRadius: 10, height: 38 }}
              allowClear
            />
          </Col>
          <Col>
            <Select
              placeholder="Lọc theo quyền"
              style={{ width: 160, borderRadius: 10 }}
              allowClear
              value={roleFilter || undefined}
              onChange={v => setRoleFilter(v || '')}
              options={Object.entries(ROLE_CONFIG).map(([k, cfg]) => ({
                value: k,
                label: <Tag color={cfg.color} style={{ margin: 0, borderRadius: 20 }}>{cfg.label}</Tag>,
              }))}
            />
          </Col>
          <Col>
            <Button icon={<ReloadOutlined />} onClick={fetchUsers} style={{ borderRadius: 10, height: 38 }}>
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
          pagination={{ pageSize: 8, showSizeChanger: false, showTotal: t => `Tổng ${t} người dùng` }}
        />
      </Card>

      {/* Modal Add/Edit */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg,#0d6efd,#084298)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <UserOutlined style={{ color: '#fff', fontSize: 15 }} />
            </div>
            <span>{editingUser ? 'Sửa người dùng' : 'Thêm người dùng mới'}</span>
          </div>
        }
        open={modalOpen}
        onOk={handleSave}
        onCancel={() => setModalOpen(false)}
        okText={editingUser ? 'Cập nhật' : 'Thêm mới'}
        cancelText="Hủy"
        okButtonProps={{ style: { background: 'linear-gradient(135deg,#0d6efd,#084298)', border: 'none', borderRadius: 8 } }}
        cancelButtonProps={{ style: { borderRadius: 8 } }}
        width={520}
        style={{ top: 40 }}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          <Form.Item name="fullname" label="Họ tên đầy đủ" rules={[{ required: true, message: 'Nhập họ tên' }]}>
            <Input prefix={<UserOutlined />} placeholder="VD: Nguyễn Văn A" style={{ borderRadius: 8 }} />
          </Form.Item>

          <Form.Item
            name="email" label="Email"
            rules={[{ required: true, message: 'Nhập email' }, { type: 'email', message: 'Email không hợp lệ' }]}
          >
            <Input placeholder="VD: user@gmail.com" style={{ borderRadius: 8 }} />
          </Form.Item>

          <Form.Item
            name="password"
            label={editingUser ? 'Mật khẩu mới (để trống nếu không đổi)' : 'Mật khẩu'}
            rules={editingUser ? [] : [{ required: true, message: 'Nhập mật khẩu' }]}
          >
            <Input.Password placeholder="Nhập mật khẩu" style={{ borderRadius: 8 }} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item name="role" label="Phân quyền" rules={[{ required: true }]}>
                <Select
                  options={Object.entries(ROLE_CONFIG).map(([k, cfg]) => ({ value: k, label: cfg.label }))}
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="status" label="Trạng thái">
                <Select
                  options={[
                    { value: 'active', label: 'Hoạt động' },
                    { value: 'inactive', label: 'Tạm khóa' },
                    { value: 'banned', label: 'Cấm' },
                  ]}
                  style={{ borderRadius: 8 }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="avatar" label="Avatar URL">  
            <Input placeholder="https://..." style={{ borderRadius: 8 }} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default AdminUserPage;

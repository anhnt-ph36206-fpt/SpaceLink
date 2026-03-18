import React, { useEffect, useState } from 'react';
import {
    Table, Button, Space, Tag,
    Typography, Popconfirm, Card, Row, Col, Tooltip,
    Select, Input, Badge, Image, Switch, TreeSelect,
    Dropdown, Modal,
} from 'antd';
import type { MenuProps } from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    SearchOutlined, ShoppingOutlined, ReloadOutlined,
    UndoOutlined, EyeOutlined, CheckCircleOutlined,
    CloseCircleOutlined, StarOutlined, StarFilled,
    ThunderboltOutlined, DownOutlined, ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { axiosInstance } from '../../../api/axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { brandPrefix, categoryPrefix, productPrefix } from '../../../api/apiAdminPrefix.ts';

const { Title, Text } = Typography;
const { confirm } = Modal;

interface ProductImage {
    id: number;
    image_path: string;
    image_url?: string;
    is_primary: boolean;
}

interface Variant {
    id: number;
    sku: string;
    price: number;
    sale_price?: number | null;
    quantity: number;
    image?: string | null;
    is_active: boolean;
    attributes?: { id: number; value: string; color_code?: string; group?: string }[];
}

interface Product {
    id: number;
    name: string;
    slug?: string;
    sku?: string;
    category?: { id: number; name: string };
    brand?: { id: number; name: string };
    price: number;
    sale_price?: number;
    quantity: number;
    sold_count?: number;
    is_featured?: boolean;
    is_active?: boolean;
    deleted_at?: string | null;
    images?: ProductImage[];
    variants?: Variant[];
}

const formatVND = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

const ProductList: React.FC = () => {

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [bulkLoading, setBulkLoading] = useState(false);

    // Row selection
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);

    const [search, setSearch] = useState('');
    const [categoryId, setCategoryId] = useState<number | undefined>();
    const [brandId, setBrandId] = useState<number | undefined>();
    const [isActive, setIsActive] = useState<string | undefined>();
    const [isFeatured, setIsFeatured] = useState<string | undefined>();
    const [trashed, setTrashed] = useState<boolean>(false);
    const [perPage] = useState<number>(10);

    const [pagination, setPagination] = useState({ current: 1, total: 0, pageSize: 10 });
    const [categoryOptions, setCategoryOptions] = useState<any[]>([]);
    const [brandOptions, setBrandOptions] = useState<any[]>([]);

    const navigate = useNavigate();
    const openDetail = (id: number) => {
        navigate(`/admin/products/detail/${id}`);
    };

    const fetchProducts = async (page = 1) => {
        try {
            setLoading(true);
            const res = await axiosInstance.get(productPrefix, {
                params: {
                    search: search || undefined,
                    category_id: categoryId,
                    brand_id: brandId,
                    is_active: isActive,
                    is_featured: isFeatured,
                    trashed: trashed || undefined,
                    per_page: perPage,
                    page,
                },
            });
            setProducts(res.data.data);
            setPagination({
                current: res.data.meta.current_page,
                total: res.data.meta.total,
                pageSize: res.data.meta.per_page,
            });
            setSelectedRowKeys([]); // clear selection on reload
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Lỗi tải dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    const fetchFilters = async () => {
        try {
            const [catRes, brandRes] = await Promise.all([
                axiosInstance.get(`${categoryPrefix}`, { params: { all: 1 } }),
                axiosInstance.get(`${brandPrefix}`, { params: { all: 1 } }),
            ]);

            const buildTree = (data: any[]) => {
                const map = new Map<number, any>();
                const roots: any[] = [];
                data.forEach(item => {
                    map.set(item.id, {
                        key: item.id,
                        value: item.id,
                        title: item.name,
                        children: []
                    });
                });
                data.forEach(item => {
                    if (item.parent_id && map.has(item.parent_id)) {
                        map.get(item.parent_id).children.push(map.get(item.id));
                    } else if (!item.parent_id) {
                        roots.push(map.get(item.id));
                    }
                });
                return roots;
            };

            setCategoryOptions(buildTree(catRes.data.data));
            setBrandOptions((brandRes.data.data || []).map((b: any) => ({ value: b.id, label: b.name })));
        } catch {
            toast.error('Lỗi tải bộ lọc');
        }
    };

    useEffect(() => { fetchProducts(); fetchFilters(); }, []);

    // ─── Single-product actions ───────────────────────────────────────────────
    const handleToggleActive = async (id: number, currentActive: boolean) => {
        setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: !currentActive } : p));
        try {
            await axiosInstance.patch(`${productPrefix}/${id}/toggle-active`);
        } catch {
            setProducts(prev => prev.map(p => p.id === id ? { ...p, is_active: currentActive } : p));
            toast.error('Thay đổi trạng thái thất bại');
        }
    };

    const handleDelete = async (id: number) => {
        try {
            await axiosInstance.delete(`${productPrefix}/${id}`);
            toast.success('Đã xóa sản phẩm');
            fetchProducts(pagination.current);
        } catch { toast.error('Xóa thất bại'); }
    };

    const handleRestore = async (id: number) => {
        try {
            await axiosInstance.post(`${productPrefix}/${id}/restore`);
            toast.success('Đã khôi phục sản phẩm');
            fetchProducts(pagination.current);
        } catch { toast.error('Khôi phục thất bại'); }
    };

    const handleReset = () => {
        setSearch('');
        setCategoryId(undefined);
        setBrandId(undefined);
        setIsActive(undefined);
        setIsFeatured(undefined);
        setTrashed(false);
        setSelectedRowKeys([]);
        setTimeout(() => fetchProducts(1), 0);
    };

    // ─── Bulk action ─────────────────────────────────────────────────────────
    const handleBulkAction = async (action: string, label: string) => {
        if (selectedRowKeys.length === 0) return;

        const ids = selectedRowKeys as number[];

        const doAction = async () => {
            setBulkLoading(true);
            try {
                const res = await axiosInstance.post(`${productPrefix}/bulk-action`, { action, ids });
                toast.success(res.data.message);
                fetchProducts(pagination.current);
            } catch (err: any) {
                toast.error(err?.response?.data?.message || `${label} thất bại`);
            } finally {
                setBulkLoading(false);
            }
        };

        if (action === 'delete') {
            confirm({
                title: `Xóa ${ids.length} sản phẩm đã chọn?`,
                icon: <ExclamationCircleOutlined />,
                content: 'Sản phẩm sẽ bị xóa mềm, có thể khôi phục sau.',
                okText: 'Xóa',
                okType: 'danger',
                cancelText: 'Hủy',
                onOk: doAction,
            });
        } else {
            await doAction();
        }
    };

    const selectedCount = selectedRowKeys.length;

    // Bulk action dropdown items
    const bulkMenuItems: MenuProps['items'] = [
        {
            key: 'set_active',
            label: 'Bật hiển thị',
            icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
            onClick: () => handleBulkAction('set_active', 'Bật hiển thị'),
        },
        {
            key: 'set_inactive',
            label: 'Tắt hiển thị',
            icon: <CloseCircleOutlined style={{ color: '#ff4d4f' }} />,
            onClick: () => handleBulkAction('set_inactive', 'Tắt hiển thị'),
        },
        { type: 'divider' },
        {
            key: 'set_featured',
            label: 'Đặt nổi bật',
            icon: <StarFilled style={{ color: '#faad14' }} />,
            onClick: () => handleBulkAction('set_featured', 'Đặt nổi bật'),
        },
        {
            key: 'unset_featured',
            label: 'Bỏ nổi bật',
            icon: <StarOutlined style={{ color: '#8c8c8c' }} />,
            onClick: () => handleBulkAction('unset_featured', 'Bỏ nổi bật'),
        },
        { type: 'divider' },
        {
            key: 'set_variants_active',
            label: 'Bật tất cả biến thể',
            icon: <ThunderboltOutlined style={{ color: '#1677ff' }} />,
            onClick: () => handleBulkAction('set_variants_active', 'Bật biến thể'),
        },
        {
            key: 'set_variants_inactive',
            label: 'Tắt tất cả biến thể',
            icon: <ThunderboltOutlined style={{ color: '#ff7a00' }} />,
            onClick: () => handleBulkAction('set_variants_inactive', 'Tắt biến thể'),
        },
        { type: 'divider' },
        {
            key: 'delete',
            label: <span style={{ color: '#ff4d4f' }}>Xóa hàng loạt</span>,
            icon: <DeleteOutlined style={{ color: '#ff4d4f' }} />,
            onClick: () => handleBulkAction('delete', 'Xóa hàng loạt'),
        },
    ];

    // ─── Table columns ────────────────────────────────────────────────────────
    const getThumb = (product: Product) => {
        if (!product.images?.length) return null;
        const primary = product.images.find(i => i.is_primary);
        const img = primary || product.images[0];
        return img.image_url || `http://localhost:8000/storage/${img.image_path}`;
    };

    const columns: ColumnsType<Product> = [
        {
            title: '#',
            width: 50,
            render: (_, __, i) => (
                <Text type="secondary">
                    {(pagination.current - 1) * pagination.pageSize + i + 1}
                </Text>
            ),
        },
        {
            title: 'Sản phẩm',
            render: (_, r) => {
                const thumb = getThumb(r);
                return (
                    <Space>
                        {thumb ? (
                            <Image
                                src={thumb}
                                width={48}
                                height={48}
                                style={{ objectFit: 'cover', borderRadius: 8, border: '1px solid #f0f0f0' }}
                                preview={false}
                            />
                        ) : (
                            <div style={{
                                width: 48, height: 48, borderRadius: 8,
                                background: '#f0f5ff', display: 'flex',
                                alignItems: 'center', justifyContent: 'center',
                            }}>
                                <ShoppingOutlined style={{ color: '#1677ff', fontSize: 20 }} />
                            </div>
                        )}
                        <div>
                            <div style={{ fontWeight: 600, maxWidth: 200 }}>{r.name}</div>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                                {r.sku ? `SKU: ${r.sku}` : 'Không có SKU'}
                            </Text>
                        </div>
                    </Space>
                );
            },
        },
        {
            title: 'Danh mục',
            render: (_, r) => r.category ? (
                <Tag color="blue" style={{ borderRadius: 20 }}>{r.category.name}</Tag>
            ) : <Text type="secondary">—</Text>,
        },
        {
            title: 'Thương hiệu',
            render: (_, r) => r.brand ? (
                <Tag color="purple" style={{ borderRadius: 20 }}>{r.brand.name}</Tag>
            ) : <Text type="secondary">—</Text>,
        },
        {
            title: 'Giá',
            dataIndex: 'price',
            align: 'right',
            render: (v: number, r: Product) => (
                <div>
                    <div style={{ fontWeight: 600 }}>{formatVND(v)}</div>
                    {r.sale_price ? (
                        <Text type="secondary" style={{ fontSize: 12 }}>{formatVND(r.sale_price)}</Text>
                    ) : null}
                </div>
            ),
        },
        {
            title: 'Tồn kho',
            dataIndex: 'quantity',
            align: 'center',
            render: (v: number) => (
                <Badge
                    count={v}
                    showZero
                    style={{ backgroundColor: v > 0 ? '#52c41a' : '#ff4d4f' }}
                />
            ),
        },
        {
            title: 'Đã bán',
            dataIndex: 'sold_count',
            align: 'center',
            render: (v: number) => (
                <Text strong>{v || 0}</Text>
            ),
        },
        {
            title: 'Trạng thái',
            align: 'center',
            render: (_, r) => (
                <Space direction="vertical" size={4} align="center">
                    <Tooltip title={r.is_active ? 'Bấm để tắt' : 'Bấm để bật'}>
                        <Switch
                            checked={r.is_active}
                            disabled={!!r.deleted_at}
                            checkedChildren="Bật"
                            unCheckedChildren="Tắt"
                            onChange={() => handleToggleActive(r.id, !!r.is_active)}
                            size="small"
                        />
                    </Tooltip>
                    {r.is_featured && <Tag color="gold">⭐ Nổi bật</Tag>}
                    {r.deleted_at && <Tag color="red">Đã xóa</Tag>}
                </Space>
            ),
        },
        {
            title: 'Hành động',
            align: 'center',
            width: 120,
            render: (_, r) => (
                <Space>
                    {r.deleted_at ? (
                        <Tooltip title="Khôi phục">
                            <Popconfirm
                                title="Khôi phục sản phẩm này?"
                                onConfirm={() => handleRestore(r.id)}
                                okText="Khôi phục"
                                cancelText="Hủy"
                            >
                                <Button type="primary" size="small" icon={<UndoOutlined />} />
                            </Popconfirm>
                        </Tooltip>
                    ) : (
                        <>
                            <Tooltip title="Xem chi tiết">
                                <Button
                                    size="small" icon={<EyeOutlined />}
                                    onClick={() => openDetail(r.id)}
                                    style={{ color: '#1677ff', borderColor: '#1677ff' }}
                                />
                            </Tooltip>
                            <Tooltip title="Sửa">
                                <Button
                                    type="primary" ghost size="small" icon={<EditOutlined />}
                                    onClick={() => navigate(`/admin/products/edit/${r.id}`)}
                                />
                            </Tooltip>
                            <Popconfirm
                                title="Xóa sản phẩm này?"
                                onConfirm={() => handleDelete(r.id)}
                                okText="Xóa"
                                cancelText="Hủy"
                            >
                                <Button danger size="small" icon={<DeleteOutlined />} />
                            </Popconfirm>
                        </>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            {/* ── Header ── */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Title level={4} style={{ margin: 0 }}>
                    <ShoppingOutlined style={{ marginRight: 10, color: '#1677ff' }} />
                    Quản lý Sản phẩm
                </Title>
                <Button
                    type="primary" icon={<PlusOutlined />}
                    onClick={() => navigate('/admin/products/create')}
                    style={{ background: 'linear-gradient(135deg,#1677ff,#0958d9)', border: 'none', borderRadius: 8, height: 38, fontWeight: 600 }}
                >
                    Thêm sản phẩm
                </Button>
            </div>

            {/* ── Filter bar ── */}
            <Card style={{ marginBottom: 16, borderRadius: 10 }}>
                <Row gutter={[12, 12]} align="middle">
                    <Col flex="auto">
                        <Input
                            placeholder="Tìm theo tên, slug, SKU..."
                            prefix={<SearchOutlined />}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onPressEnter={() => fetchProducts(1)}
                            allowClear
                        />
                    </Col>
                    <Col>
                        <TreeSelect
                            placeholder="Danh mục"
                            allowClear
                            style={{ width: 220 }}
                            value={categoryId}
                            onChange={v => setCategoryId(v)}
                            treeData={categoryOptions}
                            treeDefaultExpandAll
                            showSearch
                            filterTreeNode={(search, item) =>
                                (item?.title ?? '').toString().toLowerCase().indexOf(search.toLowerCase()) >= 0
                            }
                            dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                        />
                    </Col>
                    <Col>
                        <Select
                            placeholder="Thương hiệu" allowClear style={{ width: 160 }}
                            value={brandId} onChange={v => setBrandId(v)}
                            options={brandOptions}
                        />
                    </Col>
                    <Col>
                        <Select
                            placeholder="Trạng thái" allowClear style={{ width: 140 }}
                            value={isActive} onChange={v => setIsActive(v)}
                            options={[
                                { value: 'true', label: 'Hoạt động' },
                                { value: 'false', label: 'Tắt' },
                            ]}
                        />
                    </Col>
                    <Col>
                        <Select
                            placeholder="Nổi bật" allowClear style={{ width: 130 }}
                            value={isFeatured} onChange={v => setIsFeatured(v)}
                            options={[
                                { value: 'true', label: '⭐ Nổi bật' },
                                { value: 'false', label: 'Bình thường' },
                            ]}
                        />
                    </Col>
                    <Col>
                        <Space>
                            <Text>Đã xóa:</Text>
                            <Switch
                                checked={trashed}
                                onChange={v => setTrashed(v)}
                                checkedChildren="Có" unCheckedChildren="Không"
                            />
                        </Space>
                    </Col>
                    <Col>
                        <Space>
                            <Button type="primary" icon={<SearchOutlined />} onClick={() => fetchProducts(1)}>Lọc</Button>
                            <Button icon={<ReloadOutlined />} onClick={handleReset}>Reset</Button>
                        </Space>
                    </Col>
                </Row>
            </Card>

            {/* ── Bulk action toolbar (chỉ hiện khi có chọn) ── */}
            {selectedCount > 0 && (
                <Card
                    size="small"
                    style={{
                        marginBottom: 12,
                        borderRadius: 10,
                        border: '1.5px solid #1677ff',
                        background: 'linear-gradient(135deg, #e6f4ff, #f0f5ff)',
                        boxShadow: '0 2px 8px rgba(22,119,255,.15)',
                    }}
                >
                    <Row align="middle" gutter={12}>
                        <Col>
                            <Space align="center">
                                <CheckCircleOutlined style={{ color: '#1677ff', fontSize: 18 }} />
                                <Text strong style={{ color: '#1677ff', fontSize: 15 }}>
                                    Đã chọn {selectedCount} sản phẩm
                                </Text>
                            </Space>
                        </Col>
                        <Col flex="auto">
                            <Space wrap>
                                <Button
                                    size="small"
                                    icon={<CheckCircleOutlined />}
                                    style={{ color: '#52c41a', borderColor: '#52c41a' }}
                                    loading={bulkLoading}
                                    onClick={() => handleBulkAction('set_active', 'Bật hiển thị')}
                                >
                                    Bật hiển thị
                                </Button>
                                <Button
                                    size="small"
                                    icon={<CloseCircleOutlined />}
                                    style={{ color: '#ff7a00', borderColor: '#ff7a00' }}
                                    loading={bulkLoading}
                                    onClick={() => handleBulkAction('set_inactive', 'Tắt hiển thị')}
                                >
                                    Tắt hiển thị
                                </Button>
                                <Button
                                    size="small"
                                    icon={<StarFilled />}
                                    style={{ color: '#faad14', borderColor: '#faad14' }}
                                    loading={bulkLoading}
                                    onClick={() => handleBulkAction('set_featured', 'Đặt nổi bật')}
                                >
                                    Đặt nổi bật
                                </Button>
                                <Button
                                    size="small"
                                    icon={<StarOutlined />}
                                    loading={bulkLoading}
                                    onClick={() => handleBulkAction('unset_featured', 'Bỏ nổi bật')}
                                >
                                    Bỏ nổi bật
                                </Button>

                                <Dropdown menu={{ items: bulkMenuItems }} trigger={['click']}>
                                    <Button size="small" icon={<ThunderboltOutlined />} loading={bulkLoading}>
                                        Biến thể <DownOutlined />
                                    </Button>
                                </Dropdown>

                                <Popconfirm
                                    title={`Xóa ${selectedCount} sản phẩm đã chọn?`}
                                    description="Sản phẩm sẽ bị xóa mềm, có thể khôi phục sau."
                                    okText="Xóa"
                                    okType="danger"
                                    cancelText="Hủy"
                                    onConfirm={() => handleBulkAction('delete', 'Xóa hàng loạt')}
                                >
                                    <Button
                                        size="small"
                                        danger
                                        icon={<DeleteOutlined />}
                                        loading={bulkLoading}
                                    >
                                        Xóa hàng loạt
                                    </Button>
                                </Popconfirm>
                            </Space>
                        </Col>
                        <Col>
                            <Button
                                size="small"
                                type="text"
                                onClick={() => setSelectedRowKeys([])}
                            >
                                Bỏ chọn
                            </Button>
                        </Col>
                    </Row>
                </Card>
            )}

            {/* ── Table ── */}
            <Table
                columns={columns}
                dataSource={products}
                rowKey="id"
                loading={loading}
                rowSelection={{
                    selectedRowKeys,
                    onChange: keys => setSelectedRowKeys(keys),
                    preserveSelectedRowKeys: true,
                }}
                rowClassName={(r) => r.deleted_at ? 'row-deleted' : ''}
                style={{ background: '#fff', borderRadius: 10 }}
                pagination={{
                    current: pagination.current,
                    total: pagination.total,
                    pageSize: pagination.pageSize,
                    showSizeChanger: false,
                    showTotal: (total) => `Tổng ${total} sản phẩm`,
                    onChange: (page) => fetchProducts(page),
                }}
            />

        </div>
    );
};

export default ProductList;
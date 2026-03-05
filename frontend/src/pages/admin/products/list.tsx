import React, { useEffect, useState } from 'react';
import {
    Table, Button, Space, Tag,
    Typography, Popconfirm, Card, Row, Col, Tooltip,
    Select, Input, Badge, Image, Switch,
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    SearchOutlined, ShoppingOutlined, ReloadOutlined,
    UndoOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { axiosInstance } from '../../../api/axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { brandPrefix, categoryPrefix, productPrefix } from '../../../api/apiAdminPrefix.ts';

const { Title, Text } = Typography;

interface ProductImage {
    id: number;
    image_path: string;
    image_url?: string;
    is_primary: boolean;
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
    variants?: any[];
}

const formatVND = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

const ProductList: React.FC = () => {

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);

    const [search, setSearch] = useState('');
    const [categoryId, setCategoryId] = useState<number | undefined>();
    const [brandId, setBrandId] = useState<number | undefined>();
    const [isActive, setIsActive] = useState<string | undefined>();
    const [isFeatured, setIsFeatured] = useState<string | undefined>();
    const [trashed, setTrashed] = useState<boolean>(false);
    const [perPage] = useState<number>(15);

    const [pagination, setPagination] = useState({ current: 1, total: 0, pageSize: 15 });
    const [categoryOptions, setCategoryOptions] = useState<any[]>([]);
    const [brandOptions, setBrandOptions] = useState<any[]>([]);

    const navigate = useNavigate();

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
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Lỗi tải dữ liệu');
        } finally {
            setLoading(false);
        }
    };

    const fetchFilters = async () => {
        try {
            const [catRes, brandRes] = await Promise.all([
                axiosInstance.get(`${categoryPrefix}/get-options`),
                axiosInstance.get(`${brandPrefix}/get-options`),
            ]);
            setCategoryOptions(catRes.data.data.map((c: any) => ({ value: c.id, label: c.name })));
            setBrandOptions(brandRes.data.data.map((b: any) => ({ value: b.id, label: b.name })));
        } catch {
            toast.error('Lỗi tải bộ lọc');
        }
    };

    useEffect(() => { fetchProducts(); fetchFilters(); }, []);

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
        setTimeout(() => fetchProducts(1), 0);
    };

    // Get primary image or first image
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
            title: 'Biến thể',
            align: 'center',
            render: (_, r) => {
                const count = r.variants?.length ?? 0;
                return count > 0 ? (
                    <Tag color="geekblue" style={{ borderRadius: 20 }}>{count} biến thể</Tag>
                ) : <Text type="secondary">—</Text>;
            },
        },
        {
            title: 'Trạng thái',
            align: 'center',
            render: (_, r) => (
                <Space direction="vertical" size={2}>
                    <Tag color={r.is_active ? 'success' : 'default'}>
                        {r.is_active ? 'Hoạt động' : 'Tắt'}
                    </Tag>
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
                        <Select
                            placeholder="Danh mục" allowClear style={{ width: 160 }}
                            value={categoryId} onChange={v => setCategoryId(v)}
                            options={categoryOptions}
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

            <Table
                columns={columns}
                dataSource={products}
                rowKey="id"
                loading={loading}
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
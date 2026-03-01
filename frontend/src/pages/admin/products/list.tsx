import React, { useEffect, useState } from 'react';
import {
    Table, Button, Space, Tag,
    Typography, Popconfirm, Card, Row, Col, Tooltip,
    Select, Input, Badge,
} from 'antd';
import {
    PlusOutlined, EditOutlined, DeleteOutlined,
    SearchOutlined, ShoppingOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { axiosInstance } from '../../../api/axios';
import { useNavigate } from "react-router-dom";
import { toast } from 'react-toastify';
import {brandPrefix, categoryPrefix, productPrefix} from "../../../api/apiAdminPrefix.ts";

const { Title, Text } = Typography;

interface Product {
    id: number;
    name: string;
    slug?: string;
    sku?: string;
    category?: { id: number; name: string };
    brand?: { id: number; name: string };
    price: number;
    quantity: number;
    is_featured?: boolean;
    is_active?: boolean;
}

const formatVND = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

const ProductList: React.FC = () => {

    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);

    // filters
    const [search, setSearch] = useState('');
    const [categoryId, setCategoryId] = useState<number | undefined>();
    const [brandId, setBrandId] = useState<number | undefined>();
    const [isActive, setIsActive] = useState<boolean | undefined>();
    const [isFeatured, setIsFeatured] = useState<boolean | undefined>();
    const [trashed, setTrashed] = useState<boolean | undefined>();
    const [perPage, setPerPage] = useState<number>(15);

    // pagination
    const [pagination, setPagination] = useState({
        current: 1,
        total: 0,
        pageSize: 15,
    });

    // options
    const [categoryOptions, setCategoryOptions] = useState<any[]>([]);
    const [brandOptions, setBrandOptions] = useState<any[]>([]);

    const navigate = useNavigate();

    // fetch products
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
                    trashed: trashed,
                    per_page: perPage,
                    page,
                }
            });

            setProducts(res.data.data);

            setPagination({
                current: res.data.meta.current_page,
                total: res.data.meta.total,
                pageSize: res.data.meta.per_page,
            });

        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Lỗi tải dữ liệu");
        } finally {
            setLoading(false);
        }
    };

    // load categories + brands
    const fetchFilters = async () => {
        try {
            const [catRes, brandRes] = await Promise.all([
                axiosInstance.get(`${categoryPrefix}/get-options`),
                axiosInstance.get(`${brandPrefix}/get-options`),
            ]);

            setCategoryOptions(
                catRes.data.data.map((c: any) => ({
                    value: c.id,
                    label: c.name,
                }))
            );

            setBrandOptions(
                brandRes.data.data.map((b: any) => ({
                    value: b.id,
                    label: b.name,
                }))
            );

        } catch {
            toast.error("Lỗi tải bộ lọc");
        }
    };

    useEffect(() => {
        fetchProducts();
        fetchFilters();
    }, []);

    const handleDelete = async (id: number) => {
        try {
            await axiosInstance.delete(`${productPrefix}/${id}`);
            toast.success('Xóa thành công');
            fetchProducts(pagination.current);
        } catch {
            toast.error('Xóa thất bại');
        }
    };

    const columns: ColumnsType<Product> = [
        {
            title: '#',
            width: 60,
            render: (_, __, i) => (
                <Text type="secondary">
                    {(pagination.current - 1) * pagination.pageSize + i + 1}
                </Text>
            ),
        },
        {
            title: 'Sản phẩm',
            render: (_, r) => (
                <Space>
                    <div
                        style={{
                            width: 48,
                            height: 48,
                            borderRadius: 10,
                            background: '#f0f5ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                        }}
                    >
                        <ShoppingOutlined style={{ color: '#1677ff', fontSize: 20 }} />
                    </div>
                    <div>
                        <div style={{ fontWeight: 600 }}>{r.name}</div>
                        <Text type="secondary">
                            SKU: {r.sku || '—'}
                        </Text>
                    </div>
                </Space>
            ),
        },
        {
            title: 'Danh mục',
            render: (_, r) => (
                <Tag color="blue" style={{ borderRadius: 20 }}>
                    {r.category?.name || '—'}
                </Tag>
            ),
        },
        {
            title: 'Giá',
            dataIndex: 'price',
            align: 'right',
            render: (v: number) => formatVND(v),
        },
        {
            title: 'Tồn kho',
            dataIndex: 'quantity',
            align: 'center',
            render: (v: number) => (
                <Badge count={v} showZero />
            ),
        },
        {
            title: 'Trạng thái',
            dataIndex: 'is_active',
            align: 'center',
            render: (v: boolean) => (
                <Tag color={v ? 'success' : 'default'}>
                    {v ? 'Hoạt động' : 'Tắt'}
                </Tag>
            ),
        },
        {
            title: 'Hành động',
            align: 'center',
            render: (_, r) => (
                <Space>
                    <Tooltip title="Sửa">
                        <Button
                            type="primary"
                            ghost
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() =>
                                navigate(`/admin/products/edit/${r.id}`)
                            }
                        />
                    </Tooltip>

                    <Popconfirm
                        title="Xóa sản phẩm này?"
                        onConfirm={() => handleDelete(r.id)}
                    >
                        <Button
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                        />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
                <Title level={4} style={{ margin: 0 }}>
                    <ShoppingOutlined style={{ marginRight: 10 }} />
                    Quản lí Sản phẩm
                </Title>

                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => navigate('/admin/products/create')}
                >
                    Thêm sản phẩm
                </Button>
            </div>

            <Card style={{ marginBottom: 20 }}>
                <Row gutter={12}>
                    <Col flex="auto">
                        <Input
                            placeholder="Tìm theo tên, slug, SKU..."
                            prefix={<SearchOutlined />}
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            allowClear
                        />
                    </Col>

                    <Col>
                        <Select
                            placeholder="Danh mục"
                            allowClear
                            style={{ width: 180 }}
                            onChange={v => setCategoryId(v)}
                            options={categoryOptions}
                        />
                    </Col>

                    <Col>
                        <Select
                            placeholder="Thương hiệu"
                            allowClear
                            style={{ width: 180 }}
                            onChange={v => setBrandId(v)}
                            options={brandOptions}
                        />
                    </Col>

                    <Col>
                        <Button type="primary" onClick={() => fetchProducts(1)}>
                            Lọc
                        </Button>
                    </Col>

                    <Col>
                        <Button onClick={() => {
                            setSearch('');
                            setCategoryId(undefined);
                            setBrandId(undefined);
                            setIsActive(undefined);
                            setIsFeatured(undefined);
                            setTrashed(undefined);
                            setPerPage(15);
                            fetchProducts(1);
                        }}>
                            Reset
                        </Button>
                    </Col>
                </Row>
            </Card>

            <Table
                columns={columns}
                dataSource={products}
                rowKey="id"
                loading={loading}
                pagination={{
                    current: pagination.current,
                    total: pagination.total,
                    pageSize: pagination.pageSize,
                    onChange: (page) => fetchProducts(page),
                }}
            />
        </div>
    );
};

export default ProductList;
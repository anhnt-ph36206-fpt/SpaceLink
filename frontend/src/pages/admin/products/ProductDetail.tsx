import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Card, Row, Col, Typography, Space, Tag, Button,
    Table, Image, Descriptions, Divider,
    InputNumber, Switch, Breadcrumb, Tabs, Skeleton
} from 'antd';
import {
    ArrowLeftOutlined, EditOutlined, ShoppingOutlined,
    ThunderboltOutlined, SaveOutlined, TagsOutlined,
    BarChartOutlined, InfoCircleOutlined, ToolOutlined
} from '@ant-design/icons';
import ProductSpecifications from './ProductSpecifications';
import MDEditor from '@uiw/react-md-editor';
import { axiosInstance } from '../../../api/axios';
import { productPrefix } from '../../../api/apiAdminPrefix';
import { toast } from 'react-toastify';

const { Title, Text } = Typography;

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
    slug: string;
    sku: string;
    category?: { id: number; name: string };
    brand?: { id: number; name: string };
    price: number;
    sale_price?: number;
    quantity: number;
    description: string;
    content: string;
    is_featured: boolean;
    is_active: boolean;
    sold_count: number;
    images?: { id: number; image_path: string; image_url?: string; is_primary: boolean }[];
    variants?: Variant[];
}

const formatVND = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

const ProductDetail: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [product, setProduct] = useState<Product | null>(null);
    const [loading, setLoading] = useState(true);
    const [updatingVariantId, setUpdatingVariantId] = useState<number | null>(null);

    const fetchDetail = async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get(`${productPrefix}/${id}`);
            setProduct(res.data.data);
        } catch {
            toast.error('Lỗi tải chi tiết sản phẩm');
            navigate('/admin/products');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDetail();
    }, [id]);

    const handleUpdateVariantQuick = async (variantId: number, data: any) => {
        if (!product) return;
        try {
            setUpdatingVariantId(variantId);
            await axiosInstance.put(`${productPrefix}/${product.id}/variants/${variantId}`, data);
            toast.success('Cập nhật biến thể thành công');
            // Update local state instead of refetching everything for smoothness
            setProduct(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    variants: (prev.variants || []).map(v => v.id === variantId ? { ...v, ...data } : v)
                };
            });
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Cập nhật thất bại');
        } finally {
            setUpdatingVariantId(null);
        }
    };

    if (loading) return (
        <div style={{ padding: 24 }}>
            <Skeleton active avatar paragraph={{ rows: 10 }} />
        </div>
    );

    if (!product) return null;

    const primaryImage = product.images?.find(i => i.is_primary) || product.images?.[0];
    const thumbUrl = primaryImage?.image_url || (primaryImage ? `http://localhost:8000/storage/${primaryImage.image_path}` : '');

    return (
        <div style={{ padding: '24px', maxWidth: 1400, margin: '0 auto' }}>
            <Breadcrumb style={{ marginBottom: 16 }}>
                <Breadcrumb.Item>
                    <span onClick={() => navigate('/admin/products')} style={{ cursor: 'pointer' }}>Sản phẩm</span>
                </Breadcrumb.Item>
                <Breadcrumb.Item>{product.name}</Breadcrumb.Item>
            </Breadcrumb>

            <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Space size="middle">
                    <Button
                        icon={<ArrowLeftOutlined />}
                        onClick={() => navigate('/admin/products')}
                        style={{ borderRadius: 8 }}
                    />
                    <div>
                        <Title level={3} style={{ margin: 0 }}>{product.name}</Title>
                        <Text type="secondary">Product ID: #{product.id} • SKU: {product.sku || 'N/A'}</Text>
                    </div>
                </Space>
                <Button
                    type="primary"
                    icon={<EditOutlined />}
                    size="large"
                    onClick={() => navigate(`/admin/products/edit/${product.id}`)}
                    style={{ borderRadius: 8, height: 45, padding: '0 25px' }}
                >
                    Chỉnh sửa sản phẩm
                </Button>
            </div>

            <Row gutter={[24, 24]}>
                {/* Left side: Basic Info & Stats */}
                <Col xs={24} lg={8}>
                    <Card
                        hoverable
                        cover={
                            thumbUrl ? (
                                <Image
                                    src={thumbUrl}
                                    style={{ height: 350, objectFit: 'cover' }}
                                />
                            ) : (
                                <div style={{ height: 350, background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <ShoppingOutlined style={{ fontSize: 64, color: '#bfbfbf' }} />
                                </div>
                            )
                        }
                        style={{ borderRadius: 12, overflow: 'hidden' }}
                    >
                        <Descriptions column={1} size="small" bordered>
                            <Descriptions.Item label="Trạng thái">
                                <Tag color={product.is_active ? 'success' : 'error'}>
                                    {product.is_active ? 'Hoạt động' : 'Đang ẩn'}
                                </Tag>
                                {product.is_featured && <Tag color="gold">⭐ Nổi bật</Tag>}
                            </Descriptions.Item>
                            <Descriptions.Item label="Giá gốc">{formatVND(product.price)}</Descriptions.Item>
                            <Descriptions.Item label="Giá KM">{product.sale_price ? formatVND(product.sale_price) : '—'}</Descriptions.Item>
                            <Descriptions.Item label="Tổng kho">{product.quantity}</Descriptions.Item>
                            <Descriptions.Item label="Đã bán">{product.sold_count || 0} sản phẩm</Descriptions.Item>
                        </Descriptions>
                    </Card>

                    <Card style={{ marginTop: 24, borderRadius: 12 }} title="Tổ chức">
                        <Space direction="vertical" style={{ width: '100%' }}>
                            <div>
                                <Text type="secondary" style={{ display: 'block' }}>Danh mục</Text>
                                <Tag color="blue" style={{ marginTop: 4, borderRadius: 4 }}>{product.category?.name || 'Chưa phân loại'}</Tag>
                            </div>
                            <Divider style={{ margin: '12px 0' }} />
                            <div>
                                <Text type="secondary" style={{ display: 'block' }}>Thương hiệu</Text>
                                <Tag color="purple" style={{ marginTop: 4, borderRadius: 4 }}>{product.brand?.name || 'Không có thương hiệu'}</Tag>
                            </div>
                        </Space>
                    </Card>
                </Col>

                {/* Right side: Variants & Detailed Info */}
                <Col xs={24} lg={16}>
                    <Card style={{ borderRadius: 12 }} className="detail-tabs-card">
                        <Tabs defaultActiveKey="1" items={[
                            {
                                key: '1',
                                label: <span><TagsOutlined />Biến thể sản phẩm</span>,
                                children: (
                                    <>
                                        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Title level={5} style={{ margin: 0 }}>
                                                <ThunderboltOutlined style={{ color: '#fa8c16' }} /> Chỉnh sửa nhanh biến thể
                                            </Title>
                                            <Text type="secondary">{product.variants?.length || 0} biến thể được tìm thấy</Text>
                                        </div>
                                        <Table
                                            dataSource={product.variants || []}
                                            rowKey="id"
                                            pagination={false}
                                            scroll={{ x: 800 }}
                                            columns={[
                                                {
                                                    title: 'Biến thể',
                                                    key: 'info',
                                                    render: (_, r) => (
                                                        <Space>
                                                            {r.image ? (
                                                                <Image
                                                                    src={r.image.startsWith('http') ? r.image : `http://localhost:8000/storage/${r.image}`}
                                                                    width={45} height={45} style={{ borderRadius: 8, objectFit: 'cover' }}
                                                                />
                                                            ) : (
                                                                <div style={{ width: 45, height: 45, borderRadius: 8, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                                    <TagsOutlined style={{ color: '#bfbfbf' }} />
                                                                </div>
                                                            )}
                                                            <div>
                                                                <div style={{ fontWeight: 600 }}>
                                                                    {r.attributes?.map(a => a.value).join(' / ') || 'Mặc định'}
                                                                </div>
                                                                <Text type="secondary" style={{ fontSize: 12 }}>{r.sku || 'No SKU'}</Text>
                                                            </div>
                                                        </Space>
                                                    )
                                                },
                                                {
                                                    title: 'Giá gốc',
                                                    width: 150,
                                                    render: (_, r) => (
                                                        <InputNumber
                                                            style={{ width: '100%' }} min={0}
                                                            value={r.price}
                                                            onChange={v => {
                                                                setProduct(prev => {
                                                                    if (!prev) return prev;
                                                                    return {
                                                                        ...prev,
                                                                        variants: (prev.variants || []).map(vnt => vnt.id === r.id ? { ...vnt, price: v || 0 } : vnt)
                                                                    };
                                                                });
                                                            }}
                                                        />
                                                    )
                                                },
                                                {
                                                    title: 'Giá KM',
                                                    width: 150,
                                                    render: (_, r) => (
                                                        <InputNumber
                                                            style={{ width: '100%' }} min={0}
                                                            value={r.sale_price ?? undefined}
                                                            onChange={v => {
                                                                setProduct(prev => {
                                                                    if (!prev) return prev;
                                                                    return {
                                                                        ...prev,
                                                                        variants: (prev.variants || []).map(vnt => vnt.id === r.id ? { ...vnt, sale_price: v } : vnt)
                                                                    };
                                                                });
                                                            }}
                                                        />
                                                    )
                                                },
                                                {
                                                    title: 'Tồn kho',
                                                    width: 100,
                                                    render: (_, r) => (
                                                        <InputNumber
                                                            style={{ width: '100%' }} min={0}
                                                            value={r.quantity}
                                                            onChange={v => {
                                                                setProduct(prev => {
                                                                    if (!prev) return prev;
                                                                    return {
                                                                        ...prev,
                                                                        variants: (prev.variants || []).map(vnt => vnt.id === r.id ? { ...vnt, quantity: v || 0 } : vnt)
                                                                    };
                                                                });
                                                            }}
                                                        />
                                                    )
                                                },
                                                {
                                                    title: 'Bật',
                                                    width: 60,
                                                    align: 'center',
                                                    render: (_, r) => (
                                                        <Switch
                                                            size="small"
                                                            checked={r.is_active}
                                                            loading={updatingVariantId === r.id}
                                                            onChange={v => {
                                                                // Optimistic UI
                                                                setProduct(prev => {
                                                                    if (!prev) return prev;
                                                                    return { ...prev, variants: (prev.variants || []).map(vnt => vnt.id === r.id ? { ...vnt, is_active: v } : vnt) };
                                                                });
                                                                // Gọi API ngay — trước đây chỉ update state không lưu DB
                                                                handleUpdateVariantQuick(r.id, { price: r.price, sale_price: r.sale_price, quantity: r.quantity, is_active: v, sku: r.sku });
                                                            }}
                                                        />
                                                    )
                                                },
                                                {
                                                    title: '',
                                                    width: 50,
                                                    render: (_, r) => (
                                                        <Button
                                                            type="primary"
                                                            icon={<SaveOutlined />}
                                                            loading={updatingVariantId === r.id}
                                                            onClick={() => handleUpdateVariantQuick(r.id, {
                                                                price: r.price,
                                                                sale_price: r.sale_price,
                                                                quantity: r.quantity,
                                                                is_active: r.is_active,
                                                                sku: r.sku
                                                            })}
                                                        />
                                                    )
                                                }
                                            ]}
                                        />
                                    </>
                                )
                            },
                            {
                                key: '2',
                                label: <span><InfoCircleOutlined />Mô tả & Nội dung</span>,
                                children: (
                                    <div style={{ minHeight: 400 }}>
                                        <div style={{ marginBottom: 24 }}>
                                            <Title level={5}>Mô tả ngắn</Title>
                                            <div
                                                data-color-mode="light"
                                                style={{ background: '#f9f9f9', padding: 16, borderRadius: 8 }}
                                            >
                                                {product.description
                                                    ? <MDEditor.Markdown source={product.description} />
                                                    : <span style={{ color: '#999' }}>Không có mô tả ngắn</span>
                                                }
                                            </div>
                                        </div>
                                        <Divider />
                                        <div>
                                            <Title level={5}>Nội dung chi tiết</Title>
                                            <div
                                                data-color-mode="light"
                                                style={{ padding: 16, border: '1px solid #f0f0f0', borderRadius: 8, minHeight: 200 }}
                                            >
                                                {product.content
                                                    ? <MDEditor.Markdown source={product.content} />
                                                    : <span style={{ color: '#999' }}>Chưa có nội dung chi tiết</span>
                                                }
                                            </div>
                                        </div>
                                    </div>
                                )
                            },
                            {
                                key: '3',
                                label: <span><BarChartOutlined />SEO & Metadata</span>,
                                children: (
                                    <Descriptions bordered column={1}>
                                        <Descriptions.Item label="URL Slug">{product.slug}</Descriptions.Item>
                                        <Descriptions.Item label="Meta Title">{product.name}</Descriptions.Item>
                                        <Descriptions.Item label="Meta Description">{product.description || 'N/A'}</Descriptions.Item>
                                    </Descriptions>
                                )
                            },
                            {
                                key: '4',
                                label: <span><ToolOutlined />Thông số kỹ thuật</span>,
                                children: (
                                    <ProductSpecifications productId={product.id} />
                                )
                            }
                        ]} />
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default ProductDetail;

import React, { useEffect, useState, useCallback } from 'react';
import {
    Form, Input, InputNumber, Switch, Button, Row, Col,
    Typography, Select, Card, Tabs, Tag, Space, Divider,
    Popconfirm, Table, Tooltip, Spin, Alert, Upload,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    ShoppingOutlined, PlusOutlined, DeleteOutlined,
    ThunderboltOutlined, ArrowLeftOutlined, LinkOutlined,
    PictureOutlined, TagsOutlined, SaveOutlined, CheckCircleOutlined,
    UploadOutlined, CloseCircleOutlined
} from '@ant-design/icons';
import { axiosInstance } from '../../../api/axios';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { productPrefix, categoryPrefix, brandPrefix, attributeGroupPrefix } from '../../../api/apiAdminPrefix';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface AttrValue { id: number; value: string; color_code?: string }
interface AttrGroup { id: number; name: string; display_name?: string; attributes: AttrValue[] }

interface ExistingImage {
    id: number;
    image_path: string;
    image_url?: string;
    is_primary: boolean;
    display_order: number;
    _deleted?: boolean;
}

interface NewImage {
    _key: string;
    file: File;
    previewUrl: string;
    is_primary: boolean;
}

interface VariantAttr {
    id: number;
    value: string;
    color_code?: string;
    group_name?: string;
    group_display_name?: string;
}

interface VariantRow {
    _key: string;
    id?: number;             // existing variant
    label: string;
    attribute_ids: number[];
    sku: string;
    price: number;
    sale_price: number | null;
    quantity: number;
    image: string;
    imageFile?: File;
    imagePreviewUrl?: string;
    is_active: boolean;
    _saving?: boolean;
    _saved?: boolean;
    _deleted?: boolean;
    _isNew?: boolean;
}

function slugify(str: string) {
    return str
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-').trim();
}

function cartesian<T>(arrays: T[][]): T[][] {
    return arrays.reduce<T[][]>(
        (acc, arr) => acc.flatMap(a => arr.map(b => [...a, b])),
        [[]]
    );
}

function buildVariantLabel(attrs: VariantAttr[]): string {
    return attrs.map(a => a.value).join(' / ') || 'Không có thuộc tính';
}

const ProductEdit: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const [form] = Form.useForm();
    const navigate = useNavigate();

    const [pageLoading, setPageLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('info');

    const [categoryOptions, setCategoryOptions] = useState<any[]>([]);
    const [brandOptions, setBrandOptions] = useState<any[]>([]);
    const [attrGroups, setAttrGroups] = useState<AttrGroup[]>([]);

    const [existingImages, setExistingImages] = useState<ExistingImage[]>([]);
    const [newImages, setNewImages] = useState<NewImage[]>([]);

    const [variants, setVariants] = useState<VariantRow[]>([]);

    const [showBuilder, setShowBuilder] = useState(false);
    const [selectedAttrs, setSelectedAttrs] = useState<{ groupId: number; groupName: string; values: AttrValue[] }[]>([]);
    const [addGroupId, setAddGroupId] = useState<number | null>(null);

    /* ── Load product data & options ── */
    useEffect(() => {
        const load = async () => {
            try {
                setPageLoading(true);
                const [productRes, catRes,
                    //brandRes,
                    attrRes] = await Promise.all([
                        axiosInstance.get(`${productPrefix}/${id}`),
                        axiosInstance.get(`${categoryPrefix}`),
                        // axiosInstance.get(`${brandPrefix}/get-options`),
                        axiosInstance.get(attributeGroupPrefix),
                    ]);

                const p = productRes.data.data;

                form.setFieldsValue({
                    name: p.name,
                    slug: p.slug,
                    sku: p.sku,
                    category_id: p.category?.id,
                    brand_id: p.brand?.id,
                    price: parseFloat(p.price),
                    sale_price: p.sale_price ? parseFloat(p.sale_price) : undefined,
                    quantity: p.quantity,
                    description: p.description,
                    content: p.content,
                    is_active: p.is_active,
                    is_featured: p.is_featured,
                    meta_title: p.meta_title,
                    meta_description: p.meta_description,
                });

                setExistingImages((p.images || []).map((img: any) => ({
                    id: img.id,
                    image_path: img.image_path,
                    image_url: img.image_url || `http://localhost:8000/storage/${img.image_path}`,
                    is_primary: img.is_primary,
                    display_order: img.display_order ?? 0,
                })));

                setVariants((p.variants || []).map((v: any) => ({
                    _key: `var-existing-${v.id}`,
                    id: v.id,
                    label: buildVariantLabel(v.attributes || []),
                    attribute_ids: (v.attributes || []).map((a: any) => a.id),
                    sku: v.sku || '',
                    price: parseFloat(v.price),
                    sale_price: v.sale_price ? parseFloat(v.sale_price) : null,
                    quantity: v.quantity ?? 0,
                    image: v.image || '',
                    is_active: v.is_active ?? true,
                })));

                setCategoryOptions(catRes.data.data.map((c: any) => ({ value: c.id, label: c.name })));
                // setBrandOptions(brandRes.data.data.map((b: any) => ({ value: b.id, label: b.name })));
                setAttrGroups(attrRes.data.data);
            } catch {
                toast.error('Không tải được dữ liệu sản phẩm');
            } finally {
                setPageLoading(false);
            }
        };
        if (id) load();
    }, [id]);

    const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        form.setFieldValue('slug', slugify(e.target.value));
    }, [form]);

    const removeExistingImage = async (imgId: number) => {
        try {
            await axiosInstance.delete(`${productPrefix}/${id}/images/${imgId}`);
            setExistingImages(prev => prev.filter(i => i.id !== imgId));
            toast.success('Đã xóa ảnh');
        } catch { toast.error('Xóa ảnh thất bại'); }
    };

    const setExistingPrimary = async (imgId: number) => {
        setExistingImages(prev => prev.map(i => ({ ...i, is_primary: i.id === imgId })));
        toast.info('Ảnh chính đã được đánh dấu (sẽ cập nhật khi lưu)');
    };

    const handleGalleryUpload = (file: File) => {
        const previewUrl = URL.createObjectURL(file);
        const allImages = [...existingImages, ...newImages];
        setNewImages(prev => [...prev, {
            _key: `ni-${Date.now()}-${Math.random()}`,
            file,
            previewUrl,
            is_primary: allImages.length === 0,
        }]);
        return false;
    };

    const removeNewImage = (key: string) => setNewImages(prev => prev.filter(i => i._key !== key));

    const setNewPrimary = (key: string) => {
        setExistingImages(prev => prev.map(i => ({ ...i, is_primary: false })));
        setNewImages(prev => prev.map(i => ({ ...i, is_primary: i._key === key })));
    };

    const updateVariant = (key: string, field: keyof VariantRow, value: any) => {
        setVariants(prev => prev.map(v => v._key === key ? { ...v, [field]: value, _saved: false } : v));
    };

    const saveExistingVariant = async (row: VariantRow) => {
        if (!row.id) return;
        setVariants(prev => prev.map(v => v._key === row._key ? { ...v, _saving: true } : v));
        try {
            const fd = new FormData();
            fd.append('_method', 'PUT'); // Laravel spoofing
            if (row.sku) fd.append('sku', row.sku);
            fd.append('price', row.price.toString());
            if (row.sale_price !== null) fd.append('sale_price', row.sale_price.toString());
            fd.append('quantity', row.quantity.toString());
            if (row.imageFile) fd.append('image', row.imageFile);
            else if (row.image) fd.append('image', row.image);
            fd.append('is_active', row.is_active ? '1' : '0');
            if (row.attribute_ids.length > 0) {
                row.attribute_ids.forEach(id => fd.append('attribute_ids[]', id.toString()));
            }

            await axiosInstance.post(`${productPrefix}/${id}/variants/${row.id}`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setVariants(prev => prev.map(v => v._key === row._key ? { ...v, _saving: false, _saved: true } : v));
            toast.success('Đã lưu biến thể');
            setTimeout(() => setVariants(prev => prev.map(v => v._key === row._key ? { ...v, _saved: false } : v)), 2000);
        } catch (err: any) {
            setVariants(prev => prev.map(v => v._key === row._key ? { ...v, _saving: false } : v));
            toast.error(err?.response?.data?.message || 'Lưu biến thể thất bại');
        }
    };

    const deleteExistingVariant = async (row: VariantRow) => {
        if (!row.id) {
            setVariants(prev => prev.filter(v => v._key !== row._key));
            return;
        }
        try {
            await axiosInstance.delete(`${productPrefix}/${id}/variants/${row.id}`);
            setVariants(prev => prev.filter(v => v._key !== row._key));
            toast.success('Đã xóa biến thể');
        } catch { toast.error('Xóa biến thể thất bại'); }
    };

    const addAttrGroup = () => {
        if (!addGroupId) return;
        const group = attrGroups.find(g => g.id === addGroupId);
        if (!group) return;
        if (selectedAttrs.some(a => a.groupId === addGroupId)) {
            toast.warning('Nhóm này đã được thêm'); return;
        }
        setSelectedAttrs(prev => [...prev, { groupId: group.id, groupName: group.display_name || group.name, values: [] }]);
        setAddGroupId(null);
    };

    const removeAttrGroupFromBuilder = (groupId: number) => {
        setSelectedAttrs(prev => prev.filter(a => a.groupId !== groupId));
    };

    const toggleAttrValue = (groupId: number, attr: AttrValue) => {
        setSelectedAttrs(prev => prev.map(a => {
            if (a.groupId !== groupId) return a;
            const already = a.values.some(v => v.id === attr.id);
            return { ...a, values: already ? a.values.filter(v => v.id !== attr.id) : [...a.values, attr] };
        }));
    };

    const generateNewVariants = () => {
        const groups = selectedAttrs.filter(a => a.values.length > 0);
        if (groups.length === 0) { toast.warning('Chọn ít nhất 1 giá trị thuộc tính'); return; }
        const combos = cartesian(groups.map(g => g.values));
        const newVars: VariantRow[] = combos.map(combo => ({
            _key: `var-new-${Date.now()}-${Math.random()}`,
            attribute_ids: combo.map(v => v.id),
            label: combo.map(v => v.value).join(' / '),
            sku: '',
            price: 0,
            sale_price: null,
            quantity: 0,
            image: '',
            is_active: true,
            _isNew: true,
        }));
        setVariants(prev => [...prev, ...newVars]);
        setShowBuilder(false);
        setSelectedAttrs([]);
        toast.success(`Đã thêm ${newVars.length} biến thể mới. Điền thông tin rồi bấm Lưu.`);
    };

    const saveNewVariant = async (row: VariantRow) => {
        setVariants(prev => prev.map(v => v._key === row._key ? { ...v, _saving: true } : v));
        try {
            const fd = new FormData();
            if (row.sku) fd.append('sku', row.sku);
            fd.append('price', row.price.toString());
            if (row.sale_price !== null) fd.append('sale_price', row.sale_price.toString());
            fd.append('quantity', row.quantity.toString());
            if (row.imageFile) fd.append('image', row.imageFile);
            else if (row.image) fd.append('image', row.image);
            fd.append('is_active', row.is_active ? '1' : '0');
            if (row.attribute_ids.length > 0) {
                row.attribute_ids.forEach(id => fd.append('attribute_ids[]', id.toString()));
            }

            const res = await axiosInstance.post(`${productPrefix}/${id}/variants`, fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const created = res.data.data;
            setVariants(prev => prev.map(v => v._key === row._key ? {
                ...v,
                id: created.id,
                _isNew: false,
                _saving: false,
                _saved: true,
            } : v));
            toast.success('Đã lưu biến thể mới');
            setTimeout(() => setVariants(prev => prev.map(v => v._key === row._key ? { ...v, _saved: false } : v)), 2000);
        } catch (err: any) {
            setVariants(prev => prev.map(v => v._key === row._key ? { ...v, _saving: false } : v));
            toast.error(err?.response?.data?.message || 'Lưu biến thể thất bại');
        }
    };

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSubmitting(true);

            await axiosInstance.put(`${productPrefix}/${id}`, values);

            for (const img of newImages) {
                try {
                    const fd = new FormData();
                    fd.append('image', img.file);
                    fd.append('is_primary', img.is_primary ? '1' : '0');
                    fd.append('display_order', (existingImages.length + newImages.indexOf(img)).toString());
                    await axiosInstance.post(`${productPrefix}/${id}/images`, fd, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                } catch { /* continue */ }
            }
            setNewImages([]);

            const pendingNew = variants.filter(v => v._isNew);
            for (const v of pendingNew) {
                try {
                    const fd = new FormData();
                    if (v.sku) fd.append('sku', v.sku);
                    fd.append('price', v.price.toString());
                    if (v.sale_price !== null) fd.append('sale_price', v.sale_price.toString());
                    fd.append('quantity', v.quantity.toString());
                    if (v.imageFile) fd.append('image', v.imageFile);
                    else if (v.image) fd.append('image', v.image);
                    fd.append('is_active', v.is_active ? '1' : '0');
                    if (v.attribute_ids.length > 0) {
                        v.attribute_ids.forEach(id => fd.append('attribute_ids[]', id.toString()));
                    }

                    const res = await axiosInstance.post(`${productPrefix}/${id}/variants`, fd, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    const created = res.data.data;
                    setVariants(prev => prev.map(vr => vr._key === v._key ? { ...vr, id: created.id, _isNew: false } : vr));
                } catch { /* continue */ }
            }

            toast.success('Cập nhật sản phẩm thành công!');
            const updated = await axiosInstance.get(`${productPrefix}/${id}`);
            setExistingImages((updated.data.data.images || []).map((img: any) => ({
                id: img.id,
                image_path: img.image_path,
                image_url: img.image_url || `http://localhost:8000/storage/${img.image_path}`,
                is_primary: img.is_primary,
                display_order: img.display_order ?? 0,
            })));
        } catch (error: any) {
            if (error?.errorFields) {
                setActiveTab('info');
                toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
            } else {
                toast.error(error?.response?.data?.message || 'Có lỗi xảy ra');
            }
        } finally {
            setSubmitting(false);
        }
    };

    const variantColumns: ColumnsType<VariantRow> = [
        {
            title: 'Biến thể / Thuộc tính',
            dataIndex: 'label',
            width: 160,
            render: (v, r) => (
                <div>
                    <Input
                        value={v} size="small"
                        onChange={e => updateVariant(r._key, 'label', e.target.value)}
                    />
                    {r._isNew && <Tag color="green" style={{ marginTop: 4 }}>Mới</Tag>}
                </div>
            ),
        },
        {
            title: 'SKU',
            width: 120,
            render: (_, r) => (
                <Input
                    value={r.sku} size="small" placeholder="SKU variant"
                    onChange={e => updateVariant(r._key, 'sku', e.target.value)}
                />
            ),
        },
        {
            title: 'Giá *',
            width: 130,
            render: (_, r) => (
                <InputNumber
                    value={r.price} size="small" min={0} style={{ width: '100%' }}
                    formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    onChange={v => updateVariant(r._key, 'price', v ?? 0)}
                />
            ),
        },
        {
            title: 'Giá KM',
            width: 130,
            render: (_, r) => (
                <InputNumber
                    value={r.sale_price ?? undefined} size="small" min={0} style={{ width: '100%' }}
                    formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                    onChange={v => updateVariant(r._key, 'sale_price', v ?? null)}
                />
            ),
        },
        {
            title: 'Số lượng',
            width: 100,
            render: (_, r) => (
                <InputNumber
                    value={r.quantity} size="small" min={0} style={{ width: '100%' }}
                    onChange={v => updateVariant(r._key, 'quantity', v ?? 0)}
                />
            ),
        },
        {
            title: 'Ảnh',
            width: 100,
            align: 'center',
            render: (_, r) => {
                const previewSrc = r.imagePreviewUrl || (!r._isNew && r.image ? `http://localhost:8000/storage/${r.image}` : null);
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                        {previewSrc && (
                            <div style={{ position: 'relative' }}>
                                <img src={previewSrc} alt="Variant" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid #ddd' }} />
                                <CloseCircleOutlined
                                    style={{ position: 'absolute', top: -6, right: -6, color: '#ff4d4f', cursor: 'pointer', background: 'white', borderRadius: '50%' }}
                                    onClick={() => {
                                        updateVariant(r._key, 'imageFile', undefined);
                                        updateVariant(r._key, 'imagePreviewUrl', undefined);
                                        updateVariant(r._key, 'image', ''); // Clear existing image
                                    }}
                                />
                            </div>
                        )}
                        <Upload
                            accept="image/*"
                            showUploadList={false}
                            beforeUpload={file => {
                                const url = URL.createObjectURL(file);
                                updateVariant(r._key, 'imageFile', file);
                                updateVariant(r._key, 'imagePreviewUrl', url);
                                return false;
                            }}
                        >
                            {!previewSrc && <Button size="small" icon={<UploadOutlined />}>Đổi</Button>}
                        </Upload>
                    </div>
                );
            },
        },
        {
            title: 'Bật',
            align: 'center',
            width: 60,
            render: (_, r) => (
                <Switch
                    checked={r.is_active} size="small"
                    onChange={v => updateVariant(r._key, 'is_active', v)}
                />
            ),
        },
        {
            title: 'Hành động',
            align: 'center',
            width: 120,
            render: (_, r) => (
                <Space>
                    <Tooltip title={r._isNew ? 'Lưu biến thể mới' : 'Cập nhật biến thể'}>
                        <Button
                            type="primary" ghost size="small"
                            icon={r._saved ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <SaveOutlined />}
                            loading={r._saving}
                            onClick={() => r._isNew ? saveNewVariant(r) : saveExistingVariant(r)}
                            style={r._saved ? { borderColor: '#52c41a', color: '#52c41a' } : {}}
                        />
                    </Tooltip>
                    <Popconfirm
                        title="Xóa biến thể này?"
                        onConfirm={() => deleteExistingVariant(r)}
                        okText="Xóa" cancelText="Hủy"
                    >
                        <Button danger size="small" type="text" icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    const allDisplayImages = [
        ...existingImages.map(i => ({ ...i, _key: `ex-${i.id}`, isExisting: true })),
        ...newImages.map(i => ({ id: 0, image_path: '', image_url: i.previewUrl, is_primary: i.is_primary, display_order: 0, _key: i._key, isExisting: false })),
    ];

    const tabItems = [
        {
            key: 'info',
            label: <span><ShoppingOutlined />Thông tin</span>,
            children: (
                <Row gutter={24}>
                    <Col span={16}>
                        <Card title="Thông tin cơ bản" style={{ marginBottom: 16 }}>
                            <Form.Item name="name" label="Tên sản phẩm" rules={[{ required: true }]}>
                                <Input onChange={handleNameChange} />
                            </Form.Item>
                            <Form.Item name="slug" label="Slug (URL)" rules={[{ required: true }]}>
                                <Input prefix={<LinkOutlined />} />
                            </Form.Item>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item name="sku" label="SKU">
                                        <Input />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="category_id" label="Danh mục" rules={[{ required: true }]}>
                                        <Select options={categoryOptions} showSearch filterOption={(i, o) => (o?.label ?? '').toLowerCase().includes(i.toLowerCase())} />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Form.Item name="brand_id" label="Thương hiệu">
                                <Select options={brandOptions} allowClear showSearch filterOption={(i, o) => (o?.label ?? '').toLowerCase().includes(i.toLowerCase())} />
                            </Form.Item>
                            <Form.Item name="description" label="Mô tả ngắn">
                                <TextArea rows={3} />
                            </Form.Item>
                            <Form.Item name="content" label="Nội dung chi tiết">
                                <TextArea rows={6} />
                            </Form.Item>
                        </Card>
                        <Card title="SEO">
                            <Form.Item name="meta_title" label="Meta Title">
                                <Input />
                            </Form.Item>
                            <Form.Item name="meta_description" label="Meta Description">
                                <TextArea rows={2} maxLength={160} showCount />
                            </Form.Item>
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card title="Giá & Kho hàng" style={{ marginBottom: 16 }}>
                            <Form.Item name="price" label="Giá bán" rules={[{ required: true }]}>
                                <InputNumber
                                    style={{ width: '100%' }} min={0}
                                    formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                    addonAfter="₫"
                                />
                            </Form.Item>
                            <Form.Item name="sale_price" label="Giá khuyến mãi">
                                <InputNumber
                                    style={{ width: '100%' }} min={0}
                                    formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
                                    addonAfter="₫"
                                />
                            </Form.Item>
                            <Form.Item name="quantity" label="Số lượng tồn kho">
                                <InputNumber style={{ width: '100%' }} min={0} />
                            </Form.Item>
                        </Card>
                        <Card title="Trạng thái">
                            <Form.Item name="is_active" label="Hiển thị sản phẩm" valuePropName="checked">
                                <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
                            </Form.Item>
                            <Form.Item name="is_featured" label="Sản phẩm nổi bật" valuePropName="checked">
                                <Switch checkedChildren="⭐ Có" unCheckedChildren="Không" />
                            </Form.Item>
                        </Card>
                    </Col>
                </Row>
            ),
        },
        {
            key: 'images',
            label: <span><PictureOutlined />Hình ảnh ({existingImages.length + newImages.length})</span>,
            children: (
                <Card>
                    <div style={{ marginBottom: 16 }}>
                        <Text strong>Thêm ảnh mới</Text>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                            Chọn ảnh sản phẩm từ máy tính. Ảnh sẽ được thêm ngay khi bấm Lưu sản phẩm.
                        </Text>
                        <Upload
                            accept="image/*"
                            multiple
                            showUploadList={false}
                            beforeUpload={(file) => { handleGalleryUpload(file); return false; }}
                        >
                            <Button type="primary" icon={<UploadOutlined />}>Chọn ảnh tải lên</Button>
                        </Upload>
                    </div>

                    <Divider />

                    {allDisplayImages.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                            <PictureOutlined style={{ fontSize: 40, marginBottom: 12 }} />
                            <div>Chưa có ảnh</div>
                        </div>
                    ) : (
                        <Row gutter={[12, 12]}>
                            {allDisplayImages.map((img) => (
                                <Col key={img._key} span={6}>
                                    <div style={{
                                        border: img.is_primary ? '2px solid #1677ff' : '2px solid #f0f0f0',
                                        borderRadius: 8, overflow: 'hidden', background: '#fafafa',
                                    }}>
                                        <img
                                            src={img.image_url || `http://localhost:8000/storage/${img.image_path}`}
                                            alt="" style={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }}
                                            onError={(e) => { (e.target as any).src = 'https://placehold.co/300x200?text=Error'; }}
                                        />
                                        {(img as any).isExisting === false && (
                                            <div style={{ padding: '2px 8px', background: '#e6f7ff', fontSize: 11, color: '#1677ff' }}>
                                                Chờ lưu
                                            </div>
                                        )}
                                        <div style={{ padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            {img.is_primary ? (
                                                <Tag color="blue" style={{ borderRadius: 10 }}>✓ Ảnh thumbnail</Tag>
                                            ) : (
                                                <Button size="small" onClick={() => {
                                                    if ((img as any).isExisting) setExistingPrimary(img.id);
                                                    else setNewPrimary(img._key);
                                                }}>
                                                    Đặt là thumbnail
                                                </Button>
                                            )}
                                            <Button
                                                danger size="small" type="text" icon={<DeleteOutlined />}
                                                onClick={() => {
                                                    if ((img as any).isExisting) removeExistingImage(img.id);
                                                    else removeNewImage(img._key);
                                                }}
                                            />
                                        </div>
                                    </div>
                                </Col>
                            ))}
                        </Row>
                    )}
                </Card>
            ),
        },
        {
            key: 'variants',
            label: <span><TagsOutlined />Biến thể ({variants.length})</span>,
            children: (
                <div>
                    <Card
                        title={<><TagsOutlined style={{ color: '#1677ff' }} /> Quản lý biến thể</>}
                        extra={
                            <Space>
                                <Button
                                    type="primary" icon={<ThunderboltOutlined />}
                                    style={{ background: '#fa8c16', borderColor: '#fa8c16' }}
                                    onClick={() => { setShowBuilder(prev => !prev); setSelectedAttrs([]); }}
                                >
                                    {showBuilder ? 'Đóng bộ tạo biến thể' : 'Tạo biến thể mới'}
                                </Button>
                                <Button icon={<PlusOutlined />} onClick={() => setVariants(prev => [...prev, {
                                    _key: `var-manual-${Date.now()}`, attribute_ids: [], label: 'Biến thể mới',
                                    sku: '', price: 0, sale_price: null, quantity: 0, image: '', is_active: true, _isNew: true,
                                }])}>
                                    Thêm thủ công
                                </Button>
                            </Space>
                        }
                    >
                        {showBuilder && (
                            <div style={{ background: '#f0f7ff', border: '1px dashed #1677ff', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                                <Title level={5} style={{ marginBottom: 12 }}>
                                    <ThunderboltOutlined style={{ color: '#fa8c16' }} /> Bộ tạo biến thể tự động
                                </Title>

                                <Space style={{ marginBottom: 12 }}>
                                    <Select
                                        placeholder="Chọn nhóm thuộc tính..." style={{ width: 220 }}
                                        value={addGroupId} onChange={v => setAddGroupId(v)}
                                        options={attrGroups.filter(g => !selectedAttrs.some(a => a.groupId === g.id)).map(g => ({ value: g.id, label: g.display_name || g.name }))}
                                    />
                                    <Button type="default" onClick={addAttrGroup} icon={<PlusOutlined />}>Thêm nhóm</Button>
                                </Space>

                                {selectedAttrs.length === 0 ? (
                                    <Text type="secondary">Chọn nhóm thuộc tính và các giá trị cần tạo biến thể</Text>
                                ) : (
                                    <Space direction="vertical" style={{ width: '100%', marginBottom: 12 }}>
                                        {selectedAttrs.map(group => (
                                            <Card
                                                key={group.groupId} size="small"
                                                title={<Text strong>{group.groupName}</Text>}
                                                extra={
                                                    <Button danger size="small" type="text" icon={<DeleteOutlined />} onClick={() => removeAttrGroupFromBuilder(group.groupId)}>
                                                        Xóa
                                                    </Button>
                                                }
                                            >
                                                <Space wrap>
                                                    {attrGroups.find(g => g.id === group.groupId)?.attributes.map(attr => {
                                                        const sel = group.values.some(v => v.id === attr.id);
                                                        return (
                                                            <Tag
                                                                key={attr.id}
                                                                color={sel ? 'blue' : 'default'}
                                                                style={{ cursor: 'pointer', borderRadius: 20, padding: '2px 12px', fontSize: 13, border: sel ? '1.5px solid #1677ff' : '1.5px solid #d9d9d9' }}
                                                                onClick={() => toggleAttrValue(group.groupId, attr)}
                                                            >
                                                                {attr.color_code && <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: '50%', background: attr.color_code, marginRight: 6, border: '1px solid #ccc' }} />}
                                                                {attr.value}
                                                            </Tag>
                                                        );
                                                    })}
                                                </Space>
                                            </Card>
                                        ))}
                                    </Space>
                                )}

                                <Button
                                    type="primary" icon={<ThunderboltOutlined />}
                                    style={{ background: '#fa8c16', borderColor: '#fa8c16' }}
                                    onClick={generateNewVariants}
                                    disabled={selectedAttrs.every(a => a.values.length === 0)}
                                >
                                    Tạo biến thể tự động
                                </Button>
                            </div>
                        )}

                        {variants.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                                <TagsOutlined style={{ fontSize: 40, marginBottom: 12 }} />
                                <div>Sản phẩm chưa có biến thể nào</div>
                            </div>
                        ) : (
                            <>
                                {variants.some(v => v._isNew) && (
                                    <Alert
                                        message="Có biến thể mới chưa lưu. Bấm nút 💾 ở từng biến thể để lưu, hoặc bấm 'Lưu sản phẩm' để lưu tất cả."
                                        type="warning" showIcon style={{ marginBottom: 12 }}
                                    />
                                )}
                                <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                                    {variants.length} biến thể · Chỉnh sửa trực tiếp rồi bấm 💾 để lưu từng biến thể
                                </Text>
                                <Table
                                    columns={variantColumns}
                                    dataSource={variants}
                                    rowKey="_key"
                                    pagination={false}
                                    size="small"
                                    scroll={{ x: 1000 }}
                                    bordered
                                    rowClassName={(r) => r._isNew ? 'row-new-variant' : ''}
                                />
                            </>
                        )}
                    </Card>
                </div>
            ),
        },
    ];

    if (pageLoading) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
                <Spin size="large" tip="Đang tải sản phẩm..." />
            </div>
        );
    }

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Space>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/products')}>
                        Quay lại
                    </Button>
                    <Title level={4} style={{ margin: 0 }}>
                        <ShoppingOutlined style={{ marginRight: 8, color: '#1677ff' }} />
                        Chỉnh sửa sản phẩm
                    </Title>
                </Space>
                <Button
                    type="primary" loading={submitting} onClick={handleSave}
                    style={{ background: 'linear-gradient(135deg,#1677ff,#0958d9)', border: 'none', borderRadius: 8, height: 38, fontWeight: 600 }}
                >
                    Lưu sản phẩm
                </Button>
            </div>

            <Form form={form} layout="vertical">
                <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} type="card" size="large" />
            </Form>

            <style>{`
                .row-new-variant { background: #f6ffed; }
                .row-new-variant:hover > td { background: #f6ffed !important; }
            `}</style>
        </div>
    );
};

export default ProductEdit;
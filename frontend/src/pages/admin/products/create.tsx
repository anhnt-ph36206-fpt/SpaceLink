import React, { useEffect, useState, useCallback } from 'react';
import {
    Form, Input, InputNumber, Switch, Button, Row, Col,
    Typography, Select, Card, Tabs, Tag, Space, Divider,
    Popconfirm, Table, Tooltip, Upload, Modal, TreeSelect, Alert,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import {
    ShoppingOutlined, PlusOutlined, DeleteOutlined,
    ArrowLeftOutlined, LinkOutlined,
    PictureOutlined, TagsOutlined, UploadOutlined, CloseCircleOutlined
} from '@ant-design/icons';
import MDEditor from '@uiw/react-md-editor';
import { axiosInstance } from '../../../api/axios';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { productPrefix, categoryPrefix, brandPrefix, attributeGroupPrefix } from '../../../api/apiAdminPrefix';

const { Title, Text } = Typography;
const { TextArea } = Input;

/* ─────────────────────────── Types ─────────────────────────── */
interface AttrValue { id: number; value: string; color_code?: string }
interface AttrGroup { id: number; name: string; display_name?: string; attributes: AttrValue[] }

interface SelectedAttr { groupId: number; groupName: string; values: AttrValue[] }

interface VariantRow {
    _key: string;
    attribute_ids: number[];
    label: string; // purely for display
    sku: string;
    price: number;
    sale_price: number | null;
    quantity: number;
    imageFile?: File;
    imagePreviewUrl?: string;
    is_active: boolean;
}

interface GalleryImage {
    _key: string;
    file: File;
    previewUrl: string;
    is_primary: boolean;
}

/* ─────────────────────────── Helpers ─────────────────────────── */
function slugify(str: string) {
    return str
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'd')
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim();
}

// Cartesian product of arrays
function cartesian<T>(arrays: T[][]): T[][] {
    return arrays.reduce<T[][]>(
        (acc, arr) => acc.flatMap(a => arr.map(b => [...a, b])),
        [[]]
    );
}

function buildVariantLabel(attrs: any[]): string {
    return attrs.map(a => a.value).join(' / ') || 'Không có thuộc tính';
}

function hasDuplicateVariants(variantList: VariantRow[]): boolean {
    const attributeSets = new Set<string>();
    for (const v of variantList) {
        // Sort IDs to ensure order doesn't matter (e.g., [1,2] is same as [2,1])
        const key = [...v.attribute_ids].sort((a, b) => a - b).join(',');
        if (attributeSets.has(key)) return true;
        attributeSets.add(key);
    }
    return false;
}

/* ─────────────────────────── Component ─────────────────────────── */const removeAccents = (str: string) => {
    return str.normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/đ/g, 'd').replace(/Đ/g, 'D')
        .replace(/\s+/g, '-')
        .toUpperCase();
};

const ProductCreate: React.FC = () => {
    const [form] = Form.useForm();
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState('info');

    // Options
    const [categoryOptions, setCategoryOptions] = useState<any[]>([]);
    const [brandOptions, setBrandOptions] = useState<any[]>([]);
    const [attrGroups, setAttrGroups] = useState<AttrGroup[]>([]);

    // Gallery
    const [gallery, setGallery] = useState<GalleryImage[]>([]);

    // MDEditor content
    const [contentValue, setContentValue] = useState<string>('');

    // Variant builder
    const [selectedAttrs, setSelectedAttrs] = useState<SelectedAttr[]>([]);
    const [variants, setVariants] = useState<VariantRow[]>([]);
    const [addGroupId, setAddGroupId] = useState<number | null>(null);

    // Attribute groups currently active for this product's variants
    const [variantGroups, setVariantGroups] = useState<number[]>([]);

    // Quick add attribute group
    const [attrModalVisible, setAttrModalVisible] = useState(false);
    const [attrModalLoading, setAttrModalLoading] = useState(false);
    const [attrForm] = Form.useForm();

    const handleQuickAddAttrGroup = async () => {
        try {
            const values = await attrForm.validateFields();
            setAttrModalLoading(true);

            // Convert newline-separated attributes string to array
            const attrValues = values.attributes.split('\n')
                .map((v: string) => v.trim())
                .filter((v: string) => v !== '')
                .map((v: string) => ({ value: v }));

            if (attrValues.length === 0) {
                toast.warning('Vui lòng nhập ít nhất một giá trị thuộc tính');
                setAttrModalLoading(false);
                return;
            }

            const res = await axiosInstance.post(attributeGroupPrefix, {
                name: values.name,
                display_name: values.display_name || values.name,
                attributes: attrValues
            });

            const newGroup = res.data.data;
            setAttrGroups(prev => [...prev, newGroup]);

            // Automatically select the new group
            setSelectedAttrs(prev => [...prev, {
                groupId: newGroup.id,
                groupName: newGroup.display_name || newGroup.name,
                values: []
            }]);

            toast.success('Đã tạo nhóm thuộc tính mới');
            setAttrModalVisible(false);
            attrForm.resetFields();
        } catch (err: any) {
            toast.error(err?.response?.data?.message || 'Không thể tạo nhóm thuộc tính');
        } finally {
            setAttrModalLoading(false);
        }
    };

    /* ── Load options ── */
    useEffect(() => {
        const load = async () => {
            try {
                const [catRes, brandRes, attrRes] = await Promise.all([
                    axiosInstance.get(`${categoryPrefix}`, { params: { all: 1 } }),
                    axiosInstance.get(`${brandPrefix}`, { params: { all: 1 } }),
                    axiosInstance.get(`${attributeGroupPrefix}`, { params: { all: 1 } }),
                ]);
                const buildTree = (data: any[]) => {
                    const map = new Map<number, any>();
                    const roots: any[] = [];
                    data.forEach(item => {
                        map.set(item.id, {
                            key: item.id,
                            value: item.id,
                            title: item.name,
                            children: [],
                            selectable: true
                        });
                    });
                    data.forEach(item => {
                        if (item.parent_id && map.has(item.parent_id)) {
                            const parent = map.get(item.parent_id);
                            parent.children.push(map.get(item.id));
                            parent.selectable = false;
                        } else if (!item.parent_id) {
                            roots.push(map.get(item.id));
                        }
                    });
                    return roots;
                };
                setCategoryOptions(buildTree(catRes.data.data));
                setBrandOptions(brandRes.data.data.map((b: any) => ({ value: b.id, label: b.name })));
                console.log(attrRes.data.data)
                setAttrGroups(attrRes.data.data);
            } catch { toast.error('Không tải được dữ liệu cần thiết'); }
        };
        load();
    }, []);

    /* ── Auto slug ── */
    const handleNameChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        form.setFieldValue('slug', slugify(e.target.value));
    }, [form]);

    /* ───────────────── Gallery helpers ───────────────── */
    const handleGalleryUpload = (file: File) => {
        const previewUrl = URL.createObjectURL(file);
        setGallery(prev => {
            const isPrimary = prev.length === 0;
            return [...prev, { _key: `img-${Date.now()}-${Math.random()}`, file, previewUrl, is_primary: isPrimary }];
        });
        return false; // Prevent auto upload
    };

    const removeImage = (key: string) => {
        setGallery(prev => {
            const next = prev.filter(i => i._key !== key);
            if (next.length > 0 && !next.some(i => i.is_primary)) {
                next[0].is_primary = true;
            }
            return next;
        });
    };

    const setPrimary = (key: string) => {
        setGallery(prev => prev.map(i => ({ ...i, is_primary: i._key === key })));
    };

    /* ───────────────── Variant builder helpers ───────────────── */
    const addGroupToVariants = (groupId: number) => {
        if (!variantGroups.includes(groupId)) {
            setVariantGroups(prev => [...prev, groupId]);
        }
    };

    const removeGroupFromVariants = (groupId: number) => {
        setVariantGroups(prev => prev.filter(id => id !== groupId));
    };

    // Helper to get attribute group object
    const getGroupById = (id: number) => attrGroups.find(g => g.id === id);

    const addAttrGroup = () => {
        if (!addGroupId) return;
        const group = attrGroups.find(g => g.id === addGroupId);
        if (!group) return;
        if (selectedAttrs.some(a => a.groupId === addGroupId)) {
            toast.warning('Nhóm thuộc tính này đã được thêm');
            return;
        }
        setSelectedAttrs(prev => [...prev, { groupId: group.id, groupName: group.display_name || group.name, values: [] }]);
        addGroupToVariants(group.id); // Also add to active groups
        setAddGroupId(null);
    };

    const removeAttrGroup = (groupId: number) => {
        setSelectedAttrs(prev => prev.filter(a => a.groupId !== groupId));
        // We don't necessarily remove it from variantGroups here unless user explicitly closes it
    };

    const toggleAttrValue = (groupId: number, attr: AttrValue) => {
        setSelectedAttrs(prev => prev.map(a => {
            if (a.groupId !== groupId) return a;
            const already = a.values.some(v => v.id === attr.id);
            return { ...a, values: already ? a.values.filter(v => v.id !== attr.id) : [...a.values, attr] };
        }));
    };

    const generateVariants = () => {
        const groups = selectedAttrs.filter(a => a.values.length > 0);
        if (groups.length === 0) { toast.warning('Chọn ít nhất 1 giá trị thuộc tính'); return; }

        const combos = cartesian(groups.map(g => g.values));

        const productPrice = form.getFieldValue('price') || 0;
        const productSku = form.getFieldValue('sku') || '';

        const newVariants: VariantRow[] = combos.map((combo) => {
            const attrLabel = combo.map(v => v.value).join(' / ');
            const attrSkuPart = combo.map(v => removeAccents(v.value)).join('-');
            return {
                _key: `var-${Date.now()}-${Math.random()}`,
                attribute_ids: combo.map(v => v.id),
                label: attrLabel,
                sku: productSku ? `${productSku}-${attrSkuPart}` : attrSkuPart,
                price: productPrice,
                sale_price: null,
                quantity: 0,
                imageFile: undefined,
                imagePreviewUrl: undefined,
                is_active: true,
            };
        });

        setVariants(newVariants);
        toast.success(`Đã tạo ${newVariants.length} biến thể`);
    };

    const updateVariant = (key: string, field: keyof VariantRow, value: any) => {
        setVariants(prev => prev.map(v => v._key === key ? { ...v, [field]: value } : v));
    };

    const removeVariant = (key: string) => {
        setVariants(prev => prev.filter(v => v._key !== key));
    };

    const addManualVariant = () => {
        const productPrice = form.getFieldValue('price') || 0;
        const productSku = form.getFieldValue('sku') || '';
        setVariants(prev => [...prev, {
            _key: `var-${Date.now()}`,
            attribute_ids: [],
            label: 'Biến thể mới',
            sku: productSku,
            price: productPrice,
            sale_price: null,
            quantity: 0,
            imageFile: undefined,
            imagePreviewUrl: undefined,
            is_active: true,
        }]);
    };

    /* ───────────────── Submit ───────────────── */
    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();

            // Validate duplicate variants
            if (variants.length > 0 && hasDuplicateVariants(variants)) {
                toast.error('Có các biến thể bị trùng lặp bộ thuộc tính. Vui lòng kiểm tra lại!');
                setActiveTab('variants');
                return;
            }

            // Validate: tổng SL biến thể = SL tồn kho (nếu có biến thể)
            if (variants.length > 0) {
                const totalStock = Number(values.quantity) || 0;
                const totalVariantQty = variants.reduce((sum, v) => sum + (v.quantity || 0), 0);
                if (totalVariantQty !== totalStock) {
                    toast.error(
                        `Tổng số lượng biến thể (${totalVariantQty}) phải bằng số lượng tồn kho (${totalStock}). Vui lòng kiểm tra lại!`,
                        { autoClose: 5000 }
                    );
                    setActiveTab('variants');
                    return;
                }
            }

            setSubmitting(true);

            // Gửi 1 FormData duy nhất chứa: product fields + images[] + variants[]
            const fd = new FormData();

            // ── Product fields ──
            Object.entries(values).forEach(([key, val]) => {
                if (key === 'content') return; // handled separately
                if (val === null || val === undefined) return;
                fd.append(key, typeof val === 'boolean' ? (val ? '1' : '0') : String(val));
            });
            // Append markdown content
            fd.append('content', contentValue || '');

            // ── Gallery images ──
            gallery.forEach((img, index) => {
                fd.append(`images[${index}][file]`, img.file);
                fd.append(`images[${index}][is_primary]`, img.is_primary ? '1' : '0');
                fd.append(`images[${index}][display_order]`, '0');
            });

            // ── Variants ──
            variants.forEach((v, index) => {
                fd.append(`variants[${index}][price]`, v.price.toString());
                fd.append(`variants[${index}][quantity]`, v.quantity.toString());
                fd.append(`variants[${index}][is_active]`, v.is_active ? '1' : '0');
                if (v.sku) fd.append(`variants[${index}][sku]`, v.sku);
                if (v.sale_price !== null && v.sale_price !== undefined) {
                    fd.append(`variants[${index}][sale_price]`, v.sale_price.toString());
                }
                if (v.imageFile) {
                    fd.append(`variants[${index}][image]`, v.imageFile);
                }
                v.attribute_ids.forEach(attrId => {
                    fd.append(`variants[${index}][attribute_ids][]`, attrId.toString());
                });
            });

            await axiosInstance.post(productPrefix, fd, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            toast.success('Tạo sản phẩm thành công!');
            navigate('/admin/products');
        } catch (error: any) {
            if (error?.response?.data?.errors) {
                const firstError = Object.values(error.response.data.errors)[0];
                toast.error(Array.isArray(firstError) ? firstError[0] : String(firstError));
            } else if (error?.response?.data?.message) {
                toast.error(error.response.data.message);
            } else if (error?.errorFields) {
                setActiveTab('info');
                toast.error('Vui lòng điền đầy đủ thông tin bắt buộc');
            } else {
                toast.error('Có lỗi xảy ra');
            }
        } finally {
            setSubmitting(false);
        }
    };

    /* ───────────────── Variants table columns ───────────────── */
    const variantColumns: ColumnsType<VariantRow> = [
        ...variantGroups.map(groupId => {
            const group = getGroupById(groupId);
            return {
                title: group?.display_name || group?.name || 'Thuộc tính',
                width: 140,
                render: (_: any, r: VariantRow) => (
                    <Select
                        placeholder="Chọn..."
                        style={{ width: '100%' }}
                        size="small"
                        value={r.attribute_ids.find(aid => group?.attributes.some(a => a.id === aid))}
                        onChange={val => {
                            const others = r.attribute_ids.filter(aid => !group?.attributes.some(a => a.id === aid));
                            const nextIds = val ? [...others, val] : others;
                            updateVariant(r._key, 'attribute_ids', nextIds);
                            
                            // Update label automatically
                            const updatedAttrs: any[] = [];
                            nextIds.forEach(id => {
                                for(const g of attrGroups) {
                                    const found = g.attributes.find(a => a.id === id);
                                    if(found) updatedAttrs.push(found);
                                }
                            });
                            updateVariant(r._key, 'label', buildVariantLabel(updatedAttrs));
                        }}
                        options={group?.attributes.map(a => ({ value: a.id, label: a.value }))}
                        allowClear
                    />
                )
            };
        }),
        {
            title: 'SKU',
            width: 150,
            render: (_, r) => (
                <Input
                    value={r.sku} size="small" placeholder="SKU biến thể"
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
            render: (_, r) => (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    {r.imagePreviewUrl && (
                        <div style={{ position: 'relative' }}>
                            <img src={r.imagePreviewUrl} alt="Variant" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, border: '1px solid #ddd' }} />
                            <CloseCircleOutlined
                                style={{ position: 'absolute', top: -6, right: -6, color: '#ff4d4f', cursor: 'pointer', background: 'white', borderRadius: '50%' }}
                                onClick={() => {
                                    updateVariant(r._key, 'imageFile', undefined);
                                    updateVariant(r._key, 'imagePreviewUrl', undefined);
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
                        {!r.imagePreviewUrl && <Button size="small" icon={<UploadOutlined />}>Đổi</Button>}
                    </Upload>
                </div>
            ),
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
            title: '',
            width: 48,
            render: (_, r) => (
                <Tooltip title="Xóa biến thể">
                    <Popconfirm title="Xóa biến thể này?" onConfirm={() => removeVariant(r._key)} okText="Xóa" cancelText="Hủy">
                        <Button danger size="small" type="text" icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Tooltip>
            ),
        },
    ];

    /* ───────────────── Tabs items ───────────────── */
    const tabItems = [
        {
            key: 'info',
            label: <span><ShoppingOutlined />Thông tin</span>,
            children: (
                <Row gutter={24}>
                    <Col span={16}>
                        <Card title="Thông tin cơ bản" style={{ marginBottom: 16 }}>
                            <Form.Item name="name" label="Tên sản phẩm" rules={[{ required: true, message: 'Nhập tên sản phẩm' }]}>
                                <Input placeholder="VD: Áo thun polo nam" onChange={handleNameChange} />
                            </Form.Item>
                            <Form.Item name="slug" label="Slug (URL)" rules={[{ required: true, message: 'Nhập slug' }]}>
                                <Input prefix={<LinkOutlined />} placeholder="ao-thun-polo-nam" />
                            </Form.Item>
                            <Row gutter={16}>
                                <Col span={12}>
                                    <Form.Item name="sku" label="SKU (Mã sản phẩm)">
                                        <Input placeholder="VD: POLO-001" />
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item name="category_id" label="Danh mục" rules={[{ required: true, message: 'Chọn danh mục' }]}>
                                        <TreeSelect
                                            showSearch
                                            style={{ width: '100%' }}
                                            dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                                            placeholder="Chọn danh mục"
                                            allowClear
                                            treeDefaultExpandAll
                                            treeData={categoryOptions}
                                            filterTreeNode={(search, item) =>
                                                (item?.title ?? '').toString().toLowerCase().indexOf(search.toLowerCase()) >= 0
                                            }
                                        />
                                    </Form.Item>
                                </Col>
                            </Row>
                            <Form.Item name="brand_id" label="Thương hiệu">
                                <Select placeholder="Chọn thương hiệu (không bắt buộc)" options={brandOptions} allowClear showSearch filterOption={(i, o) => (o?.label ?? '').toLowerCase().includes(i.toLowerCase())} />
                            </Form.Item>
                            <Form.Item name="description" label="Mô tả ngắn">
                                <TextArea rows={3} placeholder="Mô tả ngắn gọn về sản phẩm..." />
                            </Form.Item>
                            <Form.Item label="Nội dung chi tiết (Markdown)">
                                <div data-color-mode="light">
                                    <MDEditor
                                        value={contentValue}
                                        onChange={v => setContentValue(v || '')}
                                        height={300}
                                        preview="live"
                                    />
                                </div>
                            </Form.Item>
                        </Card>
                        <Card title="SEO">
                            <Form.Item name="meta_title" label="Meta Title">
                                <Input placeholder="Tiêu đề SEO (nếu khác tên SP)" />
                            </Form.Item>
                            <Form.Item name="meta_description" label="Meta Description">
                                <TextArea rows={2} placeholder="Mô tả SEO (tối đa 160 ký tự)" maxLength={160} showCount />
                            </Form.Item>
                        </Card>
                    </Col>
                    <Col span={8}>
                        <Card title="Giá & Kho hàng" style={{ marginBottom: 16 }}>
                            <Form.Item name="price" label="Giá bán" rules={[{ required: true, message: 'Nhập giá' }]}>
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
                            <Form.Item
                                name="quantity"
                                label="Số lượng tồn kho"
                                rules={[{ required: true, message: 'Nhập số lượng tồn kho' }]}
                                extra={variants.length > 0
                                    ? `Tổng biến thể: ${variants.reduce((s, v) => s + (v.quantity || 0), 0)} / ${form.getFieldValue('quantity') ?? 0}`
                                    : undefined
                                }
                            >
                                <InputNumber style={{ width: '100%' }} min={0} />
                            </Form.Item>
                        </Card>
                        <Card title="Trạng thái">
                            <Form.Item name="is_active" label="Hiển thị sản phẩm" valuePropName="checked" initialValue={true}>
                                <Switch checkedChildren="Bật" unCheckedChildren="Tắt" defaultChecked />
                            </Form.Item>
                            <Form.Item name="is_featured" label="Sản phẩm nổi bật" valuePropName="checked" initialValue={false}>
                                <Switch checkedChildren="⭐ Có" unCheckedChildren="Không" />
                            </Form.Item>
                        </Card>
                    </Col>
                </Row>
            ),
        },
        {
            key: 'images',
            label: <span><PictureOutlined />Hình ảnh ({gallery.length})</span>,
            children: (
                <Card>
                    <div style={{ marginBottom: 16 }}>
                        <Text strong>Thêm ảnh sản phẩm</Text>
                        <Text type="secondary" style={{ display: 'block', marginBottom: 8 }}>
                            Chọn ảnh sản phẩm từ máy tính. Ảnh đầu tiên sẽ mặc định là ảnh chính.
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

                    {gallery.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                            <PictureOutlined style={{ fontSize: 40, marginBottom: 12 }} />
                            <div>Chưa có ảnh nào. Bấm nút Tải lên để thêm ảnh.</div>
                        </div>
                    ) : (
                        <Row gutter={[12, 12]}>
                            {gallery.map((img) => (
                                <Col key={img._key} span={6}>
                                    <div style={{
                                        border: img.is_primary ? '2px solid #1677ff' : '2px solid #f0f0f0',
                                        borderRadius: 8, overflow: 'hidden', position: 'relative',
                                        background: '#fafafa',
                                    }}>
                                        <img
                                            src={img.previewUrl} alt=""
                                            style={{ width: '100%', height: 150, objectFit: 'cover', display: 'block' }}
                                        />
                                        <div style={{ padding: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            {img.is_primary ? (
                                                <Tag color="blue" style={{ borderRadius: 10 }}>✓ Ảnh thumbnail</Tag>
                                            ) : (
                                                <Button size="small" onClick={() => setPrimary(img._key)}>Đặt thành thumbnail</Button>
                                            )}
                                            <Button
                                                danger size="small" type="text"
                                                icon={<DeleteOutlined />}
                                                onClick={() => removeImage(img._key)}
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
                                    type="primary" icon={<PlusOutlined />}
                                    style={{ background: '#fa8c16', borderColor: '#fa8c16' }}
                                    onClick={generateVariants}
                                >
                                    Tạo tự động
                                </Button>
                                <Button icon={<PlusOutlined />} onClick={addManualVariant}>
                                    Thêm lẻ
                                </Button>
                            </Space>
                        }
                    >
                        <div style={{ background: '#f0f7ff', border: '1px dashed #1677ff', borderRadius: 8, padding: 16, marginBottom: 16 }}>
                            <Title level={5} style={{ marginBottom: 12 }}>Bộ tạo biến thể</Title>
                            <Space style={{ marginBottom: 12 }} wrap>
                                <Select
                                    placeholder="Chọn nhóm thuộc tính thêm vào..." style={{ width: 300 }}
                                    value={addGroupId} onChange={v => setAddGroupId(v)}
                                    options={attrGroups.map(g => ({ 
                                        value: g.id, 
                                        label: g.display_name || g.name,
                                        disabled: selectedAttrs.some(a => a.groupId === g.id)
                                    }))}
                                />
                                <Button type="default" onClick={addAttrGroup} icon={<PlusOutlined />}>Thêm vào bộ sinh</Button>
                                <Button type="dashed" onClick={() => setAttrModalVisible(true)} icon={<PlusOutlined />}>Tạo nhóm mới</Button>
                            </Space>

                            <div style={{ marginBottom: 12 }}>
                                <Text type="secondary">Cấu trúc biến thể hiện tại: </Text>
                                {variantGroups.length === 0 ? <Tag>Chưa có</Tag> : variantGroups.map(gid => (
                                    <Tag key={gid} color="blue" closable onClose={() => removeGroupFromVariants(gid)}>
                                        {getGroupById(gid)?.display_name || getGroupById(gid)?.name}
                                    </Tag>
                                ))}
                            </div>

                            {selectedAttrs.length > 0 && (
                                <Space direction="vertical" style={{ width: '100%', marginBottom: 12 }}>
                                    {selectedAttrs.map(group => (
                                        <Card
                                            key={group.groupId} size="small"
                                            title={<Text strong>{group.groupName}</Text>}
                                            extra={<Button danger size="small" type="text" icon={<DeleteOutlined />} onClick={() => removeAttrGroup(group.groupId)}>Xóa</Button>}
                                        >
                                            <Space wrap>
                                                {attrGroups.find(g => g.id === group.groupId)?.attributes.map(attr => {
                                                    const sel = group.values.some(v => v.id === attr.id);
                                                    return (
                                                        <Tag
                                                            key={attr.id}
                                                            color={sel ? 'blue' : 'default'}
                                                            style={{ cursor: 'pointer', borderRadius: 20, padding: '2px 12px', border: sel ? '1.5px solid #1677ff' : '1.5px solid #d9d9d9' }}
                                                            onClick={() => toggleAttrValue(group.groupId, attr)}
                                                        >
                                                            {attr.value}
                                                        </Tag>
                                                    );
                                                })}
                                            </Space>
                                        </Card>
                                    ))}
                                </Space>
                            )}
                        </div>

                        {variants.length > 0 ? (
                            <>
                                <div style={{ marginBottom: 8 }}>
                                    {(() => {
                                        const totalStock = form.getFieldValue('quantity') ?? 0;
                                        const totalVariantQty = variants.reduce((s, v) => s + (v.quantity || 0), 0);
                                        const match = totalVariantQty === Number(totalStock);
                                        return (
                                            <Alert
                                                type={match ? 'success' : 'warning'}
                                                showIcon
                                                style={{ marginBottom: 8 }}
                                                message={
                                                    match
                                                        ? `✓ Tổng số lượng biến thể khớp với tồn kho: ${totalVariantQty}`
                                                        : `Tổng số lượng biến thể: ${totalVariantQty} / Tồn kho: ${totalStock} — Cần điều chỉnh để khớp`
                                                }
                                            />
                                        );
                                    })()}
                                    <Text type="secondary">
                                        {variants.length} biến thể · Chỉnh sửa trực tiếp trong bảng
                                    </Text>
                                </div>
                                <Table
                                    columns={variantColumns}
                                    dataSource={variants}
                                    rowKey="_key"
                                    pagination={false}
                                    size="small"
                                    scroll={{ x: 900 }}
                                />
                            </>
                        ) : (
                            <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
                                <TagsOutlined style={{ fontSize: 40, marginBottom: 12 }} />
                                <div>Chưa có biến thể nào được tạo</div>
                            </div>
                        )}
                    </Card>
                </div>
            ),
        },
    ];

    return (
        <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Space>
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/admin/products')}>
                        Quay lại
                    </Button>
                    <Title level={4} style={{ margin: 0 }}>
                        <ShoppingOutlined style={{ marginRight: 8, color: '#1677ff' }} />
                        Thêm sản phẩm mới
                    </Title>
                </Space>
                <Space>
                    <Button onClick={() => navigate('/admin/products')}>Hủy</Button>
                    <Button
                        type="primary"
                        loading={submitting}
                        onClick={handleSubmit}
                        style={{ background: 'linear-gradient(135deg,#1677ff,#0958d9)', border: 'none', borderRadius: 8, height: 38, fontWeight: 600 }}
                    >
                        Lưu sản phẩm
                    </Button>
                </Space>
            </div>

            <Form form={form} layout="vertical">
                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={tabItems}
                    type="card"
                    size="large"
                />
            </Form>

            {/* Quick Add Attribute Group Modal */}
            <Modal
                title="Tạo nhóm thuộc tính nhanh"
                open={attrModalVisible}
                onOk={handleQuickAddAttrGroup}
                onCancel={() => setAttrModalVisible(false)}
                confirmLoading={attrModalLoading}
                destroyOnClose
            >
                <Form form={attrForm} layout="vertical">
                    <Form.Item name="name" label="Tên nhóm (Kỹ thuật)" rules={[{ required: true, message: 'VD: color, size' }]}>
                        <Input placeholder="color" />
                    </Form.Item>
                    <Form.Item name="display_name" label="Tên hiển thị" rules={[{ required: true, message: 'VD: Màu sắc, Kích thước' }]}>
                        <Input placeholder="Màu sắc" />
                    </Form.Item>
                    <Form.Item name="attributes" label="Các giá trị (Mỗi dòng 1 giá trị)" rules={[{ required: true, message: 'Nhập ít nhất 1 giá trị' }]}>
                        <TextArea rows={5} placeholder="Đỏ&#10;Xanh&#10;Vàng" />
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
};

export default ProductCreate;
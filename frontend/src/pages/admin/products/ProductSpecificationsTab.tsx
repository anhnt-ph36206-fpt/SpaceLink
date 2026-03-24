import React, { useEffect, useState } from 'react';
import { Form, Input, Button, Card, Row, Col, Typography, Space, Spin, Empty } from 'antd';
import { SaveOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { axiosInstance } from '../../../api/axios';
import { toast } from 'react-toastify';
import { productPrefix } from '../../../api/apiAdminPrefix';

const { Title, Text } = Typography;

interface Specification {
    id: number;
    name: string;
    display_order: number;
}

interface SpecificationGroup {
    id: number;
    name: string;
    display_order: number;
    specifications: Specification[];
}

interface ProductSpecification {
    id: number;
    pivot: {
        product_id: number;
        specification_id: number;
        value: string;
    };
}

interface Props {
    productId: string | number;
}

const ProductSpecificationsTab: React.FC<Props> = ({ productId }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [groups, setGroups] = useState<SpecificationGroup[]>([]);
    
    useEffect(() => {
        const loadData = async () => {
            try {
                setLoading(true);
                // Lấy toàn bộ cấu trúc nhóm thông số
                const [groupRes, productSpecRes] = await Promise.all([
                    axiosInstance.get('/admin/specification-groups', { params: { all: 1 } }),
                    axiosInstance.get(`${productPrefix}/${productId}/specifications`)
                ]);

                const allGroups: SpecificationGroup[] = groupRes.data.data;
                const productSpecs: ProductSpecification[] = productSpecRes.data.data;

                setGroups(allGroups);

                // Map dữ liệu hiện tại vào form
                const initialValues: Record<string, string> = {};
                productSpecs.forEach(spec => {
                    initialValues[`spec_${spec.id}`] = spec.pivot.value;
                });

                form.setFieldsValue(initialValues);
            } catch (error) {
                toast.error('Không tải được cấu trúc thông số kỹ thuật');
            } finally {
                setLoading(false);
            }
        };

        if (productId) {
            loadData();
        }
    }, [productId, form]);

    const handleSave = async () => {
        try {
            const values = await form.validateFields();
            setSaving(true);

            // Chuyển đổi values { "spec_1": "6.7 inch" } thành mảng [{ id: 1, value: "6.7 inch" }]
            const specifications = Object.keys(values)
                .filter(key => key.startsWith('spec_'))
                .map(key => ({
                    id: parseInt(key.replace('spec_', '')),
                    value: values[key]
                }))
                .filter(item => item.value !== undefined && item.value !== null && item.value.trim() !== '');

            await axiosInstance.put(`${productPrefix}/${productId}/specifications`, {
                specifications
            });

            toast.success('Lưu thông số kỹ thuật thành công');
        } catch (error: any) {
            toast.error(error?.response?.data?.message || 'Có lỗi khi lưu thông số');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '40px 0', textAlign: 'center' }}>
                <Spin tip="Đang tải cấu trúc thông số..." />
            </div>
        );
    }

    if (groups.length === 0) {
        return (
            <Empty 
                description="Chưa có Nhóm thông số nào trong hệ thống." 
                style={{ padding: '40px 0' }} 
            />
        );
    }

    return (
        <Card 
            title={
                <Space>
                    <ThunderboltOutlined style={{ color: '#722ed1' }} />
                    <Title level={5} style={{ margin: 0 }}>Thông số kỹ thuật sản phẩm</Title>
                </Space>
            }
            extra={
                <Button 
                    type="primary" 
                    icon={<SaveOutlined />} 
                    loading={saving} 
                    onClick={handleSave}
                    style={{ background: '#722ed1', borderColor: '#722ed1' }}
                >
                    Lưu Thông Số
                </Button>
            }
        >
            <Form form={form} layout="vertical">
                <Row gutter={[24, 24]}>
                    {groups.map(group => (
                        <Col span={12} key={group.id}>
                            <Card 
                                type="inner" 
                                title={<Text strong>{group.name}</Text>}
                                headStyle={{ background: '#f9f9f9' }}
                                style={{ height: '100%' }}
                            >
                                {group.specifications && group.specifications.length > 0 ? (
                                    group.specifications.map(spec => (
                                        <Form.Item 
                                            key={spec.id} 
                                            label={spec.name} 
                                            name={`spec_${spec.id}`}
                                            style={{ marginBottom: 16 }}
                                        >
                                            <Input placeholder={`Nhập ${spec.name.toLowerCase()}...`} allowClear />
                                        </Form.Item>
                                    ))
                                ) : (
                                    <Text type="secondary">Chưa có thuộc tính con.</Text>
                                )}
                            </Card>
                        </Col>
                    ))}
                </Row>
            </Form>
        </Card>
    );
};

export default ProductSpecificationsTab;

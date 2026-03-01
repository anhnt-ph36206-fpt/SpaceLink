import React, { useEffect, useState } from "react";
import {
    Card, Form, Input, InputNumber,
    Switch, Button, Row, Col, Typography
} from "antd";
import { ShoppingOutlined } from "@ant-design/icons";
import { axiosInstance } from "../../../api/axios";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {productPrefix} from "../../../api/apiAdminPrefix.ts";

const { Title } = Typography;
const { TextArea } = Input;

const ProductEdit: React.FC = () => {
    const { id } = useParams();
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchDetail = async () => {
            try {
                setLoading(true);
                const res = await axiosInstance.get(`${productPrefix}/${id}`);
                form.setFieldsValue(res.data.data);
            } catch {
                toast.error("Không tải được sản phẩm");
            } finally {
                setLoading(false);
            }
        };

        if (id) fetchDetail();
    }, [id]);

    const handleUpdate = async () => {
        try {
            const values = await form.validateFields();
            setLoading(true);

            await axiosInstance.put(`${productPrefix}/${id}`, values);

            toast.success("Cập nhật thành công");
            navigate("/products");
        } catch (error: any) {
            toast.error(error?.response?.data?.message || "Cập nhật thất bại");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{ padding: 24 }}>
            <Title level={4}>
                <ShoppingOutlined style={{ marginRight: 10 }} />
                Cập nhật sản phẩm
            </Title>

            <Card loading={loading}>
                <Form layout="vertical" form={form}>
                    <Form.Item
                        name="name"
                        label="Tên sản phẩm"
                        rules={[{ required: true }]}
                    >
                        <Input />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="sku" label="SKU">
                                <Input />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="price"
                                label="Giá"
                                rules={[{ required: true }]}
                            >
                                <InputNumber
                                    style={{ width: "100%" }}
                                    min={0}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item name="sale_price" label="Giá KM">
                                <InputNumber
                                    style={{ width: "100%" }}
                                    min={0}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item name="quantity" label="Tồn kho">
                                <InputNumber
                                    style={{ width: "100%" }}
                                    min={0}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Form.Item name="description" label="Mô tả">
                        <TextArea rows={3} />
                    </Form.Item>

                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                name="is_featured"
                                valuePropName="checked"
                                label="Nổi bật"
                            >
                                <Switch />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                name="is_active"
                                valuePropName="checked"
                                label="Trạng thái"
                            >
                                <Switch />
                            </Form.Item>
                        </Col>
                    </Row>

                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                        <Button onClick={() => navigate("/admin/products")}>
                            Hủy
                        </Button>
                        <Button
                            type="primary"
                            loading={loading}
                            onClick={handleUpdate}
                        >
                            Cập nhật
                        </Button>
                    </div>
                </Form>
            </Card>
        </div>
    );
};

export default ProductEdit;
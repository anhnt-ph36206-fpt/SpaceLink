import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { axiosInstance } from '../api/axios';
import { toast } from 'react-toastify';
import axios from 'axios';
import {
    Form,
    Input,
    Radio,
    Button,
    Typography,
    Card,
    Row,
    Col,
    Spin,
    Tag,
    Breadcrumb,
    Select,
    Modal,
    Divider,
    Drawer,
    Empty
} from 'antd';
import {
    ShoppingCartOutlined,
    EnvironmentOutlined,
    CreditCardOutlined,
    TagOutlined,
    CheckCircleFilled,
    InfoCircleOutlined,
    PhoneOutlined,
    UserOutlined,
    HomeOutlined, PlusOutlined,
    GiftOutlined,
    ClockCircleOutlined,
    PercentageOutlined
} from '@ant-design/icons';

const { Title, Text } = Typography;
const { Option } = Select;

interface CheckoutItem {
    productId: number;
    variantId: number;
    name: string;
    image: string;
    price: number;
    quantity: number;
    attributes: string;
    sku: string;
    stock: number;
}

interface LocationData {
    code: number;
    name: string;
}

const formatVND = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

const imgUrl = (path?: string) => {
    if (!path) return '/assets/placeholder.png';
    if (path.startsWith('http')) return path;
    return `http://localhost:8000/storage/${path}`;
};

const CheckoutPage: React.FC = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { items: cartItems } = useCart();
    const { isAuthenticated } = useAuth();
    const [form] = Form.useForm();

    // -- States --
    const [addresses, setAddresses] = useState<any[]>([]);
    const [loadingAddresses, setLoadingAddresses] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [useNewAddress, setUseNewAddress] = useState(false);

    // -- Voucher States --
    const [voucherCode, setVoucherCode] = useState('');
    const [applyingVoucher, setApplyingVoucher] = useState(false);
    const [appliedVoucher, setAppliedVoucher] = useState<any>(null);

    // -- Voucher Drawer States --
    const [voucherDrawerOpen, setVoucherDrawerOpen] = useState(false);
    const [availableVouchers, setAvailableVouchers] = useState<any[]>([]);
    const [loadingVouchers, setLoadingVouchers] = useState(false);

    // -- Location States --
    const [provinces, setProvinces] = useState<LocationData[]>([]);
    const [wards, setWards] = useState<LocationData[]>([]);
    const [loadingLocations, setLoadingLocations] = useState(false);

    // -- Success Modal State --
    const [showSaveAddressModal, setShowSaveAddressModal] = useState(false);
    const [lastOrderAddress, setLastOrderAddress] = useState<any>(null);
    const [lastOrderCode, setLastOrderCode] = useState<string>('');
    const [lastOrderData, setLastOrderData] = useState<any>(null);

    // -- Determine Items to Checkout --
    const buyNowItem: CheckoutItem | null = location.state?.buyNowItem || null;
    const isBuyNow = !!buyNowItem;
    const selectedCartItemIds: number[] | null = location.state?.selectedCartItemIds || null;



    const displayItems = useMemo(() => {
        if (isBuyNow && buyNowItem) return [buyNowItem];
        const filtered = selectedCartItemIds
            ? cartItems.filter(item => selectedCartItemIds.includes(item.id))
            : cartItems;
        return filtered.map(item => ({
            productId: item.productId,
            variantId: item.variantId!,
            name: item.name,
            image: item.image,
            price: item.price,
            quantity: item.quantity,
            attributes: item.attributes || '',
            sku: item.sku || '',
            stock: item.stock
        }));
    }, [isBuyNow, buyNowItem, cartItems, selectedCartItemIds]);
    
    // Watch form values for reactive UI updates (borders)
    const currentPaymentMethod = Form.useWatch('payment_method', form);
    const currentAddressId = Form.useWatch('shipping_address_id', form);

    const subtotal = useMemo(() => {
        return displayItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    }, [displayItems]);

    const discountAmount = appliedVoucher?.discount_amount || 0;
    const shippingFee = subtotal >= 500000 ? 0 : 30000;
    const total = Math.max(0, subtotal + shippingFee - discountAmount);

    // -- Effects: Fetch Initial Data --
    useEffect(() => {
        if (isAuthenticated) {
            setLoadingAddresses(true);
            axiosInstance.get('/addresses')
                .then(res => {
                    const addrs = res.data.data || [];
                    setAddresses(addrs);
                    if (addrs.length === 0) setUseNewAddress(true);

                    const def = addrs.find((a: any) => a.is_default);
                    if (def) form.setFieldsValue({ shipping_address_id: def.id });
                    else if (addrs.length > 0) form.setFieldsValue({ shipping_address_id: addrs[0].id });
                })
                .catch(() => toast.error('Không thể tải địa chỉ'))
                .finally(() => setLoadingAddresses(false));
        } else {
            setUseNewAddress(true);
        }

        // Fetch Provinces (V2)
        setLoadingLocations(true);
        axios.get(`${import.meta.env.VITE_API_ADDRESS}`)
            .then(res => setProvinces(res.data))
            .catch(() => toast.error('Không thể tải danh sách tỉnh thành'))
            .finally(() => setLoadingLocations(false));
    }, [isAuthenticated, form]);

    // -- Location Handlers --
    const handleProvinceChange = (val: string) => {
        const province = provinces.find(p => p.name === val);
        if (province) {
            setLoadingLocations(true);
            axios.get(`${import.meta.env.VITE_API_ADDRESS}/${province.code}?depth=2`)
                .then(res => setWards(res.data.wards))
                .finally(() => setLoadingLocations(false));
            form.setFieldsValue({ ward: undefined });
        }
    };

    const handleApplyVoucher = async (codeOverride?: string) => {
        const code = codeOverride || voucherCode;
        if (!code) return;
        setApplyingVoucher(true);
        try {
            const res = await axiosInstance.post('/client/checkout/check-voucher', {
                code,
                order_value: subtotal,
                items: displayItems.map(i => ({ variant_id: i.variantId, quantity: i.quantity }))
            });
            if (res.data.status === 'success') {
                setAppliedVoucher(res.data.data);
                setVoucherCode(res.data.data.code);
                toast.success('Áp dụng mã giảm giá thành công!');
                setVoucherDrawerOpen(false);
            }
        } catch (error: any) {
            toast.error(error.response?.data?.message || 'Mã giảm giá không hợp lệ');
            setAppliedVoucher(null);
        } finally {
            setApplyingVoucher(false);
        }
    };

    const fetchAvailableVouchers = async () => {
        setLoadingVouchers(true);
        try {
            const res = await axiosInstance.get('/client/vouchers/available', {
                params: { order_value: subtotal }
            });
            setAvailableVouchers(res.data.data || []);
        } catch {
            setAvailableVouchers([]);
        } finally {
            setLoadingVouchers(false);
        }
    };

    const openVoucherDrawer = () => {
        setVoucherDrawerOpen(true);
        fetchAvailableVouchers();
    };

    const selectVoucher = (v: any) => {
        handleApplyVoucher(v.code);
    };

    const onFinish = async (values: any) => {
        setSubmitting(false);
        if (displayItems.length === 0) {
            toast.error('Giỏ hàng trống');
            return;
        }

        setSubmitting(true);
        try {
            const payload: any = {
                ...values,
                items: displayItems.map(item => ({
                    variant_id: item.variantId,
                    quantity: item.quantity
                })),
                is_buy_now: isBuyNow,
                voucher_code: appliedVoucher?.code
            };

            const res = await axiosInstance.post('/client/checkout', payload);
            console.log(res.data.status === 'success')
            if (res.data.status === 'success') {
                const orderData = res.data.data;
                setLastOrderCode(orderData.order_code);
                setLastOrderData(orderData);

                if (useNewAddress && isAuthenticated) {
                    setLastOrderAddress({
                        fullname: values.fullname,
                        phone: values.phone,
                        email: values.email,
                        province: values.province,
                        ward: values.ward,
                        address_detail: values.address_detail
                    });
                    setShowSaveAddressModal(true);
                } else {
                    handlePostCheckoutFinish(orderData.order_code, orderData);
                }
            }
        } catch (error: any) {
            console.log(error)
            toast.error(error.response?.data?.message || 'Có lỗi xảy ra');
        } finally {
            setSubmitting(false);
        }
    };

    const handlePostCheckoutFinish = (orderCode: string, orderData?: any) => {
        if (!isBuyNow) refreshCart();

        if (orderData?.payment_url) {
            // Lưu order_id để PaymentReturnPage biết đơn nào đang chờ thanh toán VNPAY
            // checkout() API trả về data.order_id (khác với createVnpayPayment trả về data.id)
            if (orderData.order_id) {
                sessionStorage.setItem('vnpay_pending_order_id', String(orderData.order_id));
            }
            toast.info('Đang chuyển hướng đến cổng thanh toán...');

            // Thay thế URL /checkout trong history bằng trang chi tiết đơn hàng
            // Khi user bấm Back từ trang VNPAY → sẽ vào trang chi tiết đơn hàng thay vì checkout
            window.history.replaceState(null, '', `/orders/${orderData.order_id}`);

            window.location.href = orderData.payment_url;
            return;
        }

        toast.success('Đặt hàng thành công!');
        // Thay thế URL /checkout trong history bằng trang chủ
        // Khi user bấm Back từ trang success → về trang chủ thay vì checkout
        window.history.replaceState(null, '', '/');
        navigate(`/order/success/${orderCode}`, { state: { order: orderData } });
    };

    // Need access to cart context's refresh
    const { refreshCart } = useCart();

    const handleSaveAddressAndFinish = async () => {
        try {
            await axiosInstance.post('/addresses', lastOrderAddress);
            toast.success('Đã lưu địa chỉ mới vào sổ địa chỉ!');
        } catch (err) {
            console.error('Save address failed', err);
        } finally {
            setShowSaveAddressModal(false);
            handlePostCheckoutFinish(lastOrderCode, lastOrderData);
        }
    };

    // -- UI Components --
    const renderCartItems = (
        <div className="checkout-items-list">
            {displayItems.length === 0 ? (
                <div className="text-center py-4 bg-light rounded-3">
                    <Text type="secondary">Không có sản phẩm nào</Text>
                </div>
            ) : (
                displayItems.map((item, idx) => (
                    <div key={idx} className="checkout-item-row p-3 mb-3 bg-white border rounded-3 d-flex gap-3 align-items-start transition-all">
                        <div className="item-thumbnail">
                            <img src={imgUrl(item.image)} alt={item.name} />
                        </div>
                        <div className="item-details flex-grow-1 overflow-hidden">
                            <Text strong className="d-block text-dark mb-1" style={{ fontSize: 13, lineHeight: '1.4' }}>{item.name}</Text>
                            <div className="mb-1">
                                <Tag bordered={false} className="bg-brand-soft text-brand m-0" style={{ fontSize: 10 }}>{item.attributes || 'Cơ bản'}</Tag>
                            </div>
                            <div className="d-flex justify-content-between align-items-center mt-2">
                                <Text type="secondary" style={{ fontSize: 12 }}>{item.quantity} x {formatVND(item.price)}</Text>
                                <Text strong className="text-brand">{formatVND(item.price * item.quantity)}</Text>
                            </div>
                        </div>
                    </div>
                ))
            )}
        </div>
    );

    return (
        <div className="checkout-container py-5 min-vh-100 bg-canvas">
            <div className="container" style={{ maxWidth: 1200 }}>
                {/* Header Section */}
                <div className="mb-5">
                    <Breadcrumb className="mb-3 custom-breadcrumb">
                        <Breadcrumb.Item onClick={() => navigate('/')}>Trang chủ</Breadcrumb.Item>
                        <Breadcrumb.Item onClick={() => navigate('/cart')}>Giỏ hàng</Breadcrumb.Item>
                        <Breadcrumb.Item>Thanh toán</Breadcrumb.Item>
                    </Breadcrumb>
                    <div className="d-flex align-items-center gap-3">
                        <div className="icon-main">
                            <ShoppingCartOutlined />
                        </div>
                        <div>
                            <Title level={2} className="m-0 fw-bold title-page">Thanh toán đơn hàng</Title>
                            <Text type="secondary">Vui lòng điền đầy đủ thông tin để hoàn tất đơn hàng</Text>
                        </div>
                    </div>
                </div>

                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    className="checkout-form"
                    initialValues={{ payment_method: 'cod' }}
                >
                    <Row gutter={[32, 32]}>
                        <Col lg={15} md={24}>
                            {/* Address Section */}
                            <Card className="checkout-card mb-4" title={
                                <div className="d-flex align-items-center gap-2">
                                    <EnvironmentOutlined className="text-brand" />
                                    <span className="fw-bold">Thông tin nhận hàng</span>
                                </div>
                            }>
                                <Spin spinning={loadingAddresses || loadingLocations}>
                                    {!useNewAddress ? (
                                        <>
                                            <Form.Item name="shipping_address_id" rules={[{ required: true, message: 'Vui lòng chọn địa chỉ' }]} className="m-0">
                                                <Radio.Group className="w-100">
                                                    <div className="d-flex flex-column gap-3">
                                                        {addresses.map(addr => (
                                                            <div key={addr.id} className={`address-card p-3 rounded-3 border-2 transition-all ${currentAddressId === addr.id ? 'active' : ''}`}>
                                                                <Radio value={addr.id} className="w-100 p-0 m-0 custom-radio">
                                                                    <div className="ms-2">
                                                                        <div className="d-flex align-items-center gap-2 mb-1">
                                                                            <Text strong>{addr.fullname}</Text>
                                                                            {addr.is_default && <Tag color="orange">Mặc định</Tag>}
                                                                        </div>
                                                                        <div className="text-secondary small"><PhoneOutlined /> {addr.phone}</div>
                                                                        <div className="text-muted small mt-1"><HomeOutlined /> {addr.address_detail}, {addr.ward}, {addr.province}</div>
                                                                    </div>
                                                                </Radio>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </Radio.Group>
                                            </Form.Item>
                                            <Button type="link" onClick={() => setUseNewAddress(true)} icon={<PlusOutlined />} className="mt-3 p-0 text-brand fw-medium">Thêm địa chỉ mới</Button>
                                        </>
                                    ) : (
                                        <div className="new-address-form animate-fade-in">
                                            <div className="d-flex justify-content-between align-items-center mb-4">
                                                <Text type="secondary" italic>Nhập thông tin giao hàng mới</Text>
                                                {addresses.length > 0 && (
                                                    <Button type="link" onClick={() => setUseNewAddress(false)} className="text-brand">Dùng địa chỉ đã lưu</Button>
                                                )}
                                            </div>
                                            <Row gutter={16}>
                                                <Col span={24}>
                                                    <Form.Item label="Email" name="email" rules={[{ required: true, message: 'Vui lòng nhập email' }, { type: 'email', message: 'Email không hợp lệ' }]}>
                                                        <Input prefix={<InfoCircleOutlined className="text-muted" />} placeholder="example@gmail.com" className="custom-input" />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={12}>
                                                    <Form.Item label="Họ và tên" name="fullname" rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}>
                                                        <Input prefix={<UserOutlined className="text-muted" />} placeholder="Nguyễn Văn A" className="custom-input" />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={12}>
                                                    <Form.Item label="Số điện thoại" name="phone" rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}>
                                                        <Input prefix={<PhoneOutlined className="text-muted" />} placeholder="0123456789" className="custom-input" />
                                                    </Form.Item>
                                                </Col>
                                                <Col span={12}>
                                                    <Form.Item label="Tỉnh/Thành phố" name="province" rules={[{ required: true, message: 'Chọn tỉnh thành' }]}>
                                                        <Select showSearch placeholder="Chọn tỉnh thành" onChange={handleProvinceChange} className="custom-select">
                                                            {provinces.map(p => <Option key={p.code} value={p.name}>{p.name}</Option>)}
                                                        </Select>
                                                    </Form.Item>
                                                </Col>
                                                <Col span={12}>
                                                    <Form.Item label="Phường/Xã/Thị trấn" name="ward" rules={[{ required: true, message: 'Chọn phường xã' }]}>
                                                        <Select showSearch placeholder="Chọn phường xã" className="custom-select">
                                                            {wards.map(w => <Option key={w.code} value={w.name}>{w.name}</Option>)}
                                                        </Select>
                                                    </Form.Item>
                                                </Col>
                                                <Col span={24}>
                                                    <Form.Item label="Địa chỉ chi tiết" name="address_detail" rules={[{ required: true, message: 'Vui lòng nhập địa chỉ cụ thể' }]}>
                                                        <Input placeholder="Số nhà, tên đường..." className="custom-input" />
                                                    </Form.Item>
                                                </Col>
                                            </Row>
                                        </div>
                                    )}
                                </Spin>
                            </Card>

                            {/* Payment Section */}
                            <Card className="checkout-card mb-4" title={
                                <div className="d-flex align-items-center gap-2">
                                    <CreditCardOutlined className="text-brand" />
                                    <span className="fw-bold">Phương thức thanh toán</span>
                                </div>
                            }>
                                <Form.Item name="payment_method" className="m-0">
                                    <Radio.Group className="w-100 payment-group">
                                        <Row gutter={[16, 16]}>
                                            <Col span={24}>
                                                <div className={`payment-card p-3 rounded-3 border-2 transition-all ${currentPaymentMethod === 'cod' ? 'active' : ''}`}>
                                                    <Radio value="cod" className="w-100">
                                                        <div className="ms-2">
                                                            <Text strong>Thanh toán khi nhận hàng (COD)</Text>
                                                            <div className="text-muted small">Cảm ơn bạn đã tin dùng sản phẩm của chúng tôi.</div>
                                                        </div>
                                                    </Radio>
                                                </div>
                                            </Col>
                                            <Col span={24}>
                                                <div className={`payment-card p-3 rounded-3 border-2 transition-all ${currentPaymentMethod === 'vnpay' ? 'active' : ''}`}>
                                                    <Radio value="vnpay" className="w-100">
                                                        <div className="ms-2">
                                                            <Text strong>Thanh toán qua VNPAY</Text>
                                                            <div className="text-muted small">Thanh toán an toàn qua cổng VNPAY.</div>
                                                        </div>
                                                    </Radio>
                                                </div>
                                            </Col>
                                        </Row>
                                    </Radio.Group>
                                </Form.Item>
                            </Card>

                            <Form.Item label={<Text strong className="text-muted small">Ghi chú đơn hàng (Tùy chọn)</Text>} name="note">
                                <Input.TextArea rows={3} placeholder="Ghi chú thêm cho người bán..." className="rounded-3" />
                            </Form.Item>
                        </Col>

                        <Col lg={9} md={24}>
                            <div className="sticky-summary">
                                <Card className="summary-card shadow-sm border-0 rounded-4 overflow-hidden" bodyStyle={{ padding: 0 }}>
                                    <div className="bg-brand p-4 text-white">
                                        <Title level={4} className="m-0 text-white d-flex align-items-center gap-2">
                                            <InfoCircleOutlined /> Đơn hàng của bạn
                                        </Title>
                                    </div>

                                    <div className="p-4">
                                        {renderCartItems}

                                        <Divider style={{ margin: '24px 0' }} />

                                        {/* Voucher Section */}
                                        <div className="mb-4">
                                            <div className="d-flex align-items-center justify-content-between mb-2">
                                                <div className="d-flex align-items-center gap-2">
                                                    <TagOutlined className="text-brand" />
                                                    <Text strong>Mã giảm giá</Text>
                                                </div>
                                                {isAuthenticated && (
                                                    <Button
                                                        type="link"
                                                        size="small"
                                                        icon={<GiftOutlined />}
                                                        onClick={openVoucherDrawer}
                                                        className="text-brand fw-medium p-0"
                                                        style={{ fontSize: 13 }}
                                                    >
                                                        Chọn voucher
                                                    </Button>
                                                )}
                                            </div>
                                            <div className="d-flex gap-2">
                                                <Input
                                                    placeholder="Nhập mã ưu đãi..."
                                                    value={voucherCode}
                                                    onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                                                    className="custom-input flex-grow-1"
                                                    disabled={!!appliedVoucher}
                                                />
                                                {appliedVoucher ? (
                                                    <Button onClick={() => { setAppliedVoucher(null); setVoucherCode(''); }} danger>Hủy</Button>
                                                ) : (
                                                    <Button type="primary" onClick={() => handleApplyVoucher()} loading={applyingVoucher} className="bg-brand border-brand">Sử dụng</Button>
                                                )}
                                            </div>
                                            {appliedVoucher && <div className="mt-2 text-success small fw-bold"><CheckCircleFilled /> Giảm ngay {formatVND(discountAmount)}</div>}
                                        </div>

                                        <div className="summary-details bg-brand-soft p-4 rounded-3 mb-4">
                                            <div className="d-flex justify-content-between mb-2">
                                                <Text type="secondary">Tạm tính</Text>
                                                <Text strong>{formatVND(subtotal)}</Text>
                                            </div>
                                            <div className="d-flex justify-content-between mb-2">
                                                <Text type="secondary">Phí vận chuyển</Text>
                                                <Text strong className="text-success">{shippingFee === 0 ? 'FREE' : formatVND(shippingFee)}</Text>
                                            </div>
                                            {appliedVoucher && (
                                                <div className="d-flex justify-content-between mb-2">
                                                    <Text type="secondary">Giảm giá</Text>
                                                    <Text strong className="text-danger">-{formatVND(discountAmount)}</Text>
                                                </div>
                                            )}
                                            <Divider style={{ margin: '12px 0', borderColor: 'rgba(242,139,0,0.1)' }} />
                                            <div className="d-flex justify-content-between align-items-center">
                                                <Text strong style={{ fontSize: 16 }}>TỔNG CỘNG</Text>
                                                <Title level={3} className="m-0 text-brand fw-bold">{formatVND(total)}</Title>
                                            </div>
                                        </div>

                                        <Button type="primary" size="large" block htmlType="submit" loading={submitting} className="btn-checkout">
                                            XÁC NHẬN ĐẶT HÀNG
                                        </Button>

                                        <div className="text-center mt-3">
                                            <Text type="secondary" style={{ fontSize: 12 }}>
                                                <InfoCircleOutlined /> Đảm bảo thanh toán an toàn 100%
                                            </Text>
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        </Col>
                    </Row>
                </Form>
            </div>

            <Modal
                title={null}
                open={showSaveAddressModal}
                onOk={handleSaveAddressAndFinish}
                onCancel={() => { setShowSaveAddressModal(false); handlePostCheckoutFinish(lastOrderCode); }}
                okText="Lưu địa chỉ"
                cancelText="Bỏ qua"
                centered
                closable={false}
                bodyStyle={{ padding: '40px 20px', textAlign: 'center' }}
                width={400}
            >
                <div className="mb-4">
                    <CheckCircleFilled className="text-brand" style={{ fontSize: 64 }} />
                </div>
                <Title level={4}>Lưu địa chỉ này?</Title>
                <Text type="secondary">Bạn có muốn lưu địa chỉ này vào sổ cá nhân cho lần mua sau không?</Text>
            </Modal>

            {/* Voucher Drawer */}
            <Drawer
                title={
                    <div className="d-flex align-items-center gap-2">
                        <GiftOutlined style={{ color: '#F28B00', fontSize: 20 }} />
                        <span className="fw-bold" style={{ fontSize: 16 }}>Chọn mã giảm giá</span>
                    </div>
                }
                placement="right"
                onClose={() => setVoucherDrawerOpen(false)}
                open={voucherDrawerOpen}
                width={420}
                zIndex={99999}
                bodyStyle={{ padding: '16px', background: '#fafafa' }}
            >
                <Spin spinning={loadingVouchers}>
                    {availableVouchers.length === 0 && !loadingVouchers ? (
                        <Empty description="Hiện không có voucher nào khả dụng" />
                    ) : (
                        <div className="d-flex flex-column gap-3">
                            {availableVouchers.map((v: any) => (
                                <div
                                    key={v.id}
                                    className={`voucher-card-drawer ${!v.is_applicable ? 'disabled' : ''} ${appliedVoucher?.code === v.code ? 'selected' : ''}`}
                                >
                                    <div className="voucher-card-left">
                                        <div className="voucher-discount-badge">
                                            {v.discount_type === 'percent' ? (
                                                <>
                                                    <PercentageOutlined style={{ fontSize: 14 }} />
                                                    <span className="voucher-discount-value">{v.discount_value}%</span>
                                                </>
                                            ) : (
                                                <span className="voucher-discount-value" style={{ fontSize: 13 }}>
                                                    {formatVND(v.discount_value)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="voucher-card-right">
                                        <div className="d-flex justify-content-between align-items-start">
                                            <div>
                                                <div className="voucher-code-tag">{v.code}</div>
                                                <div className="voucher-name mt-1">{v.name}</div>
                                            </div>
                                            {appliedVoucher?.code === v.code ? (
                                                <Tag color="success" style={{ margin: 0, borderRadius: 4 }}>
                                                    <CheckCircleFilled /> Đang dùng
                                                </Tag>
                                            ) : v.is_applicable ? (
                                                <Button
                                                    type="primary"
                                                    size="small"
                                                    onClick={() => selectVoucher(v)}
                                                    loading={applyingVoucher}
                                                    style={{
                                                        background: '#F28B00', border: 'none', borderRadius: 6,
                                                        fontWeight: 600, fontSize: 12, height: 28
                                                    }}
                                                >
                                                    Áp dụng
                                                </Button>
                                            ) : null}
                                        </div>
                                        <div className="voucher-meta mt-2">
                                            {v.min_order_amount > 0 && (
                                                <div><TagOutlined /> Đơn tối thiểu {formatVND(v.min_order_amount)}</div>
                                            )}
                                            {v.max_discount && v.discount_type === 'percent' && (
                                                <div>Giảm tối đa {formatVND(v.max_discount)}</div>
                                            )}
                                            <div>
                                                <ClockCircleOutlined /> HSD: {new Date(v.end_date).toLocaleDateString('vi-VN')}
                                            </div>
                                            {v.remaining_uses !== null && (
                                                <div>Còn {v.remaining_uses} lượt</div>
                                            )}
                                        </div>
                                        {v.is_applicable && v.estimated_discount > 0 && (
                                            <div className="voucher-estimated">
                                                Tiết kiệm {formatVND(v.estimated_discount)}
                                            </div>
                                        )}
                                        {!v.is_applicable && v.reason && (
                                            <div className="voucher-reason">{v.reason}</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Spin>

                <Divider style={{ margin: '20px 0 16px' }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>hoặc nhập mã</Text>
                </Divider>
                <div className="d-flex gap-2">
                    <Input
                        placeholder="Nhập mã voucher..."
                        value={voucherCode}
                        onChange={e => setVoucherCode(e.target.value.toUpperCase())}
                        disabled={!!appliedVoucher}
                        style={{ borderRadius: 8, height: 40 }}
                    />
                    {appliedVoucher ? (
                        <Button onClick={() => { setAppliedVoucher(null); setVoucherCode(''); }} danger style={{ height: 40, borderRadius: 8 }}>Hủy</Button>
                    ) : (
                        <Button
                            type="primary"
                            onClick={() => handleApplyVoucher()}
                            loading={applyingVoucher}
                            style={{ background: '#F28B00', border: 'none', height: 40, borderRadius: 8, fontWeight: 600 }}
                        >
                            Dùng
                        </Button>
                    )}
                </div>
            </Drawer>

            <style>{`
                .bg-canvas { background: #fafafa; }
                .text-brand { color: #F28B00 !important; }
                .bg-brand { background: #F28B00 !important; }
                .bg-brand-soft { background: #fffbf0; }
                .border-brand { border-color: #F28B00 !important; }
                
                .custom-breadcrumb .ant-breadcrumb-link { cursor: pointer; transition: color 0.2s; font-size: 13px; }
                .custom-breadcrumb .ant-breadcrumb-link:hover { color: #F28B00 !important; }
                
                .icon-main { width: 50px; height: 50px; background: #F28B00; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; color: #fff; box-shadow: 0 4px 12px rgba(242, 139, 0, 0.2); }
                .title-page { font-size: 28px; letter-spacing: -0.02em; }
                
                .checkout-card { border-radius: 12px; border: 1px solid #f0f0f0; box-shadow: 0 4px 20px rgba(0,0,0,0.03); }
                .checkout-card .ant-card-head { border-bottom: none; padding: 24px 24px 0; }
                .checkout-card .ant-card-body { padding: 24px; }
                
                .address-card, .payment-card { border: 2px solid #f0f0f0 !important; cursor: pointer; transition: all 0.3s; position: relative; }
                .address-card.active, .payment-card.active { border-color: #F28B00 !important; background: #fffcf5; box-shadow: 0 4px 12px rgba(242, 139, 0, 0.05); }
                .address-card:hover, .payment-card:hover { border-color: #F28B00; }
                
                .item-thumbnail { width: 70px; height: 70px; border-radius: 8px; overflow: hidden; background: #f9f9f9; border: 1px solid #f0f0f0; flex-shrink: 0; }
                .item-thumbnail img { width: 100%; height: 100%; object-fit: contain; }
                
                .checkout-item-row:hover { border-color: #F28B00; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
                
                .custom-input, .custom-select .ant-select-selector { border-radius: 8px !important; height: 42px !important; border: 1.5px solid #e8e8e8 !important; }
                .custom-input:focus, .custom-input:hover, .custom-select .ant-select-selector:hover { border-color: #F28B00 !important; shadow: none !important; }
                
                .sticky-summary { position: sticky; top: 24px; }
                .btn-checkout { height: 54px; border-radius: 8px; font-weight: 700; font-size: 16px; background: #F28B00; border: none; }
                .btn-checkout:hover { background: #e07a00 !important; box-shadow: 0 6px 20px rgba(242, 139, 0, 0.3); }
                
                .animate-fade-in { animation: fadeIn 0.4s ease; }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                
                @media (max-width: 991px) { .sticky-summary { position: static; } .title-page { font-size: 22px; } }

                /* Voucher Drawer Cards */
                .voucher-card-drawer {
                    display: flex; border-radius: 12px; overflow: hidden;
                    background: #fff; border: 1.5px solid #f0f0f0;
                    transition: all 0.25s ease; cursor: default;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.04);
                }
                .voucher-card-drawer:hover { border-color: #F28B00; box-shadow: 0 4px 16px rgba(242,139,0,0.08); }
                .voucher-card-drawer.selected { border-color: #F28B00; background: #fffcf5; }
                .voucher-card-drawer.disabled { opacity: 0.55; pointer-events: none; }

                .voucher-card-left {
                    width: 80px; min-height: 100px; background: linear-gradient(135deg, #F28B00, #ff6b35);
                    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
                    position: relative;
                }
                .voucher-card-left::after {
                    content: ''; position: absolute; right: -8px; top: 50%; transform: translateY(-50%);
                    width: 16px; height: 16px; background: #fff; border-radius: 50%;
                }

                .voucher-discount-badge { color: #fff; text-align: center; font-weight: 700; }
                .voucher-discount-value { display: block; font-size: 18px; line-height: 1.2; }

                .voucher-card-right { flex: 1; padding: 12px 14px; }
                .voucher-code-tag {
                    display: inline-block; background: #fff3e0; color: #F28B00;
                    font-weight: 700; font-size: 12px; padding: 2px 8px;
                    border-radius: 4px; border: 1px dashed #F28B00; letter-spacing: 0.5px;
                }
                .voucher-name { font-size: 13px; font-weight: 600; color: #1a1a2e; line-height: 1.3; }
                .voucher-meta { font-size: 11px; color: #888; display: flex; flex-direction: column; gap: 2px; }
                .voucher-estimated {
                    margin-top: 6px; font-size: 12px; font-weight: 600;
                    color: #16a34a; background: #f0fdf4; padding: 3px 8px; border-radius: 4px;
                    display: inline-block;
                }
                .voucher-reason {
                    margin-top: 6px; font-size: 11px; color: #dc2626;
                    background: #fef2f2; padding: 3px 8px; border-radius: 4px;
                }
            `}</style>
        </div>
    );
};

export default CheckoutPage;

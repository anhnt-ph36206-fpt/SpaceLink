import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Button, Result, Card, Typography, Descriptions, Tag, Breadcrumb, Modal, Radio, Space, message } from 'antd';
import { axiosInstance } from '../api/axios';
import { useCart } from '../context/CartContext';
import {
    HomeOutlined,
    ShoppingOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    ClockCircleOutlined,
    SwapOutlined,
    CreditCardOutlined,
    CarOutlined,
} from '@ant-design/icons';

const { Title, Text } = Typography;

// ─── VNPay response code map ───────────────────────────────────────────────────
const VNPAY_RESPONSE_CODES: Record<string, { title: string; detail: string; status: 'success' | 'error' | 'warning' | 'info' }> = {
    '00': { title: 'Thanh toán thành công', detail: 'Giao dịch đã được xác nhận thành công.', status: 'success' },
    '07': { title: 'Giao dịch bị nghi ngờ', detail: 'Trừ tiền thành công nhưng giao dịch bị nghi ngờ.', status: 'warning' },
    '09': { title: 'Thẻ chưa đăng ký InternetBanking', detail: 'Vui lòng đăng ký dịch vụ để thực hiện thanh toán.', status: 'error' },
    '10': { title: 'Xác thực thất bại', detail: 'Thông tin xác thực không chính xác quá 3 lần.', status: 'error' },
    '11': { title: 'Hết hạn thanh toán', detail: 'Thời gian thực hiện giao dịch đã hết hạn.', status: 'error' },
    '12': { title: 'Thẻ bị khóa', detail: 'Thẻ/Tài khoản của bạn hiện đang bị khóa.', status: 'error' },
    '13': { title: 'Sai mã OTP', detail: 'Mã xác thực giao dịch nhập không chính xác.', status: 'error' },
    '24': { title: 'Hủy giao dịch', detail: 'Bạn đã hủy yêu cầu thanh toán vừa rồi.', status: 'warning' },
    '51': { title: 'Số dư không đủ', detail: 'Tài khoản không đủ số dư để thanh toán.', status: 'error' },
    '65': { title: 'Vượt hạn mức ngày', detail: 'Giao dịch vượt quá hạn mức cho phép trong ngày.', status: 'error' },
    '75': { title: 'Ngân hàng bảo trì', detail: 'Hệ thống ngân hàng đang bảo trì định kỳ.', status: 'info' },
    '79': { title: 'Sai mật khẩu thanh toán', detail: 'Mật khẩu thanh toán không chính xác.', status: 'error' },
    '99': { title: 'Lỗi hệ thống', detail: 'Đã có lỗi xảy ra từ phía ngân hàng/VNPay.', status: 'error' },
};

const formatVND = (v: number) =>
    new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

const PaymentReturnPage: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [countdown, setCountdown] = useState(10);

    // Lấy order ID đang chờ VNPAY (được lưu trước khi redirect sang VNPAY)
    const pendingOrderId = sessionStorage.getItem('vnpay_pending_order_id');

    // ── Đổi phương thức thanh toán ─────────────────────────────
    const [switchModalOpen, setSwitchModalOpen] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState<'cod' | 'vnpay'>('cod');
    const [switchLoading, setSwitchLoading] = useState(false);
    const { refreshCart } = useCart();

    const responseCode = searchParams.get('vnp_ResponseCode') ?? '';
    const txnRef = searchParams.get('vnp_TxnRef') ?? '';
    const amount = parseInt(searchParams.get('vnp_Amount') ?? '0') / 100;
    const transactionNo = searchParams.get('vnp_TransactionNo') ?? '';
    const payDate = searchParams.get('vnp_PayDate') ?? '';
    const bankCode = searchParams.get('vnp_BankCode') ?? '';

    const isSuccess = responseCode === '00';
    const responseInfo = VNPAY_RESPONSE_CODES[responseCode] ?? {
        title: 'Kết quả không xác định',
        detail: `Mã phản hồi: ${responseCode}`,
        status: 'info' as const,
    };

    const didUpdatePayment = useRef(false);

    const formatPayDate = (raw: string) => {
        if (raw.length !== 14) return raw;
        return `${raw.slice(6, 8)}/${raw.slice(4, 6)}/${raw.slice(0, 4)} ${raw.slice(8, 10)}:${raw.slice(10, 12)}:${raw.slice(12, 14)}`;
    };

    // Thanh toán thành công → gọi IPN để cập nhật DB, xóa sessionStorage
    useEffect(() => {
        if (!isSuccess) return;
        if (didUpdatePayment.current) return;
        didUpdatePayment.current = true;

        sessionStorage.removeItem('vnpay_pending_order_id');

        const params: Record<string, string> = {};
        searchParams.forEach((value, key) => { params[key] = value; });

        (async () => {
            try {
                await axiosInstance.get('/payment/vnpay-ipn', { params });
            } catch {
                // Không chặn luồng UI
            }
        })();
    }, [isSuccess, txnRef, searchParams]);

    // Đếm ngược tự chuyển trang chủ khi thanh toán thành công
    useEffect(() => {
        if (!isSuccess) return;
        const timer = setInterval(() => {
            setCountdown((c) => {
                if (c <= 1) { clearInterval(timer); navigate('/'); }
                return c - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [isSuccess, navigate]);

    // ── Xác nhận đổi phương thức thanh toán ───────────────────
    const handleConfirmSwitch = async () => {
        if (!pendingOrderId) return;
        setSwitchLoading(true);
        try {
            if (selectedMethod === 'cod') {
                await axiosInstance.post(`/client/orders/${pendingOrderId}/switch-to-cod`);
                sessionStorage.removeItem('vnpay_pending_order_id');
                // Làm mới giỏ hàng ngay lập tức
                await refreshCart();
                message.success('Đã chuyển sang COD thành công!');
                setSwitchModalOpen(false);
                navigate(`/orders/${pendingOrderId}`);
            } else {
                // Retry VNPAY
                const res = await axiosInstance.get(`/client/orders/${pendingOrderId}/retry-vnpay`);
                if (res.data?.payment_url) {
                    message.info('Đang chuyển hướng đến cổng thanh toán...');
                    setSwitchModalOpen(false);
                    setTimeout(() => { window.location.href = res.data.payment_url; }, 600);
                }
            }
        } catch (err: unknown) {
            const e = err as { response?: { data?: { message?: string } } };
            message.error(e?.response?.data?.message ?? 'Có lỗi xảy ra, vui lòng thử lại.');
        } finally {
            setSwitchLoading(false);
        }
    };

    return (
        <div className="payment-return-container py-5 min-vh-100 bg-light d-flex align-items-center">
            <div className="container">
                <Breadcrumb className="mb-4 custom-breadcrumb">
                    <Breadcrumb.Item><Link to="/">Trang chủ</Link></Breadcrumb.Item>
                    <Breadcrumb.Item>Kết quả thanh toán</Breadcrumb.Item>
                </Breadcrumb>

                <Card className="shadow-lg border-0 rounded-4 overflow-hidden">
                    <div className={`p-4 text-center ${isSuccess ? 'bg-success' : responseCode === '24' ? 'bg-warning' : 'bg-danger'}`}>
                        {isSuccess
                            ? <CheckCircleOutlined style={{ fontSize: 60, color: '#fff' }} className="mb-3" />
                            : <CloseCircleOutlined style={{ fontSize: 60, color: '#fff' }} className="mb-3" />
                        }
                        <Title level={2} className="text-white m-0 fw-bold">{responseInfo.title}</Title>
                    </div>

                    <div className="p-4 p-md-5">
                        <Result
                            status={responseInfo.status}
                            title={<span className="fw-bold fs-5">{responseInfo.detail}</span>}
                        />

                        <div className="order-summary-box p-4 rounded-4 text-start mb-4 border border-dashed">
                            <Descriptions column={1} size="small" colon={false}>
                                {txnRef && (
                                    <Descriptions.Item label={<Text type="secondary">Mã đơn hàng:</Text>}>
                                        <Text strong>{txnRef}</Text>
                                    </Descriptions.Item>
                                )}
                                {amount > 0 && (
                                    <Descriptions.Item label={<Text type="secondary">Tổng tiền:</Text>}>
                                        <Text strong className="text-danger" style={{ fontSize: '1.1rem' }}>{formatVND(amount)}</Text>
                                    </Descriptions.Item>
                                )}
                                {transactionNo && (
                                    <Descriptions.Item label={<Text type="secondary">Mã giao dịch:</Text>}>
                                        <Text copyable>{transactionNo}</Text>
                                    </Descriptions.Item>
                                )}
                                {bankCode && (
                                    <Descriptions.Item label={<Text type="secondary">Ngân hàng:</Text>}>
                                        <Tag bordered={false} className="bg-white fw-bold" style={{ border: '1px solid #e8e8e8', color: '#F28B00' }}>{bankCode}</Tag>
                                    </Descriptions.Item>
                                )}
                                {payDate && (
                                    <Descriptions.Item label={<Text type="secondary">Thời gian:</Text>}>
                                        <Text type="secondary"><ClockCircleOutlined /> {formatPayDate(payDate)}</Text>
                                    </Descriptions.Item>
                                )}
                                <Descriptions.Item label={<Text type="secondary">Phương thức:</Text>}>
                                    <Text>Thanh toán trực tuyến VNPay</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label={<Text type="secondary">Trạng thái:</Text>}>
                                    <Text strong className={isSuccess ? 'text-success' : 'text-danger'}>
                                        {isSuccess ? 'Thành công' : 'Thất bại'}
                                    </Text>
                                </Descriptions.Item>
                            </Descriptions>
                        </div>

                        {isSuccess && (
                            <div className="text-center mb-4">
                                <Text type="secondary">Tự động chuyển về trang chủ sau </Text>
                                <Text strong style={{ color: '#F28B00' }}>{countdown}s</Text>
                            </div>
                        )}

                        <div className="d-flex gap-3 justify-content-center flex-wrap">
                            {/* Về trang chủ — luôn hiện */}
                            <Button
                                size="large"
                                icon={<HomeOutlined />}
                                className="rounded-pill px-4 btn-brand-outline"
                                onClick={() => navigate('/')}
                            >
                                Về Trang chủ
                            </Button>

                            {isSuccess ? (
                                /* ── Thành công ── */
                                <Button
                                    type="primary"
                                    size="large"
                                    icon={<ShoppingOutlined />}
                                    className="rounded-pill px-4 btn-brand"
                                    onClick={() => navigate('/shop')}
                                >
                                    Tiếp tục mua sắm
                                </Button>
                            ) : (
                                <>
                                    {/* ── Thất bại / Hủy ── */}
                                    {pendingOrderId ? (
                                        <>
                                            {/* Xem đơn hàng */}
                                            <Button
                                                type="primary"
                                                size="large"
                                                icon={<ShoppingOutlined />}
                                                className="rounded-pill px-4"
                                                style={{ background: '#F28B00', borderColor: '#F28B00' }}
                                                onClick={() => navigate(`/orders/${pendingOrderId}`)}
                                            >
                                                Xem đơn hàng &amp; Thanh toán lại
                                            </Button>

                                            {/* Đổi phương thức */}
                                            <Button
                                                size="large"
                                                icon={<SwapOutlined />}
                                                className="rounded-pill px-4"
                                                style={{ borderColor: '#6366f1', color: '#6366f1' }}
                                                onClick={() => setSwitchModalOpen(true)}
                                            >
                                                Đổi phương thức thanh toán
                                            </Button>
                                        </>
                                    ) : (
                                        /* Fallback: không có pending order */
                                        <Button
                                            size="large"
                                            icon={<ShoppingOutlined />}
                                            className="rounded-pill px-4 btn-brand-outline"
                                            onClick={() => navigate('/cart')}
                                        >
                                            Về giỏ hàng
                                        </Button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </Card>
            </div>

            {/* ── Modal đổi phương thức thanh toán ── */}
            <Modal
                open={switchModalOpen}
                onCancel={() => setSwitchModalOpen(false)}
                onOk={handleConfirmSwitch}
                okText="Xác nhận"
                cancelText="Hủy"
                confirmLoading={switchLoading}
                title={
                    <span style={{ color: '#6366f1', fontWeight: 700 }}>
                        <SwapOutlined style={{ marginRight: 8 }} />
                        Đổi phương thức thanh toán
                    </span>
                }
                centered
                width={420}
            >
                <p style={{ color: '#6b7280', marginBottom: 20 }}>
                    Chọn phương thức thanh toán mới cho đơn hàng này:
                </p>
                <Radio.Group
                    value={selectedMethod}
                    onChange={(e) => setSelectedMethod(e.target.value)}
                    style={{ width: '100%' }}
                >
                    <Space direction="vertical" style={{ width: '100%', gap: 12 }}>
                        {/* COD */}
                        <div
                            onClick={() => setSelectedMethod('cod')}
                            style={{
                                border: `2px solid ${selectedMethod === 'cod' ? '#F28B00' : '#e5e7eb'}`,
                                borderRadius: 10,
                                padding: '14px 16px',
                                cursor: 'pointer',
                                background: selectedMethod === 'cod' ? '#fffbf0' : '#fff',
                                transition: 'all .2s',
                            }}
                        >
                            <Radio value="cod">
                                <div style={{ marginLeft: 6 }}>
                                    <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <CarOutlined style={{ color: '#F28B00' }} />
                                        Thanh toán khi nhận hàng (COD)
                                    </span>
                                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                                        Trả tiền mặt khi nhận được hàng
                                    </div>
                                </div>
                            </Radio>
                        </div>

                        {/* VNPAY */}
                        <div
                            onClick={() => setSelectedMethod('vnpay')}
                            style={{
                                border: `2px solid ${selectedMethod === 'vnpay' ? '#6366f1' : '#e5e7eb'}`,
                                borderRadius: 10,
                                padding: '14px 16px',
                                cursor: 'pointer',
                                background: selectedMethod === 'vnpay' ? '#f5f3ff' : '#fff',
                                transition: 'all .2s',
                            }}
                        >
                            <Radio value="vnpay">
                                <div style={{ marginLeft: 6 }}>
                                    <span style={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <CreditCardOutlined style={{ color: '#6366f1' }} />
                                        Thanh toán lại qua VNPAY
                                    </span>
                                    <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                                        Tạo link thanh toán mới và chuyển sang VNPAY
                                    </div>
                                </div>
                            </Radio>
                        </div>
                    </Space>
                </Radio.Group>
            </Modal>

            <style>{`
                .order-summary-box { background: #f0fdf4 !important; }
                .bg-light { background-color: #f8f9fa !important; }
                .bg-success { background-color: #52c41a !important; }
                .bg-danger { background-color: #ff4d4f !important; }
                .bg-warning { background-color: #faad14 !important; }
                .btn-brand { background: #F28B00 !important; border-color: #F28B00 !important; color: #fff !important; }
                .btn-brand:hover { background: #e07a00 !important; border-color: #e07a00 !important; }
                .btn-brand-outline { border-color: #F28B00 !important; color: #F28B00 !important; }
                .btn-brand-outline:hover { background: #fffbf0 !important; }
                .custom-breadcrumb .ant-breadcrumb-link { font-size: 13px; color: #8c8c8c; }
                .text-success { color: #52c41a !important; }
                .text-danger { color: #ff4d4f !important; }
            `}</style>
        </div>
    );
};

export default PaymentReturnPage;

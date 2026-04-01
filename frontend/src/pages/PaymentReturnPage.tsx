import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Button, Result, Card, Typography, Descriptions, Tag, Breadcrumb, Modal, Radio, Space, Spin, Input, message } from 'antd';
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
    WarningOutlined,
    BankOutlined,
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
    const [processing, setProcessing] = useState(true);

    // Lấy order ID đang chờ VNPAY (được lưu trước khi redirect sang VNPAY)
    const pendingOrderId = sessionStorage.getItem('vnpay_pending_order_id');

    // ── Đổi phương thức thanh toán ─────────────────────────────
    const [switchModalOpen, setSwitchModalOpen] = useState(false);
    const [selectedMethod, setSelectedMethod] = useState<'cod' | 'vnpay'>('cod');
    const [switchLoading, setSwitchLoading] = useState(false);
    const [stockDepleted, setStockDepleted] = useState(false);
    const [stockOrderId, setStockOrderId] = useState<number | null>(null);
    const [refundBank, setRefundBank] = useState({ bank: '', accountName: '', accountNumber: '' });
    const [refundSubmitted, setRefundSubmitted] = useState(false);
    const [refundLoading, setRefundLoading] = useState(false);
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

    // Thanh toán thành công → xử lý payment + kiểm tra stock
    // Flow: IPN (optional) → verify-vnpay-payment (reliable, no signature needed)
    useEffect(() => {
        if (!isSuccess) {
            setProcessing(false);
            return;
        }
        if (didUpdatePayment.current) return;
        didUpdatePayment.current = true;

        sessionStorage.removeItem('vnpay_pending_order_id');

        const params: Record<string, string> = {};
        searchParams.forEach((value, key) => { params[key] = value; });

        console.log('[VNPAY DEBUG] Starting payment verification...', { txnRef, transactionNo });

        (async () => {
            try {
                // 1. Gọi IPN trước (optional — có thể fail do signature encoding)
                try {
                    const ipnRes = await axiosInstance.get('/payment/vnpay-ipn', { params });
                    console.log('[VNPAY DEBUG] IPN response:', ipnRes.data);
                } catch (ipnErr) {
                    console.warn('[VNPAY DEBUG] IPN failed:', ipnErr);
                }

                // 2. Gọi verify endpoint (RELIABLE — không cần VNPAY signature)
                console.log('[VNPAY DEBUG] Calling verify endpoint with:', { order_code: txnRef, transaction_no: transactionNo });
                const verifyRes = await axiosInstance.post('/client/checkout/verify-vnpay-payment', {
                    order_code: txnRef,
                    transaction_no: transactionNo,
                });
                console.log('[VNPAY DEBUG] Verify response:', verifyRes.data);

                if (verifyRes.data?.status === 'stock_depleted') {
                    console.log('[VNPAY DEBUG] ❌ Stock depleted detected!');
                    setStockDepleted(true);
                    setStockOrderId(verifyRes.data?.order_id ?? null);
                } else {
                    console.log('[VNPAY DEBUG] ✅ Payment OK, status:', verifyRes.data?.status);
                }
            } catch (verifyErr) {
                console.error('[VNPAY DEBUG] Verify failed:', verifyErr);
                // Fallback cuối cùng: thử return endpoint
                try {
                    const returnRes = await axiosInstance.get('/payment/vnpay-return', { params });
                    console.log('[VNPAY DEBUG] Return fallback response:', returnRes.data);
                    if (returnRes.data?.status === 'stock_depleted') {
                        setStockDepleted(true);
                    }
                } catch (returnErr) {
                    console.error('[VNPAY DEBUG] Return fallback also failed:', returnErr);
                }
            } finally {
                setProcessing(false);
                console.log('[VNPAY DEBUG] Processing complete');
            }
        })();
    }, [isSuccess, txnRef, transactionNo, searchParams]);

    // Đếm ngược tự chuyển trang chủ khi thanh toán thành công
    // Chỉ chạy SAU KHI processing xong và KHÔNG bị stock_depleted
    useEffect(() => {
        if (!isSuccess || stockDepleted || processing) return;
        const timer = setInterval(() => {
            setCountdown((c) => {
                if (c <= 1) { clearInterval(timer); navigate('/'); }
                return c - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [isSuccess, stockDepleted, processing, navigate]);

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

                {/* ── PROCESSING — Đang xác minh thanh toán ── */}
                {processing && isSuccess ? (
                    <Card className="shadow-lg border-0 rounded-4 overflow-hidden">
                        <div className="p-4 text-center" style={{ background: 'linear-gradient(135deg, #F28B00 0%, #f7a533 100%)' }}>
                            <CreditCardOutlined style={{ fontSize: 60, color: '#fff' }} className="mb-3" />
                            <Title level={2} className="text-white m-0 fw-bold">Đang xử lý thanh toán</Title>
                        </div>
                        <div className="p-5 text-center">
                            <Spin size="large" />
                            <Title level={4} className="mt-4 mb-2" style={{ color: '#374151' }}>Đang xác minh giao dịch...</Title>
                            <Text type="secondary" style={{ fontSize: '0.95rem' }}>
                                Vui lòng đợi trong giây lát, hệ thống đang xác nhận giao dịch và kiểm tra tồn kho.
                            </Text>
                        </div>
                    </Card>
                ) : stockDepleted ? (
                    <Card className="shadow-lg border-0 rounded-4 overflow-hidden">
                        <div className="p-4 text-center" style={{ background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)' }}>
                            <WarningOutlined style={{ fontSize: 64, color: '#fff' }} className="mb-3" />
                            <Title level={2} className="text-white m-0 fw-bold">Sản phẩm đã hết hàng!</Title>
                        </div>

                        <div className="p-4 p-md-5">
                            <Result
                                status="warning"
                                title={<span className="fw-bold fs-5">Rất tiếc, sản phẩm đã hết hàng trong lúc bạn thanh toán</span>}
                                subTitle={
                                    <span style={{ color: '#6b7280', fontSize: '0.95rem' }}>
                                        Trong quá trình bạn thực hiện thanh toán qua VNPAY, sản phẩm đã được người khác mua hết.
                                        Đơn hàng của bạn đã được tự động hủy. <strong style={{ color: '#F28B00' }}>Chúng tôi sẽ hoàn tiền lại cho bạn trong thời gian sớm nhất.</strong>
                                    </span>
                                }
                            />

                            <div className="order-summary-box-warning p-4 rounded-4 text-start mb-4 border border-dashed">
                                <Descriptions column={1} size="small" colon={false}>
                                    {txnRef && (
                                        <Descriptions.Item label={<Text type="secondary">Mã đơn hàng:</Text>}>
                                            <Text strong>{txnRef}</Text>
                                        </Descriptions.Item>
                                    )}
                                    {amount > 0 && (
                                        <Descriptions.Item label={<Text type="secondary">Số tiền sẽ hoàn:</Text>}>
                                            <Text strong className="text-danger" style={{ fontSize: '1.1rem' }}>{formatVND(amount)}</Text>
                                        </Descriptions.Item>
                                    )}
                                    {transactionNo && (
                                        <Descriptions.Item label={<Text type="secondary">Mã giao dịch:</Text>}>
                                            <Text copyable>{transactionNo}</Text>
                                        </Descriptions.Item>
                                    )}
                                    <Descriptions.Item label={<Text type="secondary">Trạng thái:</Text>}>
                                        <Tag color="orange" bordered={false} style={{ fontWeight: 600, fontSize: '0.85rem' }}>Chờ hoàn tiền</Tag>
                                    </Descriptions.Item>
                                </Descriptions>
                            </div>

                            {/* ── Form nhập thông tin ngân hàng hoàn tiền ── */}
                            {!refundSubmitted ? (
                                <div className="refund-bank-form p-4 rounded-4 mb-4" style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
                                    <Title level={5} className="mb-3" style={{ color: '#166534' }}>
                                        <BankOutlined className="me-2" />Nhập thông tin ngân hàng để nhận hoàn tiền
                                    </Title>
                                    <div className="mb-3">
                                        <Text type="secondary" className="d-block mb-1">Tên ngân hàng <span className="text-danger">*</span></Text>
                                        <Input
                                            placeholder="VD: Vietcombank, MB Bank, Techcombank..."
                                            value={refundBank.bank}
                                            onChange={(e) => setRefundBank(prev => ({ ...prev, bank: e.target.value }))}
                                            size="large"
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <Text type="secondary" className="d-block mb-1">Tên chủ tài khoản <span className="text-danger">*</span></Text>
                                        <Input
                                            placeholder="VD: NGUYEN VAN A"
                                            value={refundBank.accountName}
                                            onChange={(e) => setRefundBank(prev => ({ ...prev, accountName: e.target.value }))}
                                            size="large"
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <Text type="secondary" className="d-block mb-1">Số tài khoản <span className="text-danger">*</span></Text>
                                        <Input
                                            placeholder="VD: 0123456789"
                                            value={refundBank.accountNumber}
                                            onChange={(e) => setRefundBank(prev => ({ ...prev, accountNumber: e.target.value }))}
                                            size="large"
                                        />
                                    </div>
                                    <Button
                                        type="primary"
                                        size="large"
                                        block
                                        loading={refundLoading}
                                        className="rounded-pill btn-brand mt-2"
                                        disabled={!refundBank.bank.trim() || !refundBank.accountName.trim() || !refundBank.accountNumber.trim()}
                                        onClick={async () => {
                                            if (!stockOrderId) { message.error('Không tìm thấy mã đơn hàng.'); return; }
                                            setRefundLoading(true);
                                            try {
                                                await axiosInstance.post(`/client/orders/${stockOrderId}/cancel-request`, {
                                                    reason: 'Hệ thống hủy: Sản phẩm hết hàng sau thanh toán VNPAY',
                                                    refund_bank: refundBank.bank,
                                                    refund_account_name: refundBank.accountName,
                                                    refund_account_number: refundBank.accountNumber,
                                                });
                                                setRefundSubmitted(true);
                                                message.success('Đã gửi thông tin hoàn tiền thành công!');
                                            } catch (err: any) {
                                                message.error(err?.response?.data?.message ?? 'Có lỗi xảy ra, vui lòng thử lại.');
                                            } finally {
                                                setRefundLoading(false);
                                            }
                                        }}
                                    >
                                        Gửi thông tin hoàn tiền
                                    </Button>
                                </div>
                            ) : (
                                <div className="refund-success p-4 rounded-4 mb-4" style={{ background: '#f0fdf4', border: '1px solid #86efac' }}>
                                    <Result
                                        status="success"
                                        title={<span style={{ fontSize: '1rem' }}>Đã gửi thông tin hoàn tiền thành công!</span>}
                                        subTitle="Chúng tôi sẽ xử lý hoàn tiền trong 3-5 ngày làm việc. Bạn có thể theo dõi trạng thái trong Chi tiết đơn hàng."
                                    />
                                </div>
                            )}

                            <div className="d-flex gap-3 justify-content-center flex-wrap">
                                {stockOrderId && (
                                    <Button
                                        type="primary"
                                        size="large"
                                        className="rounded-pill px-4 btn-brand"
                                        onClick={() => navigate(`/orders/${stockOrderId}`)}
                                    >
                                        Xem chi tiết đơn hàng
                                    </Button>
                                )}
                                <Button
                                    size="large"
                                    icon={<HomeOutlined />}
                                    className="rounded-pill px-4 btn-brand-outline"
                                    onClick={() => navigate('/')}
                                >
                                    Về Trang chủ
                                </Button>
                                <Button
                                    size="large"
                                    icon={<ShoppingOutlined />}
                                    className="rounded-pill px-4"
                                    style={{ borderColor: '#6366f1', color: '#6366f1' }}
                                    onClick={() => navigate('/shop')}
                                >
                                    Tiếp tục mua sắm
                                </Button>
                            </div>
                        </div>
                    </Card>
                ) : (
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
                )}
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
                .order-summary-box-warning { background: #fffbeb !important; }
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

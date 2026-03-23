import React, { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Button, Result, Card, Typography, Descriptions, Tag, Breadcrumb } from 'antd';
import { axiosInstance } from '../api/axios';
import {
    HomeOutlined,
    ShoppingOutlined,
    CheckCircleOutlined,
    CloseCircleOutlined,
    ClockCircleOutlined
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
        status: 'info'
    };

    const didUpdatePayment = useRef(false);
    const didCancelOrder = useRef(false);

    const formatPayDate = (raw: string) => {
        if (raw.length !== 14) return raw;
        return `${raw.slice(6, 8)}/${raw.slice(4, 6)}/${raw.slice(0, 4)} ${raw.slice(8, 10)}:${raw.slice(10, 12)}:${raw.slice(12, 14)}`;
    };

    // Thanh toán thành công → gọi IPN để cập nhật DB, xóa sessionStorage
    useEffect(() => {
        if (!isSuccess) return;
        if (didUpdatePayment.current) return;
        didUpdatePayment.current = true;

        // Xóa pending order id vì đã thanh toán thành công
        sessionStorage.removeItem('vnpay_pending_order_id');

        const params: Record<string, string> = {};
        searchParams.forEach((value, key) => {
            params[key] = value;
        });

        (async () => {
            try {
                await axiosInstance.get('/payment/vnpay-ipn', { params });
            } catch {
                // Không chặn luồng UI
            }
        })();
    }, [isSuccess, txnRef, searchParams]);

    // Thanh toán THẤT BẠI / HỦY → tự động hủy đơn hàng và hoàn kho
    useEffect(() => {
        if (isSuccess) return;
        if (didCancelOrder.current) return;
        didCancelOrder.current = true;

        const pendingOrderId = sessionStorage.getItem('vnpay_pending_order_id');
        if (!pendingOrderId) return;

        (async () => {
            try {
                await axiosInstance.post(`/client/orders/${pendingOrderId}/cancel-vnpay`);
            } catch {
                // Lỗi im lặng — đơn có thể đã được xử lý trước đó
            } finally {
                sessionStorage.removeItem('vnpay_pending_order_id');
            }
        })();
    }, [isSuccess]);

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

    return (
        <div className="payment-return-container py-5 min-vh-100 bg-light d-flex align-items-center">
            <div className="container">
                {/* Simplified Breadcrumb matching project layout */}
                <Breadcrumb className="mb-4 custom-breadcrumb">
                    <Breadcrumb.Item><Link to="/">Trang chủ</Link></Breadcrumb.Item>
                    <Breadcrumb.Item>Kết quả thanh toán</Breadcrumb.Item>
                </Breadcrumb>

                <Card className="shadow-lg border-0 rounded-4 overflow-hidden">
                    <div className={`p-4 text-center ${isSuccess ? 'bg-success' : responseCode === '24' ? 'bg-warning' : 'bg-danger'}`}>
                        {isSuccess ? (
                            <CheckCircleOutlined style={{ fontSize: 60, color: '#fff' }} className="mb-3" />
                        ) : (
                            <CloseCircleOutlined style={{ fontSize: 60, color: '#fff' }} className="mb-3" />
                        )}
                        <Title level={2} className="text-white m-0 fw-bold">{responseInfo.title}</Title>
                    </div>

                    <div className="p-4 p-md-5">
                        <Result
                            status={responseInfo.status}
                            title={<span className="fw-bold fs-5">{responseInfo.detail}</span>}
                        />

                        <div className="order-summary-box p-4 bg-light rounded-4 text-start mb-4 border border-dashed">
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
                                        <Tag bordered={false} className="bg-white text-primary fw-bold" style={{ border: '1px solid #e8e8e8' }}>{bankCode}</Tag>
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
                                <Text strong className="text-primary">{countdown}s</Text>
                            </div>
                        )}

                        <div className="d-flex gap-3 justify-content-center flex-wrap">
                            <Button
                                size="large"
                                icon={<HomeOutlined />}
                                className="rounded-pill px-4 btn-brand-outline"
                                onClick={() => navigate('/')}
                            >
                                Về Trang chủ
                            </Button>

                            {isSuccess ? (
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
                                <Button
                                    type="primary"
                                    danger={responseCode !== '24'}
                                    size="large"
                                    icon={<ShoppingOutlined />}
                                    className="rounded-pill px-4"
                                    onClick={() => navigate('/cart')}
                                    style={responseCode === '24' ? { background: '#F28B00', borderColor: '#F28B00' } : {}}
                                >
                                    Về giỏ hàng và thanh toán lại
                                </Button>
                            )}
                        </div>
                    </div>
                </Card>
            </div>
            <style>{`
                .order-summary-box { background: #f0fdf4 !important; }
                .bg-light { background-color: #f8f9fa !important; }
                .bg-success { background-color: #52c41a !important; }
                .bg-danger { background-color: #ff4d4f !important; }
                .bg-warning { background-color: #faad14 !important; }
                .text-brand { color: #F28B00 !important; }
                .btn-brand { background: #F28B00 !important; border-color: #F28B00 !important; color: #fff !important; }
                .btn-brand:hover { background: #e07a00 !important; border-color: #e07a00 !important; }
                .btn-brand-outline { border-color: #F28B00 !important; color: #F28B00 !important; }
                .btn-brand-outline:hover { background: #fffbf0 !important; }
                .custom-breadcrumb .ant-breadcrumb-link { font-size: 13px; color: #8c8c8c; }
                .text-primary { color: #F28B00 !important; }
            `}</style>
        </div>
    );
};

export default PaymentReturnPage;


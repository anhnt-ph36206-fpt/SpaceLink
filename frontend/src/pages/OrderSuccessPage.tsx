import React from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { Button, Result, Card, Typography } from 'antd';
import { HomeOutlined, CheckCircleOutlined, ShoppingOutlined, EyeOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

const OrderSuccessPage: React.FC = () => {
    const { orderCode } = useParams();
    const location = useLocation();
    const navigate = useNavigate();
    const orderData = location.state?.order;

    const formatVND = (v: number) =>
        new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);

    return (
        <div className="order-success-container py-5 min-vh-100 bg-light d-flex align-items-center">
            <div className="container" style={{ maxWidth: 700 }}>
                <Card className="shadow-lg border-0 rounded-4 overflow-hidden">
                    <div className="p-4 bg-success text-center">
                        <CheckCircleOutlined style={{ fontSize: 60, color: '#fff' }} className="mb-3" />
                        <Title level={2} className="text-white m-0">Đặt hàng thành công!</Title>
                    </div>

                    <div className="p-5 text-center">
                        <Result
                            status="success"
                            title={<span className="fw-bold">Mã đơn hàng: {orderCode}</span>}
                            subTitle="Cảm ơn bạn đã tin tưởng mua sắm tại SpaceLink! Đơn hàng của bạn đang được xử lý và sẽ sớm được giao tới địa chỉ của bạn."
                        />

                        {orderData && (
                            <div className="order-summary-box p-4 bg-light rounded-4 text-start mb-4 border border-dashed">
                                <div className="d-flex justify-content-between mb-2">
                                    <Text type="secondary">Tổng tiền:</Text>
                                    <Text strong className="text-danger">{formatVND(orderData.total_amount)}</Text>
                                </div>
                                <div className="d-flex justify-content-between mb-2">
                                    <Text type="secondary">Hình thức thanh toán:</Text>
                                    <Text strong>{orderData.payment_method === 'cod' ? 'Thanh toán khi nhận hàng' : 'Chuyển khoản ngân hàng'}</Text>
                                </div>
                                <div className="d-flex justify-content-between">
                                    <Text type="secondary">Trạng thái:</Text>
                                    <Text strong className="text-primary">Đang chờ xác nhận</Text>
                                </div>
                            </div>
                        )}

                        <div className="d-flex gap-3 justify-content-center flex-wrap">
                            <Button
                                type="primary"
                                size="large"
                                icon={<HomeOutlined />}
                                className="rounded-pill px-4"
                                onClick={() => navigate('/')}
                            >
                                Về Trang chủ
                            </Button>
                            {orderData?.order_id && (
                                <Button
                                    size="large"
                                    icon={<EyeOutlined />}
                                    className="rounded-pill px-4 btn-track-order"
                                    style={{
                                        background: '#F28B00',
                                        borderColor: '#F28B00',
                                        color: '#fff',
                                        fontWeight: 600,
                                    }}
                                    onClick={() => navigate(`/orders/${orderData.order_id}`)}
                                >
                                    Theo dõi đơn hàng
                                </Button>
                            )}
                            <Button
                                size="large"
                                icon={<ShoppingOutlined />}
                                className="rounded-pill px-4"
                                onClick={() => navigate('/shop')}
                            >
                                Tiếp tục mua sắm
                            </Button>
                        </div>
                    </div>
                </Card>
            </div>
            <style>{`
                .order-summary-box { background: #f0fdf4 !important; }
                .btn-track-order:hover { background: #e07a00 !important; border-color: #e07a00 !important; color: #fff !important; box-shadow: 0 4px 14px rgba(242, 139, 0, 0.35); }
            `}</style>
        </div>
    );
};

export default OrderSuccessPage;

import React from 'react';
import ServiceItem from '../common/ServiceItem';
// Nếu bạn chưa có file types, có thể định nghĩa tạm ở đây hoặc giữ nguyên import cũ
// import { ServiceItem as ServiceItemType } from '../../types';

interface ServiceItemType {
    icon: string;
    title: string;
    description: string;
}

const ServicesSection: React.FC = () => {
    const services: ServiceItemType[] = [
        {
            icon: 'fas fa-check-circle', // Icon tích tròn (Uy tín)
            title: '100% Chính Hãng',
            description: 'Cam kết sản phẩm chất lượng',
        },
        {
            icon: 'fas fa-shipping-fast', // Icon xe tải nhanh
            title: 'Miễn Phí Vận Chuyển',
            description: 'Cho đơn hàng bán kính 5km',
        },
        {
            icon: 'fas fa-sync-alt', // Icon đổi trả
            title: 'Đổi Trả Dễ Dàng',
            description: '1 đổi 1 trong 30 ngày đầu',
        },
        {
            icon: 'fas fa-headset', // Icon tai nghe (Hỗ trợ)
            title: 'Hỗ Trợ 24/7',
            description: 'Tư vấn kỹ thuật trọn đời',
        },
        {
            icon: 'fas fa-shield-alt', // Icon cái khiên (Bảo mật/Bảo hành)
            title: 'Bảo Hành Uy Tín',
            description: 'Bảo hành chính hãng 12 tháng',
        },
        {
            icon: 'fas fa-lock', // Icon ổ khóa
            title: 'Thanh Toán An Toàn',
            description: 'Bảo mật thông tin tuyệt đối',
        },
    ];

    // Tạo độ trễ hiệu ứng xuất hiện lần lượt
    const delays = ['0.1s', '0.2s', '0.3s', '0.4s', '0.5s', '0.6s'];

    return (
        <div className="container-fluid px-0 wow fadeIn" data-wow-delay="0.1s">
            <div className="row g-0">
                {services.map((service, index) => (
                    <ServiceItem
                        key={index}
                        service={service}
                        delay={delays[index]}
                    />
                ))}
            </div>
        </div>
    );
};

export default ServicesSection;
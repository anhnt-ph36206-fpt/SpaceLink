import React from 'react';
import ServiceItem from '../common/ServiceItem';
import { ServiceItem as ServiceItemType } from '../../types';

const ServicesSection: React.FC = () => {
    const services: ServiceItemType[] = [
        {
            icon: 'fa fa-sync-alt',
            title: 'Free Return',
            description: '30 days money back guarantee!',
        },
        {
            icon: 'fab fa-telegram-plane',
            title: 'Free Shipping',
            description: 'Free shipping on all order',
        },
        {
            icon: 'fas fa-life-ring',
            title: 'Support 24/7',
            description: 'We support online 24 hrs a day',
        },
        {
            icon: 'fas fa-credit-card',
            title: 'Receive Gift Card',
            description: 'Recieve gift all over oder $50',
        },
        {
            icon: 'fas fa-lock',
            title: 'Secure Payment',
            description: 'We Value Your Security',
        },
        {
            icon: 'fas fa-blog',
            title: 'Online Service',
            description: 'Free return products in 30 days',
        },
    ];

    const delays = ['0.1s', '0.2s', '0.3s', '0.4s', '0.5s', '0.6s'];

    return (
        <div className="container-fluid px-0">
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

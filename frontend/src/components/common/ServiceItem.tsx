import React from 'react';
import type {ServiceItem as ServiceItemType} from '../../types';

interface ServiceItemProps {
    service: ServiceItemType;
    delay?: string;
}

const ServiceItem: React.FC<ServiceItemProps> = ({ service, delay = '0.1s' }) => {
    return (
        <div className="col-6 col-md-4 col-lg-2 border-end wow fadeInUp" data-wow-delay={delay}>
            <div className="p-4">
                <div className="d-flex align-items-center">
                    <i className={`${service.icon} fa-2x text-primary`}></i>
                    <div className="ms-4">
                        <h6 className="text-uppercase mb-2">{service.title}</h6>
                        <p className="mb-0">{service.description}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ServiceItem;

import React, { useEffect, useState } from 'react';

const BackToTop: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        const toggleVisibility = () => {
            if (window.scrollY > 300) {
                setIsVisible(true);
            } else {
                setIsVisible(false);
            }
        };

        window.addEventListener('scroll', toggleVisibility);

        return () => {
            window.removeEventListener('scroll', toggleVisibility);
        };
    }, []);

    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth',
        });
    };

    return (
        <a
            href="#"
            className={`btn btn-primary btn-lg-square back-to-top ${isVisible ? 'show' : ''}`}
            onClick={(e) => {
                e.preventDefault();
                scrollToTop();
            }}
            style={{ display: isVisible ? 'block' : 'none' }}
        >
            <i className="fa fa-arrow-up"></i>
        </a>
    );
};

export default BackToTop;

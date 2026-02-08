import React, { ReactNode, useEffect } from 'react';
import Header from './Header';
import Navbar from './Navbar';
import Footer from './Footer';
import BackToTop from '../common/BackToTop';
import Spinner from '../common/Spinner';
// import '/assets/client/lib/animate/animate.min.css';
// import '/assets/client/lib/owlcarousel/assets/owl.carousel.min.css';
// import '/assets/client/lib/owlcarousel/assets/owl.theme.default.min.css';
// import '/assets/client/css/bootstrap.min.css';
// import '/assets/client/css/style.css';



interface LayoutProps {
    children: ReactNode;
    showSpinner?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, showSpinner = false }) => {

    useEffect(() => {
        const scripts = [
            'https://ajax.googleapis.com/ajax/libs/jquery/3.6.4/jquery.min.js',
            'https://cdn.jsdelivr.net/npm/bootstrap@5.0.0/dist/js/bootstrap.bundle.min.js',
            '/assets/client/lib/wow/wow.min.js',
            '/assets/client/lib/owlcarousel/owl.carousel.min.js',
            '/assets/client/js/main.js'
        ];

        const scriptElements = scripts.map(src => {
            const s = document.createElement('script');
            s.src = src;
            s.async = false;
            document.body.appendChild(s);
            return s;
        });

        return () => {
            scriptElements.forEach(s => {
                if (s && s.parentNode) {
                    document.body.removeChild(s);
                }
            });
        };
    }, []);

    return (
        <>
            {showSpinner && <Spinner />}
            <Header />
            <Navbar />
            <main>{children}</main>
            <Footer />
            <BackToTop />
        </>
    );
};

export default Layout;

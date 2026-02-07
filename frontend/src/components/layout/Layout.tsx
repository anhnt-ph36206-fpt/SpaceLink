import React, { ReactNode } from 'react';
import Header from './Header';
import Navbar from './Navbar';
import Footer from './Footer';
import BackToTop from '../common/BackToTop';
import Spinner from '../common/Spinner';

interface LayoutProps {
    children: ReactNode;
    showSpinner?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, showSpinner = false }) => {

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

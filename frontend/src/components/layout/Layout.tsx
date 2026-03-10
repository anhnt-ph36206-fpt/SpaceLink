import React, { type ReactNode } from 'react';
import Header from './Header';
import Navbar from './Navbar';
import Footer from './Footer';
import BackToTop from '../common/BackToTop';
import Spinner from '../common/Spinner';
import CompareBar from '../common/CompareBar';

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
            <CompareBar />
        </>
    );
};

export default Layout;

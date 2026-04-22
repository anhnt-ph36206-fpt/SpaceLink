import React, { type ReactNode } from 'react';
import Header from './Header';
import Navbar from './Navbar';
import Footer from './Footer';
import BackToTop from '../common/BackToTop';
import Spinner from '../common/Spinner';
import CompareBar from '../common/CompareBar';
import ChatbotWidget from '../common/ChatbotWidget';

interface LayoutProps {
    children: ReactNode;
    showSpinner?: boolean;
}

const Layout: React.FC<LayoutProps> = ({ children, showSpinner = false }) => {
    return (
        <>
            {showSpinner && <Spinner />}
            <div className="d-flex flex-column">
                <div className="order-2 order-lg-1">
                    <Header />
                </div>
                <div className="order-1 order-lg-2">
                    <Navbar />
                </div>
            </div>
            <main>{children}</main>
            <Footer />
            <BackToTop />
            <CompareBar />
            <ChatbotWidget />
        </>
    );
};

export default Layout;

import React, { useEffect, type ReactNode } from 'react';
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

const FASTBOTS_BOT_ID = 'cmnrs81fm03lppb1oljk89f1r';

const Layout: React.FC<LayoutProps> = ({ children, showSpinner = false }) => {

    useEffect(() => {
        const script = document.createElement('script');
        script.src = 'https://app.fastbots.ai/embed.js';
        script.defer = true;
        script.setAttribute('data-bot-id', FASTBOTS_BOT_ID);
        script.id = 'fastbots-embed-script';
        document.body.appendChild(script);

        return () => {
            // Remove script
            document.getElementById('fastbots-embed-script')?.remove();
            // Remove any widget elements injected by FastBots
            document.querySelectorAll('[id^="fastbots"], fastbots-widget, .fastbots-widget').forEach(el => el.remove());
        };
    }, []);

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
        </>
    );
};

export default Layout;

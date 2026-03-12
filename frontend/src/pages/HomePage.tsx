import React from 'react';
import HeroSlider from '../components/home/HeroSlider';
import ServicesSection from '../components/home/ServicesSection';
import ProductOffers from '../components/home/ProductOffers';
import ProductTabs from '../components/home/ProductTabs';
import { ProductBanner } from '../components/home/ProductBanner';

const HomePage: React.FC = () => {
    return (
        <>
            {/* Hero Carousel */}
            <HeroSlider />

            {/* Banner quảng cáo (dynamic từ API) */}
            <ProductBanner />

            {/* Services Section */}
            <ServicesSection />

    
          

            {/* Product Offers */}
            <ProductOffers />

      
       

            {/* Our Products Tabs */}
            <ProductTabs />
        </>
    );
};

export default HomePage;

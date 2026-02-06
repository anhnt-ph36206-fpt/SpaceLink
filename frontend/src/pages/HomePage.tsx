import React from 'react';
import HeroSlider from '../components/home/HeroSlider';
import ServicesSection from '../components/home/ServicesSection';
import ProductOffers from '../components/home/ProductOffers';
import ProductTabs from '../components/home/ProductTabs';

const HomePage: React.FC = () => {
    return (
        <>
            {/* Hero Carousel */}
            <HeroSlider />

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

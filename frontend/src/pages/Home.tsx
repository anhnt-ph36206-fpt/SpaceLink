import { Spinner } from '../components/layout/Spinner'
import { Topbar } from '../components/layout/Topbar'
import { Navbar } from '../components/layout/Navbar'
import { NavbarHero } from '../components/layout/NavbarHero'
import { Footer } from '../components/layout/Footer'
import { Copyright } from '../components/layout/Copyright'
import { BackToTop } from '../components/layout/BackToTop'
import { HeroCarousel } from '../components/home/HeroCarousel'
import { ServicesBar } from '../components/home/ServicesBar'
import { ProductOffers } from '../components/home/ProductOffers'
import { OurProducts } from '../components/home/OurProducts'
import { ProductBanner } from '../components/home/ProductBanner'
import { ProductListCarousel } from '../components/home/ProductListCarousel'
import { BestsellerCarousel } from '../components/home/BestsellerCarousel'

export function Home() {
  return (
    <>
      <Spinner />
      <Topbar />
      <Navbar />
      <NavbarHero />
      <HeroCarousel />
      <ServicesBar />
      <ProductOffers />
      <OurProducts />
      <ProductBanner />
      <ProductListCarousel />
      <BestsellerCarousel />
      <Footer />
      <Copyright />
      <BackToTop />
    </>
  )
}

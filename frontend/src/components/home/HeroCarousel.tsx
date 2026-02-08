import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Navigation } from 'swiper/modules'

const slides = [
  {
    id: 1,
    title: 'Save Up To A $400',
    subtitle: 'On Selected Laptops & Desktop Or Smartphone',
    img: '/img/carousel-1.png',
    cta: 'Shop Now',
  },
  {
    id: 2,
    title: 'Save Up To A $200',
    subtitle: 'On Selected Laptops & Desktop Or Smartphone',
    img: '/img/carousel-2.png',
    cta: 'Shop Now',
  },
]

export function HeroCarousel() {
  return (
    <div className="container-fluid carousel bg-light px-0">
      <div className="row g-0 justify-content-end">
        <div className="col-12 col-lg-7 col-xl-9">
          <Swiper
            modules={[Autoplay, Navigation]}
            autoplay={{ delay: 3000, disableOnInteraction: false }}
            navigation
            loop
            className="header-carousel bg-light py-5"
          >
            {slides.map((s) => (
              <SwiperSlide key={s.id}>
                <div className="row g-0 header-carousel-item align-items-center">
                  <div className="col-xl-6 carousel-img">
                    <img src={s.img} className="img-fluid w-100" alt="" />
                  </div>
                  <div className="col-xl-6 carousel-content p-4">
                    <h4 className="text-uppercase fw-bold mb-4" style={{ letterSpacing: '3px' }}>
                      {s.title}
                    </h4>
                    <h1 className="display-3 text-capitalize mb-4">{s.subtitle}</h1>
                    <p className="text-dark">Terms and Condition Apply</p>
                    <a href="#" className="btn btn-primary rounded-pill py-3 px-5">
                      {s.cta}
                    </a>
                  </div>
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
        <div className="col-12 col-lg-5 col-xl-3">
          <div className="carousel-header-banner h-100 position-relative">
            <img
              src="/img/header-img.jpg"
              className="img-fluid w-100 h-100"
              style={{ objectFit: 'cover' }}
              alt=""
            />
            <div className="carousel-banner-offer">
              <p className="bg-primary text-white rounded fs-5 py-2 px-4 mb-0 me-3">Save $48.00</p>
              <p className="text-primary fs-5 fw-bold mb-0">Special Offer</p>
            </div>
            <div className="carousel-banner">
              <div className="carousel-banner-content text-center p-4">
                <a href="#" className="d-block mb-2 text-white text-decoration-none">
                  SmartPhone
                </a>
                <a href="#" className="d-block text-white fs-3 text-decoration-none">
                  Apple iPad Mini <br /> G2356
                </a>
                <del className="me-2 text-white fs-5">$1,250.00</del>
                <span className="text-primary fs-5">$1,050.00</span>
              </div>
              <a href="#" className="btn btn-primary rounded-pill py-2 px-4">
                Add To Cart
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

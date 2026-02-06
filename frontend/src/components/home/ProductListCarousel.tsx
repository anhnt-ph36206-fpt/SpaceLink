import { Swiper, SwiperSlide } from 'swiper/react'
import { Autoplay, Navigation } from 'swiper/modules'
import { Eye, ShoppingCart, Shuffle, Heart } from 'lucide-react'

const productGroups = [
  [
    { id: '1', img: '/img/product-4.png', category: 'SmartPhone', name: 'Apple iPad Mini G2356', price: 1250, sale: 1050 },
    { id: '2', img: '/img/product-6.png', category: 'SmartPhone', name: 'Apple iPad Mini G2356', price: 1250, sale: 1050 },
    { id: '3', img: '/img/product-7.png', category: 'SmartPhone', name: 'Apple iPad Mini G2356', price: 1250, sale: 1050 },
  ],
  [
    { id: '4', img: '/img/product-8.png', category: 'SmartPhone', name: 'Apple iPad Mini G2356', price: 1250, sale: 1050 },
    { id: '5', img: '/img/product-9.png', category: 'SmartPhone', name: 'Apple iPad Mini G2356', price: 1250, sale: 1050 },
    { id: '6', img: '/img/product-10.png', category: 'SmartPhone', name: 'Apple iPad Mini G2356', price: 1250, sale: 1050 },
  ],
]

function MiniProductItem({ p }: { p: (typeof productGroups)[0][0] }) {
  return (
    <div className="productImg-item products-mini-item border rounded">
      <div className="row g-0">
        <div className="col-5">
          <div className="products-mini-img border-end h-100 position-relative">
            <img src={p.img} className="img-fluid w-100 h-100" alt={p.name} />
            <div className="products-mini-icon rounded-circle bg-primary position-absolute top-50 start-50 translate-middle d-flex align-items-center justify-content-center">
              <a href="#" className="text-white">
                <Eye size={20} />
              </a>
            </div>
          </div>
        </div>
        <div className="col-7">
          <div className="products-mini-content p-3">
            <a href="#" className="d-block mb-2 text-muted text-decoration-none small">{p.category}</a>
            <a href="#" className="d-block h6 text-dark text-decoration-none">{p.name}</a>
            <del className="me-2 fs-6 text-muted">${p.price}</del>
            <span className="text-primary fs-6">${p.sale}</span>
          </div>
        </div>
      </div>
      <div className="products-mini-add border p-3 rounded-bottom">
        <a href="#" className="btn btn-primary rounded-pill py-2 px-4 text-decoration-none">
          <ShoppingCart className="me-2" size={16} />
          Add To Cart
        </a>
        <div className="d-flex">
          <button className="rounded-circle btn-sm-square border bg-transparent text-primary d-flex align-items-center justify-content-center me-2 p-0">
            <Shuffle size={14} />
          </button>
          <button className="rounded-circle btn-sm-square border bg-transparent text-primary d-flex align-items-center justify-content-center p-0">
            <Heart size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

export function ProductListCarousel() {
  return (
    <div className="container-fluid products productList overflow-hidden">
      <div className="container products-mini py-5">
        <div className="mx-auto text-center mb-5" style={{ maxWidth: 900 }}>
          <h4 className="text-primary border-bottom border-primary border-2 d-inline-block p-2">
            Products
          </h4>
          <h1 className="mb-0 display-3">All Product Items</h1>
        </div>
        <Swiper
          modules={[Autoplay, Navigation]}
          autoplay={{ delay: 3000 }}
          navigation
          loop
          spaceBetween={25}
          breakpoints={{
            0: { slidesPerView: 1 },
            768: { slidesPerView: 2 },
            992: { slidesPerView: 2 },
            1200: { slidesPerView: 3 },
          }}
        >
          {productGroups.map((group, i) => (
            <SwiperSlide key={i}>
              <div className="d-flex flex-column gap-3">
                {group.map((p) => (
                  <MiniProductItem key={p.id} p={p} />
                ))}
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
      </div>
    </div>
  )
}

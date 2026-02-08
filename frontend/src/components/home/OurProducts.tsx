import { useState } from 'react'
import { ProductCard } from '../product/ProductCard'

const tabs = [
  { id: 'tab-1', label: 'All Products' },
  { id: 'tab-2', label: 'New Arrivals' },
  { id: 'tab-3', label: 'Featured' },
  { id: 'tab-4', label: 'Top Selling' },
]

const products = [
  { id: '1', name: 'Apple iPad Mini G2356', category: 'SmartPhone', price: 1250, salePrice: 1050, image: '/img/product-3.png', badge: 'new' as const, rating: 4 },
  { id: '2', name: 'Apple iPad Mini G2356', category: 'SmartPhone', price: 1250, salePrice: 1050, image: '/img/product-4.png', badge: 'sale' as const, rating: 4 },
  { id: '3', name: 'Apple iPad Mini G2356', category: 'SmartPhone', price: 1250, salePrice: 1050, image: '/img/product-5.png', rating: 4 },
  { id: '4', name: 'Apple iPad Mini G2356', category: 'SmartPhone', price: 1250, salePrice: 1050, image: '/img/product-6.png', badge: 'new' as const, rating: 4 },
  { id: '5', name: 'Apple iPad Mini G2356', category: 'SmartPhone', price: 1250, salePrice: 1050, image: '/img/product-7.png', badge: 'sale' as const, rating: 4 },
  { id: '6', name: 'Apple iPad Mini G2356', category: 'SmartPhone', price: 1250, salePrice: 1050, image: '/img/product-8.png', rating: 4 },
  { id: '7', name: 'Apple iPad Mini G2356', category: 'SmartPhone', price: 1250, salePrice: 1050, image: '/img/product-9.png', badge: 'new' as const, rating: 4 },
  { id: '8', name: 'Apple iPad Mini G2356', category: 'SmartPhone', price: 1250, salePrice: 1050, image: '/img/product-10.png', badge: 'sale' as const, rating: 4 },
]

export function OurProducts() {
  const [activeTab, setActiveTab] = useState('tab-1')

  return (
    <div className="container-fluid product py-5">
      <div className="container py-5">
        <div className="tab-class">
          <div className="row g-4 mb-5">
            <div className="col-lg-4 text-start">
              <h1>Our Products</h1>
            </div>
            <div className="col-lg-8 text-end">
              <ul className="nav nav-pills d-inline-flex text-center">
                {tabs.map((tab) => (
                  <li key={tab.id} className="nav-item mb-4">
                    <button
                      className={`d-flex mx-2 py-2 rounded-pill border-0 ${
                        activeTab === tab.id ? 'bg-primary text-white' : 'bg-light'
                      }`}
                      style={{ width: 130 }}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <span className="mx-auto">{tab.label}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="tab-content">
            <div className={activeTab === 'tab-1' ? 'tab-pane fade show active' : 'tab-pane fade'}>
              <div className="row g-4">
                {products.map((p) => (
                  <div key={p.id} className="col-md-6 col-lg-4 col-xl-3">
                    <ProductCard {...p} />
                  </div>
                ))}
              </div>
            </div>
            <div className={activeTab === 'tab-2' ? 'tab-pane fade show active' : 'tab-pane fade'}>
              <div className="row g-4">
                {products.filter((p) => p.badge === 'new').map((p) => (
                  <div key={p.id} className="col-md-6 col-lg-4 col-xl-3">
                    <ProductCard {...p} />
                  </div>
                ))}
              </div>
            </div>
            <div className={activeTab === 'tab-3' ? 'tab-pane fade show active' : 'tab-pane fade'}>
              <div className="row g-4">
                {products.slice(0, 4).map((p) => (
                  <div key={p.id} className="col-md-6 col-lg-4 col-xl-3">
                    <ProductCard {...p} />
                  </div>
                ))}
              </div>
            </div>
            <div className={activeTab === 'tab-4' ? 'tab-pane fade show active' : 'tab-pane fade'}>
              <div className="row g-4">
                {products.filter((p) => p.badge === 'sale').map((p) => (
                  <div key={p.id} className="col-md-6 col-lg-4 col-xl-3">
                    <ProductCard {...p} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

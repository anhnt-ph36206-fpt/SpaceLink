import { Link } from 'react-router-dom'
import { ShoppingCart, Eye, Shuffle, Heart, Star } from 'lucide-react'

export interface ProductCardProps {
  id: string
  name: string
  category: string
  price: number
  salePrice?: number
  image: string
  badge?: 'new' | 'sale'
  rating?: number
}

export function ProductCard({
  id,
  name,
  category,
  price,
  salePrice,
  image,
  badge,
  rating = 4,
}: ProductCardProps) {
  return (
    <div className="product-item rounded">
      <div className="product-item-inner border rounded">
        <div className="product-item-inner-item">
          <img src={image} className="img-fluid w-100 rounded-top" alt={name} loading="lazy" />
          {badge && (
            <div className={badge === 'new' ? 'product-new' : 'product-sale'}>
              {badge.charAt(0).toUpperCase() + badge.slice(1)}
            </div>
          )}
          <div className="product-details">
            <Link to={`/product/${id}`} className="d-flex align-items-center justify-content-center w-100 h-100 text-decoration-none">
              <Eye size={24} />
            </Link>
          </div>
        </div>
        <div className="text-center rounded-bottom p-4">
          <Link to="#" className="d-block mb-2 text-muted text-decoration-none">{category}</Link>
          <Link to={`/product/${id}`} className="d-block h4 text-dark text-decoration-none">{name}</Link>
          {salePrice ? (
            <>
              <del className="me-2 fs-5 text-muted">${price.toLocaleString()}</del>
              <span className="text-primary fs-5">${salePrice.toLocaleString()}</span>
            </>
          ) : (
            <span className="text-primary fs-5">${price.toLocaleString()}</span>
          )}
        </div>
      </div>
      <div className="product-item-add border border-top-0 rounded-bottom text-center p-4 pt-0">
        <Link
          to="#"
          className="btn btn-primary border-secondary rounded-pill py-2 px-4 mb-4 text-decoration-none"
        >
          <ShoppingCart className="me-2" size={18} />
          Add To Cart
        </Link>
        <div className="d-flex justify-content-between align-items-center">
          <div className="d-flex">
            {[1, 2, 3, 4, 5].map((i) => (
              <Star
                key={i}
                size={16}
                className={i <= rating ? 'text-primary' : 'text-muted'}
                fill={i <= rating ? 'currentColor' : 'none'}
              />
            ))}
          </div>
          <div className="d-flex">
            <button className="rounded-circle btn-sm-square border border-primary bg-transparent text-primary d-flex align-items-center justify-content-center me-3 p-0">
              <Shuffle size={16} />
            </button>
            <button className="rounded-circle btn-sm-square border border-primary bg-transparent text-primary d-flex align-items-center justify-content-center p-0">
              <Heart size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

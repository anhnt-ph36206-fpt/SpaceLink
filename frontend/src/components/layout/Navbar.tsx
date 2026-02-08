import { Link } from 'react-router-dom'
import { Search, Shuffle, Heart, ShoppingCart } from 'lucide-react'

export function Navbar() {
  return (
    <div className="container-fluid px-5 py-4 d-none d-lg-block">
      <div className="row gx-0 align-items-center text-center">
        <div className="col-md-4 col-lg-3 text-center text-lg-start">
          <Link to="/" className="navbar-brand p-0 text-decoration-none">
            <h1 className="display-5 text-primary m-0">
              <ShoppingCart className="text-secondary me-2 d-inline" size={32} />
              Electro
            </h1>
          </Link>
        </div>
        <div className="col-md-4 col-lg-6 text-center">
          <div className="position-relative ps-4">
            <div className="d-flex border rounded-pill">
              <input
                className="form-control border-0 rounded-pill w-100 py-3"
                type="text"
                placeholder="Search Looking For?"
              />
              <select className="form-select text-dark border-0 border-start rounded-0 p-3" style={{ width: 200 }}>
                <option>All Category</option>
                <option>Category 1</option>
                <option>Category 2</option>
                <option>Category 3</option>
              </select>
              <button type="button" className="btn btn-primary rounded-pill py-3 px-5" style={{ border: 0 }}>
                <Search size={20} />
              </button>
            </div>
          </div>
        </div>
        <div className="col-md-4 col-lg-3 text-center text-lg-end">
          <div className="d-inline-flex align-items-center">
            <a href="#" className="text-muted d-flex align-items-center justify-content-center me-3">
              <span className="rounded-circle btn-md-square border d-flex align-items-center justify-content-center p-2">
                <Shuffle size={18} />
              </span>
            </a>
            <a href="#" className="text-muted d-flex align-items-center justify-content-center me-3">
              <span className="rounded-circle btn-md-square border d-flex align-items-center justify-content-center p-2">
                <Heart size={18} />
              </span>
            </a>
            <a href="#" className="text-muted d-flex align-items-center justify-content-center">
              <span className="rounded-circle btn-md-square border d-flex align-items-center justify-content-center p-2 me-2">
                <ShoppingCart size={18} />
              </span>
              <span className="text-dark">$0.00</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}

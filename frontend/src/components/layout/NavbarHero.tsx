import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Menu, ChevronDown } from 'lucide-react'

const categories = [
  { name: 'Accessories', count: 3 },
  { name: 'Electronics & Computer', count: 5 },
  { name: 'Laptops & Desktops', count: 2 },
  { name: 'Mobiles & Tablets', count: 8 },
  { name: 'SmartPhone & Smart TV', count: 5 },
]

export function NavbarHero() {
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const [mobileNavOpen, setMobileNavOpen] = useState(false)
  const [pagesOpen, setPagesOpen] = useState(false)
  const [sticky, setSticky] = useState(false)

  useEffect(() => {
    const handleScroll = () => setSticky(window.scrollY > 45)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className={`container-fluid nav-bar p-0 ${sticky ? 'sticky-top shadow-sm' : ''}`}>
      <div className="row gx-0 bg-primary px-5 align-items-center">
        <div className="col-lg-3 d-none d-lg-block">
          <nav className="navbar navbar-light position-relative" style={{ width: 250 }}>
            <button
              className="navbar-toggler border-0 fs-4 w-100 px-0 text-start bg-transparent text-white"
              type="button"
              onClick={() => setCategoriesOpen(!categoriesOpen)}
            >
              <h4 className="m-0">
                <Menu className="me-2 d-inline" size={24} />
                All Categories
              </h4>
            </button>
            {categoriesOpen && (
              <div className="position-absolute rounded-bottom shadow" id="allCat">
                <div className="navbar-nav ms-auto py-0">
                  <ul className="list-unstyled categories-bars mb-0">
                    {categories.map((cat) => (
                      <li key={cat.name}>
                        <div className="categories-bars-item">
                          <a href="#">{cat.name}</a>
                          <span>({cat.count})</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </nav>
        </div>
        <div className="col-12 col-lg-9">
          <nav className="navbar navbar-expand-lg navbar-light bg-primary">
            <Link to="/" className="navbar-brand d-block d-lg-none text-decoration-none">
              <h1 className="display-5 text-secondary m-0">Electro</h1>
            </Link>
            <button
              className="navbar-toggler ms-auto border-0"
              type="button"
              onClick={() => setMobileNavOpen(!mobileNavOpen)}
            >
              <Menu size={24} />
            </button>
            <div className={`collapse navbar-collapse ${mobileNavOpen ? 'show' : ''}`} id="navbarCollapse">
              <div className="navbar-nav ms-auto py-0">
                <Link to="/" className="nav-item nav-link active">Home</Link>
                <Link to="/shop" className="nav-item nav-link">Shop</Link>
                <Link to="/product/1" className="nav-item nav-link">Single Page</Link>
                <div className="nav-item dropdown">
                  <button
                    className="nav-link dropdown-toggle btn btn-link border-0 text-white text-decoration-none"
                    onClick={() => setPagesOpen(!pagesOpen)}
                  >
                    Pages
                    <ChevronDown className="ms-1 d-inline" size={16} />
                  </button>
                  {pagesOpen && (
                    <div className="dropdown-menu m-0 show">
                      <Link to="/bestseller" className="dropdown-item">Bestseller</Link>
                      <Link to="/cart" className="dropdown-item">Cart Page</Link>
                      <Link to="/checkout" className="dropdown-item">Checkout</Link>
                      <Link to="/404" className="dropdown-item">404 Page</Link>
                    </div>
                  )}
                </div>
                <Link to="/contact" className="nav-item nav-link me-2">Contact</Link>
                <div className="d-block d-lg-none mb-3">
                  <ul className="list-unstyled categories-bars">
                    {categories.map((cat) => (
                      <li key={cat.name}>
                        <div className="categories-bars-item">
                          <a href="#">{cat.name}</a>
                          <span>({cat.count})</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
              <a href="tel:+01234567890" className="btn btn-secondary rounded-pill py-2 px-4 px-lg-3 mb-3 mb-md-3 mb-lg-0 ms-lg-3">
                +0123 456 7890
              </a>
            </div>
          </nav>
        </div>
      </div>
    </div>
  )
}

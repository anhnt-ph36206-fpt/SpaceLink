import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

export function Topbar() {
  const [currencyOpen, setCurrencyOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [userOpen, setUserOpen] = useState(false)

  return (
    <div className="container-fluid px-5 d-none border-bottom d-lg-block">
      <div className="row gx-0 align-items-center">
        <div className="col-lg-4 text-center text-lg-start mb-lg-0">
          <div className="d-inline-flex align-items-center" style={{ height: 45 }}>
            <a href="#" className="text-muted me-2">Help</a>
            <small> / </small>
            <a href="#" className="text-muted mx-2">Support</a>
            <small> / </small>
            <a href="#" className="text-muted ms-2">Contact</a>
          </div>
        </div>
        <div className="col-lg-4 text-center d-flex align-items-center justify-content-center">
          <small className="text-dark">Call Us:</small>
          <a href="tel:+0121234567890" className="text-muted ms-1">(+012) 1234 567890</a>
        </div>
        <div className="col-lg-4 text-center text-lg-end">
          <div className="d-inline-flex align-items-center" style={{ height: 45 }}>
            <div className="dropdown">
              <button
                className="btn btn-link dropdown-toggle text-muted me-2 p-0 border-0 text-decoration-none"
                onClick={() => { setCurrencyOpen(!currencyOpen); setLangOpen(false); setUserOpen(false); }}
              >
                <small>USD</small>
                <ChevronDown className="d-inline ms-1" size={14} />
              </button>
              {currencyOpen && (
                <div className="dropdown-menu show rounded">
                  <a href="#" className="dropdown-item">Euro</a>
                  <a href="#" className="dropdown-item">Dolar</a>
                </div>
              )}
            </div>
            <div className="dropdown">
              <button
                className="btn btn-link dropdown-toggle text-muted mx-2 p-0 border-0 text-decoration-none"
                onClick={() => { setLangOpen(!langOpen); setCurrencyOpen(false); setUserOpen(false); }}
              >
                <small>English</small>
                <ChevronDown className="d-inline ms-1" size={14} />
              </button>
              {langOpen && (
                <div className="dropdown-menu show rounded">
                  <a href="#" className="dropdown-item">English</a>
                  <a href="#" className="dropdown-item">Turkish</a>
                  <a href="#" className="dropdown-item">Spanol</a>
                  <a href="#" className="dropdown-item">Italiano</a>
                </div>
              )}
            </div>
            <div className="dropdown">
              <button
                className="btn btn-link dropdown-toggle text-muted ms-2 p-0 border-0 text-decoration-none"
                onClick={() => { setUserOpen(!userOpen); setCurrencyOpen(false); setLangOpen(false); }}
              >
                <small>My Dashboard</small>
                <ChevronDown className="d-inline ms-1" size={14} />
              </button>
              {userOpen && (
                <div className="dropdown-menu show rounded">
                  <a href="#" className="dropdown-item">Login</a>
                  <a href="#" className="dropdown-item">Wishlist</a>
                  <a href="#" className="dropdown-item">My Card</a>
                  <a href="#" className="dropdown-item">Notifications</a>
                  <a href="#" className="dropdown-item">Account Settings</a>
                  <a href="#" className="dropdown-item">My Account</a>
                  <a href="#" className="dropdown-item">Log Out</a>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

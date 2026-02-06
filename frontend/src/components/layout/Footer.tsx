import { MapPin, Mail, Phone, Globe } from 'lucide-react'

const contactItems = [
  { icon: MapPin, title: 'Address', text: '123 Street New York.USA' },
  { icon: Mail, title: 'Mail Us', text: 'info@example.com' },
  { icon: Phone, title: 'Telephone', text: '(+012) 3456 7890' },
  { icon: Globe, title: 'Yoursite@ex.com', text: '(+012) 3456 7890' },
]

const customerService = [
  'Contact Us', 'Returns', 'Order History', 'Site Map',
  'Testimonials', 'My Account', 'Unsubscribe Notification'
]

const information = [
  'About Us', 'Delivery infomation', 'Privacy Policy', 'Terms & Conditions',
  'Warranty', 'FAQ', 'Seller Login'
]

const extras = [
  'Brands', 'Gift Vouchers', 'Affiliates', 'Wishlist',
  'Order History', 'Track Your Order'
]

export function Footer() {
  return (
    <div className="container-fluid footer py-5">
      <div className="container py-5">
        <div className="row g-4 rounded mb-5" style={{ background: 'rgba(255, 255, 255, .03)' }}>
          {contactItems.map((item) => (
            <div key={item.title} className="col-md-6 col-lg-6 col-xl-3">
              <div className="rounded p-4">
                <div
                  className="rounded-circle bg-secondary d-flex align-items-center justify-content-center mb-4 mx-auto"
                  style={{ width: 70, height: 70 }}
                >
                  <item.icon className="text-primary" size={32} />
                </div>
                <div>
                  <h4 className="text-white">{item.title}</h4>
                  <p className="mb-2 text-white-50">{item.text}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="row g-5">
          <div className="col-md-6 col-lg-6 col-xl-3">
            <div className="footer-item d-flex flex-column">
              <h4 className="text-primary mb-4">Newsletter</h4>
              <p className="mb-3 text-white-50">
                Dolor amet sit justo amet elitr clita ipsum elitr est. Lorem ipsum dolor sit amet.
              </p>
              <div className="position-relative mx-auto rounded-pill">
                <input
                  className="form-control rounded-pill w-100 py-3 ps-4 pe-5 bg-dark border-secondary"
                  type="text"
                  placeholder="Enter your email"
                />
                <button
                  type="button"
                  className="btn btn-primary rounded-pill position-absolute top-0 end-0 py-2 mt-2 me-2"
                >
                  SignUp
                </button>
              </div>
            </div>
          </div>
          <div className="col-md-6 col-lg-6 col-xl-3">
            <div className="footer-item d-flex flex-column">
              <h4 className="text-primary mb-4">Customer Service</h4>
              {customerService.map((link) => (
                <a key={link} href="#" className="text-white-50 text-decoration-none mb-1">
                  {link}
                </a>
              ))}
            </div>
          </div>
          <div className="col-md-6 col-lg-6 col-xl-3">
            <div className="footer-item d-flex flex-column">
              <h4 className="text-primary mb-4">Information</h4>
              {information.map((link) => (
                <a key={link} href="#" className="text-white-50 text-decoration-none mb-1">
                  {link}
                </a>
              ))}
            </div>
          </div>
          <div className="col-md-6 col-lg-6 col-xl-3">
            <div className="footer-item d-flex flex-column">
              <h4 className="text-primary mb-4">Extras</h4>
              {extras.map((link) => (
                <a key={link} href="#" className="text-white-50 text-decoration-none mb-1">
                  {link}
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

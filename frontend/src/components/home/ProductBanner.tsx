import { Link } from 'react-router-dom'

export function ProductBanner() {
  return (
    <div className="container-fluid py-5">
      <div className="container">
        <div className="row g-4">
          <div className="col-lg-6">
            <Link to="#" className="text-decoration-none">
              <div className="bg-primary rounded position-relative overflow-hidden">
                <img
                  src="/img/product-banner.jpg"
                  className="img-fluid w-100 rounded"
                  alt="EOS Rebel T7i Kit"
                />
                <div
                  className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center rounded p-4"
                  style={{ background: 'rgba(255, 255, 255, 0.5)' }}
                >
                  <h3 className="display-5 text-primary">EOS Rebel</h3>
                  <span className="text-primary fs-4">T7i Kit</span>
                  <p className="fs-4 text-muted">$899.99</p>
                  <span className="btn btn-primary rounded-pill align-self-start py-2 px-4">
                    Shop Now
                  </span>
                </div>
              </div>
            </Link>
          </div>
          <div className="col-lg-6">
            <Link to="#" className="text-decoration-none">
              <div className="text-center bg-primary rounded position-relative overflow-hidden">
                <img
                  src="/img/product-banner-2.jpg"
                  className="img-fluid w-100"
                  alt="Sale"
                />
                <div
                  className="position-absolute top-0 start-0 w-100 h-100 d-flex flex-column justify-content-center rounded p-4"
                  style={{ background: 'rgba(242, 139, 0, 0.5)' }}
                >
                  <h2 className="display-2 text-secondary">SALE</h2>
                  <h4 className="display-5 text-white mb-4">Get UP To 50% Off</h4>
                  <span className="btn btn-secondary rounded-pill align-self-center py-2 px-4">
                    Shop Now
                  </span>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

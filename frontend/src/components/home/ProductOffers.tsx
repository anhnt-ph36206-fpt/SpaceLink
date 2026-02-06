import { Link } from 'react-router-dom'

const offers = [
  {
    id: 1,
    tag: 'Find The Best Camera for You!',
    title: 'Smart Camera',
    discount: '40%',
    img: '/img/product-1.png',
  },
  {
    id: 2,
    tag: 'Find The Best Whatches for You!',
    title: 'Smart Watch',
    discount: '20%',
    img: '/img/product-2.png',
  },
]

export function ProductOffers() {
  return (
    <div className="container-fluid bg-light py-5">
      <div className="container">
        <div className="row g-4">
          {offers.map((offer) => (
            <div key={offer.id} className="col-lg-6">
              <Link
                to="#"
                className="d-flex align-items-center justify-content-between border bg-white rounded p-4 text-decoration-none text-dark"
              >
                <div>
                  <p className="text-muted mb-3">{offer.tag}</p>
                  <h3 className="text-primary">{offer.title}</h3>
                  <h1 className="display-3 text-secondary mb-0">
                    {offer.discount}{' '}
                    <span className="text-primary fw-normal">Off</span>
                  </h1>
                </div>
                <img src={offer.img} className="img-fluid" alt={offer.title} />
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

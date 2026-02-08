import { RefreshCw, Truck, LifeBuoy, CreditCard, Lock, FileText } from 'lucide-react'

const services = [
  { icon: RefreshCw, title: 'Free Return', desc: '30 days money back guarantee!' },
  { icon: Truck, title: 'Free Shipping', desc: 'Free shipping on all order' },
  { icon: LifeBuoy, title: 'Support 24/7', desc: 'We support online 24 hrs a day' },
  { icon: CreditCard, title: 'Receive Gift Card', desc: 'Recieve gift all over oder $50' },
  { icon: Lock, title: 'Secure Payment', desc: 'We Value Your Security' },
  { icon: FileText, title: 'Online Service', desc: 'Free return products in 30 days' },
]

export function ServicesBar() {
  return (
    <div className="container-fluid px-0">
      <div className="row g-0">
        {services.map((srv) => (
          <div
            key={srv.title}
            className="col-6 col-md-4 col-lg-2 border-start border-end"
          >
            <div className="p-4">
              <div className="d-flex align-items-center">
                <srv.icon className="text-primary" size={32} />
                <div className="ms-4">
                  <h6 className="text-uppercase mb-2">{srv.title}</h6>
                  <p className="mb-0 text-muted small">{srv.desc}</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

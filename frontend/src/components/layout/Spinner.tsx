import { useEffect, useState } from 'react'

export function Spinner() {
  const [show, setShow] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => setShow(false), 500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      id="spinner"
      className={`bg-white position-fixed w-100 vh-100 top-0 start-0 d-flex align-items-center justify-content-center ${show ? 'show' : ''}`}
      style={{ zIndex: 99999 }}
    >
      <div
        className="spinner-border text-primary"
        style={{ width: '3rem', height: '3rem' }}
        role="status"
      >
        <span className="visually-hidden">Loading...</span>
      </div>
    </div>
  )
}

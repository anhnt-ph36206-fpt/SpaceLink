import { useEffect, useState } from 'react'
import { ArrowUp } from 'lucide-react'

export function BackToTop() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const handleScroll = () => setVisible(window.scrollY > 300)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (!visible) return null

  return (
    <a
      href="#"
      className="btn btn-primary btn-lg-square back-to-top"
      onClick={(e) => { e.preventDefault(); scrollToTop(); }}
      aria-label="Back to top"
    >
      <ArrowUp size={24} />
    </a>
  )
}

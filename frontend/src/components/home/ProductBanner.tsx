import { useEffect, useState, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { axiosInstance } from '../../api/axios'

interface Banner {
  id: number
  title: string
  image_url: string
  image_full_url: string
  description?: string | null
  link_url?: string | null
  display_order: number
  is_active: boolean
}

const FALLBACK_IMG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='500' viewBox='0 0 1200 500'%3E%3Crect width='1200' height='500' fill='%23e9ecef'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='28' fill='%23adb5bd'%3EBanner%3C/text%3E%3C/svg%3E`

const SLIDE_DURATION = 4500 // ms

export function ProductBanner() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(0)
  const [animating, setAnimating] = useState(false)
  const [direction, setDirection] = useState<'left' | 'right'>('right')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    axiosInstance
      .get('/banners')
      .then(res => {
        const list = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.data)
          ? res.data.data
          : []
        setBanners(list)
      })
      .catch(() => setBanners([]))
      .finally(() => setLoading(false))
  }, [])

  const total = banners.length

  const goTo = useCallback(
    (index: number, dir: 'left' | 'right') => {
      if (animating || total <= 1) return
      setDirection(dir)
      setAnimating(true)
      setTimeout(() => {
        setCurrent(index)
        setAnimating(false)
      }, 400)
    },
    [animating, total],
  )

  const next = useCallback(() => {
    goTo((current + 1) % total, 'right')
  }, [current, total, goTo])

  const prev = useCallback(() => {
    goTo((current - 1 + total) % total, 'left')
  }, [current, total, goTo])

  // Auto-slide
  useEffect(() => {
    if (total <= 1) return
    timerRef.current = setInterval(next, SLIDE_DURATION)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [next, total])

  // Reset timer on manual nav
  const handleNav = (fn: () => void) => {
    if (timerRef.current) clearInterval(timerRef.current)
    fn()
  }

  // ── Loading skeleton ─────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ padding: '8px 0 0' }}>
        <div className="container-fluid px-0">
          <div
            style={{
              height: 480,
              borderRadius: 0,
              background: 'linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)',
              backgroundSize: '200% 100%',
              animation: 'bannerShimmer 1.4s infinite',
            }}
          />
        </div>
        <style>{`@keyframes bannerShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      </div>
    )
  }

  if (banners.length === 0) return null

  const banner = banners[current]

  const slideStyle: React.CSSProperties = {
    opacity: animating ? 0 : 1,
    transform: animating
      ? `translateX(${direction === 'right' ? '30px' : '-30px'})`
      : 'translateX(0)',
    transition: animating
      ? 'none'
      : 'opacity 0.55s cubic-bezier(0.4,0,0.2,1), transform 0.55s cubic-bezier(0.4,0,0.2,1)',
  }

  return (
    <>
      <style>{`
        @keyframes bannerFadeUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes bannerShimmer {
          0%   { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
        .banner-arrow {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          width: 48px;
          height: 48px;
          border-radius: 50%;
          border: none;
          background: rgba(255,255,255,0.18);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          color: #fff;
          font-size: 22px;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          z-index: 20;
          transition: background 0.22s, transform 0.22s;
          box-shadow: 0 4px 20px rgba(0,0,0,0.18);
        }
        .banner-arrow:hover {
          background: rgba(255,255,255,0.35);
          transform: translateY(-50%) scale(1.10);
        }
        .banner-dot {
          height: 6px;
          border-radius: 3px;
          border: none;
          padding: 0;
          cursor: pointer;
          transition: all 0.35s cubic-bezier(0.4,0,0.2,1);
        }
      `}</style>

      {/* Outer: sát header, không có padding-top */}
      <div style={{ marginTop: 0, paddingTop: 0, background: 'transparent' }}>
        <div
          className="position-relative overflow-hidden"
          style={{ borderRadius: 18, boxShadow: '0 16px 56px rgba(0,0,0,0.22)', margin: '0 16px' }}
        >
          {/* ── Slide image ── */}
          <Link
            to={banner.link_url || '#'}
            className="d-block text-decoration-none"
            tabIndex={-1}
          >
            <div style={{ position: 'relative', ...slideStyle }}>
              <img
                src={banner.image_full_url || banner.image_url}
                alt={banner.title}
                style={{
                  width: '100%',
                  height: 'clamp(280px, 46vw, 540px)',
                  objectFit: 'cover',
                  display: 'block',
                  userSelect: 'none',
                }}
                onError={e => {
                  ;(e.target as HTMLImageElement).src = FALLBACK_IMG
                }}
                draggable={false}
              />

              {/* Gradient overlay */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(to top, rgba(0,0,0,0.72) 0%, rgba(0,0,0,0.30) 45%, rgba(0,0,0,0.05) 100%)',
                }}
              />

              {/* Text content */}
              <div
                style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  padding: '40px 48px',
                  zIndex: 5,
                  animation: animating ? 'none' : 'bannerFadeUp 0.6s cubic-bezier(0.4,0,0.2,1) both',
                }}
              >
                <h2
                  style={{
                    color: '#fff',
                    fontSize: 'clamp(1.5rem, 3.2vw, 2.6rem)',
                    fontWeight: 800,
                    lineHeight: 1.18,
                    letterSpacing: '-0.025em',
                    textShadow: '0 4px 18px rgba(0,0,0,0.45)',
                    marginBottom: 10,
                  }}
                >
                  {banner.title}
                </h2>

                {banner.description && (
                  <p
                    style={{
                      color: 'rgba(255,255,255,0.88)',
                      fontSize: 'clamp(0.9rem, 1.5vw, 1.1rem)',
                      lineHeight: 1.55,
                      textShadow: '0 2px 8px rgba(0,0,0,0.4)',
                      marginBottom: 20,
                      maxWidth: 580,
                    }}
                  >
                    {banner.description}
                  </p>
                )}

                <span
                  style={{
                    display: 'inline-block',
                    padding: '10px 28px',
                    borderRadius: 50,
                    background: '#fff',
                    color: '#0d6efd',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    boxShadow: '0 6px 20px rgba(0,0,0,0.22)',
                    letterSpacing: '0.01em',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                  }}
                >
                  Xem ngay →
                </span>
              </div>
            </div>
          </Link>

          {/* ── Arrow buttons ── */}
          {total > 1 && (
            <>
              <button
                className="banner-arrow"
                style={{ left: 16 }}
                onClick={() => handleNav(prev)}
                aria-label="Previous"
              >
                ‹
              </button>
              <button
                className="banner-arrow"
                style={{ right: 16 }}
                onClick={() => handleNav(next)}
                aria-label="Next"
              >
                ›
              </button>
            </>
          )}

          {/* ── Slide counter top-right ── */}
          {total > 1 && (
            <div
              style={{
                position: 'absolute',
                top: 16,
                right: 20,
                background: 'rgba(0,0,0,0.42)',
                backdropFilter: 'blur(6px)',
                color: '#fff',
                fontSize: '0.82rem',
                fontWeight: 600,
                padding: '4px 12px',
                borderRadius: 20,
                zIndex: 20,
                letterSpacing: '0.04em',
              }}
            >
              {current + 1} / {total}
            </div>
          )}
        </div>

        {/* ── Dot navigation ── */}
        {total > 1 && (
          <div
            className="d-flex justify-content-center gap-2"
            style={{ marginTop: 14, paddingBottom: 4 }}
          >
            {banners.map((_, i) => (
              <button
                key={i}
                className="banner-dot"
                onClick={() => handleNav(() => goTo(i, i > current ? 'right' : 'left'))}
                aria-label={`Slide ${i + 1}`}
                style={{
                  width: i === current ? 28 : 8,
                  background: i === current ? '#0d6efd' : '#dee2e6',
                }}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}

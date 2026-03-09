import { useEffect, useState, useCallback } from 'react'
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

const FALLBACK_IMG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='300' viewBox='0 0 600 300'%3E%3Crect width='600' height='300' fill='%23e9ecef'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='20' fill='%23adb5bd'%3EBanner%3C/text%3E%3C/svg%3E`

// Ghép banner thành từng cặp [2 banner/slide]
function chunkPairs<T>(arr: T[]): [T, T | null][] {
  const result: [T, T | null][] = []
  for (let i = 0; i < arr.length; i += 2) {
    result.push([arr[i], arr[i + 1] ?? null])
  }
  return result
}

export function ProductBanner() {
  const [banners, setBanners] = useState<Banner[]>([])
  const [loading, setLoading] = useState(true)
  const [current, setCurrent] = useState(0)

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

  const pairs = chunkPairs(banners)
  const total = pairs.length

  const next = useCallback(() => setCurrent(c => (c + 1) % total), [total])
  const prev = useCallback(() => setCurrent(c => (c - 1 + total) % total), [total])

  // Auto-slide every 4 seconds
  useEffect(() => {
    if (total <= 1) return
    const id = setInterval(next, 4000)
    return () => clearInterval(id)
  }, [next, total])

  // ── Loading skeleton ──────────────────────────────────────────────
  if (loading) {
    return (
      <div className="container-fluid py-5">
        <div className="container">
          <div className="row g-4">
            {[1, 2].map(i => (
              <div key={i} className="col-lg-6">
                <div
                  className="rounded"
                  style={{
                    height: 300,
                    background: 'linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)',
                    backgroundSize: '200% 100%',
                    animation: 'bannerShimmer 1.4s infinite',
                    borderRadius: 12,
                  }}
                />
              </div>
            ))}
          </div>
        </div>
        <style>{`@keyframes bannerShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      </div>
    )
  }

  if (banners.length === 0) return null

  const [left, right] = pairs[current]

  // ── Render một ô banner ──────────────────────────────────────────
  const BannerCard = ({ banner, accent }: { banner: Banner; accent: boolean }) => (
    <Link to={banner.link_url || '#'} className="text-decoration-none d-block h-100">
      <div
        className="rounded-3 overflow-hidden position-relative"
        style={{
          height: 440,
          boxShadow: '0 12px 48px rgba(0,0,0,0.22)',
          transition: 'transform 0.3s ease, box-shadow 0.3s ease',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 20px 60px rgba(0,0,0,0.28)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.transform = 'translateY(0)'
          ;(e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 48px rgba(0,0,0,0.22)'
        }}
      >
        {/* Ảnh nền */}
        <img
          src={banner.image_full_url || banner.image_url}
          alt={banner.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG }}
        />

        {/* Overlay gradient — mạnh hơn để nổi bật */}
        <div
          className="position-absolute top-0 start-0 w-100 h-100"
          style={{
            background: accent
              ? 'linear-gradient(135deg,rgba(220,100,0,0.78) 0%,rgba(0,0,0,0.15) 100%)'
              : 'linear-gradient(135deg,rgba(13,110,253,0.78) 0%,rgba(0,0,0,0.15) 100%)',
          }}
        />

        {/* Text nội dung */}
        <div
          className="position-absolute bottom-0 start-0 p-5"
          style={{ zIndex: 2, maxWidth: '90%' }}
        >
          <h3
            className="fw-black mb-2"
            style={{
              color: '#fff',
              fontSize: '1.8rem',
              textShadow: '0 3px 12px rgba(0,0,0,0.5)',
              lineHeight: 1.2,
              letterSpacing: '-0.02em',
            }}
          >
            {banner.title}
          </h3>
          {banner.description && (
            <p
              className="mb-3"
              style={{
                color: 'rgba(255,255,255,0.92)',
                fontSize: '1rem',
                lineHeight: 1.5,
                textShadow: '0 1px 6px rgba(0,0,0,0.4)',
              }}
            >
              {banner.description}
            </p>
          )}
          <span
            className="btn rounded-pill px-4 py-2 fw-bold"
            style={{
              background: '#fff',
              color: accent ? '#c45c00' : '#0d6efd',
              fontSize: '0.95rem',
              boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
              letterSpacing: '0.01em',
            }}
          >
            Xem ngay →
          </span>
        </div>
      </div>
    </Link>
  )

  return (
    <div className="container-fluid py-5" style={{ background: 'transparent' }}>
      <div className="container">

        {/* ── Slideshow wrapper ── */}
        <div className="position-relative">

          {/* Slides */}
          <div className="row g-3 align-items-stretch">
            {/* Left panel */}
            <div className="col-lg-6">
              <BannerCard banner={left} accent={false} />
            </div>

            {/* Right panel – full width nếu chỉ có 1 banner trong cặp */}
            {right ? (
              <div className="col-lg-6">
                <BannerCard banner={right} accent={true} />
              </div>
            ) : (
              /* Placeholder giữ layout khi lẻ */
              <div className="col-lg-6 d-none d-lg-block" aria-hidden />
            )}
          </div>

          {/* ── Arrow buttons (chỉ hiện khi có > 1 slide) ── */}
          {total > 1 && (
            <>
              <button
                onClick={prev}
                aria-label="Previous"
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: -20,
                  transform: 'translateY(-50%)',
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(255,255,255,0.95)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                  cursor: 'pointer',
                  fontSize: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                  transition: 'box-shadow 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)')}
              >
                ‹
              </button>

              <button
                onClick={next}
                aria-label="Next"
                style={{
                  position: 'absolute',
                  top: '50%',
                  right: -20,
                  transform: 'translateY(-50%)',
                  width: 40,
                  height: 40,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'rgba(255,255,255,0.95)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
                  cursor: 'pointer',
                  fontSize: 18,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                  transition: 'box-shadow 0.2s',
                }}
                onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.25)')}
                onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.15)')}
              >
                ›
              </button>
            </>
          )}
        </div>

        {/* ── Dot navigation ── */}
        {total > 1 && (
          <div className="d-flex justify-content-center gap-2 mt-3">
            {pairs.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                aria-label={`Slide ${i + 1}`}
                style={{
                  width: i === current ? 24 : 8,
                  height: 8,
                  borderRadius: 4,
                  border: 'none',
                  padding: 0,
                  background: i === current ? '#0d6efd' : '#dee2e6',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                }}
              />
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

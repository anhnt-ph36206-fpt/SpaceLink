import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { axiosInstance } from '../../api/axios'

interface NewsItem {
  id: number
  title: string
  slug: string
  summary?: string | null
  thumbnail?: string | null
  thumbnail_url?: string | null
  is_featured: boolean
  view_count: number
  published_at: string
}

const FALLBACK_IMG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='450' viewBox='0 0 800 450'%3E%3Crect width='800' height='450' fill='%23e9ecef'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='20' fill='%23adb5bd'%3ESpaceLink News%3C/text%3E%3C/svg%3E`

function formatDate(d: string) {
  try { return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
  catch { return d }
}

/* ── Skeleton ── */
function SkeletonCard() {
  return (
    <div className="rounded" style={{
      height: 300, overflow: 'hidden',
      background: 'linear-gradient(90deg,#ececec 25%,#f5f5f5 50%,#ececec 75%)',
      backgroundSize: '200% 100%',
      animation: 'nsShimmer 1.4s infinite',
    }} />
  )
}

/* ── News Card ── */
function NewsCard({ item }: { item: NewsItem }) {
  return (
    <Link to={`/news/${item.slug}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
      <div className="ns-card rounded overflow-hidden" style={{
        position: 'relative', height: 300,
        boxShadow: '0 2px 16px rgba(0,0,0,0.12)',
        transition: 'transform 0.28s ease, box-shadow 0.28s ease',
      }}>
        {/* Ảnh */}
        <img
          className="ns-img"
          src={item.thumbnail_url || item.thumbnail || FALLBACK_IMG}
          alt={item.title}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.38s ease' }}
          onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG }}
        />

        {/* Badge nổi bật */}
        {item.is_featured && (
          <span className="badge bg-primary position-absolute" style={{ top: 12, left: 12, fontSize: '0.7rem', letterSpacing: '0.05em', padding: '5px 10px', borderRadius: 6 }}>
            ⭐ Nổi bật
          </span>
        )}

        {/* Gradient overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          background: 'linear-gradient(to top, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.3) 55%, transparent 100%)',
        }} />

        {/* Nội dung */}
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '16px 18px 18px' }}>
          <h6 style={{
            color: '#fff', fontWeight: 700, fontSize: '0.93rem',
            fontFamily: "'Roboto', sans-serif",
            lineHeight: 1.4, marginBottom: 8,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {item.title}
          </h6>

          {/* Meta */}
          <div className="d-flex align-items-center justify-content-between">
            <div style={{ fontSize: '0.73rem', color: 'rgba(255,255,255,0.75)', fontFamily: "'Roboto', sans-serif" }}>
              <i className="fas fa-calendar-alt me-1" />
              {formatDate(item.published_at)}
              <span className="mx-2">·</span>
              <i className="fas fa-eye me-1" />
              {item.view_count.toLocaleString()}
            </div>
            <span className="badge bg-primary" style={{ fontSize: '0.72rem', fontFamily: "'Roboto', sans-serif", padding: '5px 10px', borderRadius: 6 }}>
              Đọc thêm
            </span>
          </div>
        </div>
      </div>
    </Link>
  )
}

/* ── Main ── */
export function NewsSection() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    axiosInstance
      .get('/news', { params: { per_page: 4 } })
      .then(res => {
        const raw = res.data?.data
        const list: NewsItem[] = Array.isArray(raw) ? raw : Array.isArray(raw?.data) ? raw.data : []
        setNews(list.slice(0, 4))
      })
      .catch(() => setNews([]))
      .finally(() => setLoading(false))
  }, [])

  if (!loading && news.length === 0) return null

  return (
    <>
      <style>{`
        @keyframes nsShimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .ns-card:hover { transform: translateY(-5px); box-shadow: 0 12px 32px rgba(0,0,0,0.18) !important; }
        .ns-card:hover .ns-img { transform: scale(1.07); }
      `}</style>

      <div className="container-fluid py-5 bg-light wow fadeIn" data-wow-delay="0.1s">
        <div className="container">

          {/* ── Header giống style client ── */}
          <div className="row mb-4 align-items-center">
            <div className="col">
              <h5 className="text-primary text-uppercase fw-bold mb-1" style={{ fontFamily: "'Roboto', sans-serif", letterSpacing: '2px', fontSize: '0.82rem' }}>
                <i className="fas fa-newspaper me-2" />Tin Tức
              </h5>
              <h2 className="fw-bold text-dark mb-0" style={{ fontFamily: "'Roboto', sans-serif", fontSize: 'clamp(1.3rem,2vw,1.9rem)' }}>
                Tin Tức &amp; Công Nghệ
              </h2>
            </div>
            <div className="col-auto">
              <Link to="/news" className="btn btn-primary rounded-pill py-2 px-4" style={{ fontFamily: "'Roboto', sans-serif", fontWeight: 600 }}>
                Xem tất cả <i className="fas fa-arrow-right ms-2" />
              </Link>
            </div>
          </div>

          {/* ── Grid 2×2 ── */}
          {loading ? (
            <div className="row g-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="col-12 col-sm-6"><SkeletonCard /></div>
              ))}
            </div>
          ) : (
            <div className="row g-3">
              {news.map(item => (
                <div key={item.id} className="col-12 col-sm-6">
                  <NewsCard item={item} />
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </>
  )
}

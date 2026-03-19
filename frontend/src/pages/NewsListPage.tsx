import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { axiosInstance } from '../api/axios'

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
  author?: { id: number; fullname: string } | null
}

const FALLBACK_IMG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='450' viewBox='0 0 800 450'%3E%3Crect width='800' height='450' fill='%23e9ecef'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='22' fill='%23adb5bd'%3ESpaceLink News%3C/text%3E%3C/svg%3E`

function formatDate(d: string) {
  try { return new Date(d).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) }
  catch { return d }
}

/* ── Skeleton ── */
function SkeletonCard() {
  return (
    <div className="rounded" style={{
      height: 260, overflow: 'hidden',
      background: 'linear-gradient(90deg,#ececec 25%,#f5f5f5 50%,#ececec 75%)',
      backgroundSize: '200% 100%',
      animation: 'nlShimmer 1.4s infinite',
    }} />
  )
}

/* ── Card ── */
function NewsCard({ item }: { item: NewsItem }) {
  return (
    <Link to={`/news/${item.slug}`} style={{ textDecoration: 'none', display: 'block', height: '100%' }}>
      <div className="nl-card rounded overflow-hidden bg-white" style={{
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        display: 'flex', flexDirection: 'column', height: '100%',
        transition: 'transform 0.28s ease, box-shadow 0.28s ease',
      }}>
        {/* Thumb */}
        <div style={{ position: 'relative', overflow: 'hidden', flexShrink: 0, height: 220 }}>
          <img
            className="nl-img"
            src={item.thumbnail_url || item.thumbnail || FALLBACK_IMG}
            alt={item.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.38s ease' }}
            onError={e => { (e.target as HTMLImageElement).src = FALLBACK_IMG }}
          />
          {item.is_featured && (
            <span className="badge bg-primary position-absolute" style={{ top: 12, left: 12, fontSize: '0.72rem', padding: '5px 10px', borderRadius: 6 }}>
              ⭐ Nổi bật
            </span>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '16px 18px 18px', display: 'flex', flexDirection: 'column', flex: 1 }}>
          {/* Meta */}
          <div className="d-flex align-items-center gap-3 mb-2 text-muted" style={{ fontSize: '0.76rem', fontFamily: "'Roboto', sans-serif" }}>
            <span><i className="fas fa-calendar-alt me-1" />{formatDate(item.published_at)}</span>
            <span><i className="fas fa-eye me-1" />{item.view_count.toLocaleString()}</span>
            {item.author?.fullname && <span className="ms-auto fw-bold">{item.author.fullname}</span>}
          </div>

          {/* Title */}
          <h6 className="fw-bold text-dark mb-2" style={{
            fontFamily: "'Roboto', sans-serif",
            fontSize: '0.95rem', lineHeight: 1.45,
            display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
          }}>
            {item.title}
          </h6>

          {/* Summary */}
          {item.summary && (
            <p className="text-muted small mb-3" style={{
              fontFamily: "'Roboto', sans-serif",
              lineHeight: 1.6,
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
            }}>
              {item.summary}
            </p>
          )}

          {/* Read more */}
          <span className="text-primary fw-bold mt-auto" style={{ fontSize: '0.82rem', fontFamily: "'Roboto', sans-serif" }}>
            Đọc thêm <i className="fas fa-arrow-right ms-1" />
          </span>
        </div>
      </div>
    </Link>
  )
}

/* ── Main Page ── */
const PER_PAGE = 9

export default function NewsListPage() {
  const [news, setNews] = useState<NewsItem[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)

  const fetchNews = useCallback(async (p: number) => {
    setLoading(true)
    try {
      const res = await axiosInstance.get('/news', { params: { page: p, per_page: PER_PAGE } })
      const raw = res.data?.data
      const list: NewsItem[] = Array.isArray(raw?.data) ? raw.data : []
      setNews(list)
      setLastPage(raw?.last_page ?? 1)
      setTotal(raw?.total ?? 0)
    } catch {
      setNews([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchNews(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [page, fetchNews])

  return (
    <>
      <style>{`
        @keyframes nlShimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        .nl-card:hover { transform: translateY(-5px); box-shadow: 0 12px 32px rgba(0,0,0,0.14) !important; }
        .nl-card:hover .nl-img { transform: scale(1.06); }
      `}</style>

      {/* ── Page Header dùng style client ── */}
      <div className="page-header py-5 mb-0" style={{
        background: 'linear-gradient(rgba(0,0,0,0.55),rgba(0,0,0,0.55)), url(/assets/client/img/carousel-1.jpg)',
        backgroundPosition: 'center', backgroundSize: 'cover', padding: '80px 0',
      }}>
        <div className="container text-center">
          <h5 className="text-primary text-uppercase fw-bold mb-2" style={{ fontFamily: "'Roboto', sans-serif", letterSpacing: '2px' }}>
            <i className="fas fa-newspaper me-2" />Tin Tức
          </h5>
          <h1 className="display-4 fw-bold text-white" style={{ fontFamily: "'Roboto', sans-serif" }}>
            Tin Tức &amp; Công Nghệ
          </h1>
          <p className="text-white-50" style={{ fontFamily: "'Roboto', sans-serif" }}>
            Cập nhật xu hướng công nghệ mới nhất từ SpaceLink
          </p>
          {/* Breadcrumb kiểu client */}
          <nav className="mt-3" style={{ fontSize: '0.88rem' }}>
            <Link to="/" className="text-white-50 text-decoration-none" style={{ fontFamily: "'Roboto', sans-serif" }}>
              Trang chủ
            </Link>
            <span className="text-white-50 mx-2">/</span>
            <span className="text-white" style={{ fontFamily: "'Roboto', sans-serif" }}>Tin tức</span>
            {total > 0 && <span className="text-white-50 ms-2" style={{ fontFamily: "'Roboto', sans-serif" }}>({total} bài viết)</span>}
          </nav>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="container-fluid py-5 bg-light">
        <div className="container">

          {/* Loading */}
          {loading && (
            <div className="row g-4">
              {Array.from({ length: PER_PAGE }).map((_, i) => (
                <div key={i} className="col-12 col-sm-6 col-lg-4"><SkeletonCard /></div>
              ))}
            </div>
          )}

          {/* Empty */}
          {!loading && news.length === 0 && (
            <div className="text-center py-5">
              <i className="fas fa-newspaper text-muted" style={{ fontSize: 64, marginBottom: 16, display: 'block' }} />
              <h4 className="fw-bold text-dark" style={{ fontFamily: "'Roboto', sans-serif" }}>Chưa có bài viết nào</h4>
              <p className="text-muted mb-4" style={{ fontFamily: "'Roboto', sans-serif" }}>Chúng tôi sẽ sớm cập nhật tin tức mới.</p>
              <Link to="/" className="btn btn-primary rounded-pill py-2 px-4" style={{ fontFamily: "'Roboto', sans-serif", fontWeight: 600 }}>
                <i className="fas fa-home me-2" />Về trang chủ
              </Link>
            </div>
          )}

          {/* Grid */}
          {!loading && news.length > 0 && (
            <div className="row g-4">
              {news.map(item => (
                <div key={item.id} className="col-12 col-sm-6 col-lg-4">
                  <NewsCard item={item} />
                </div>
              ))}
            </div>
          )}

          {/* ── Phân trang kiểu client ── */}
          {!loading && lastPage > 1 && (
            <div className="d-flex justify-content-center mt-5">
              <div className="pagination">
                <a
                  href="#"
                  onClick={e => { e.preventDefault(); if (page > 1) setPage(p => p - 1) }}
                  className={page <= 1 ? 'disabled text-muted' : ''}
                  style={{ pointerEvents: page <= 1 ? 'none' : 'auto', fontFamily: "'Roboto', sans-serif" }}
                >
                  <i className="fas fa-chevron-left" />
                </a>

                {Array.from({ length: lastPage }, (_, i) => i + 1).map(p => (
                  <a
                    key={p}
                    href="#"
                    className={p === page ? 'active' : ''}
                    onClick={e => { e.preventDefault(); setPage(p) }}
                    style={{ fontFamily: "'Roboto', sans-serif" }}
                  >
                    {p}
                  </a>
                ))}

                <a
                  href="#"
                  onClick={e => { e.preventDefault(); if (page < lastPage) setPage(p => p + 1) }}
                  className={page >= lastPage ? 'disabled text-muted' : ''}
                  style={{ pointerEvents: page >= lastPage ? 'none' : 'auto', fontFamily: "'Roboto', sans-serif" }}
                >
                  <i className="fas fa-chevron-right" />
                </a>
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  )
}

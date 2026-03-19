import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { axiosInstance } from '../api/axios'
import { Calendar, Eye, ArrowLeft, User } from 'lucide-react'

interface NewsDetail {
  id: number
  title: string
  slug: string
  content: string
  excerpt?: string | null
  thumbnail?: string | null
  thumbnail_url?: string | null
  is_featured: boolean
  view_count: number
  published_at: string
  author?: { id: number; fullname: string } | null
}

const FALLBACK_IMG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='1200' height='500' viewBox='0 0 1200 500'%3E%3Crect width='1200' height='500' fill='%23e9ecef'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-size='22' fill='%23adb5bd'%3ESpaceLink News%3C/text%3E%3C/svg%3E`

function formatDate(dateStr: string) {
  try {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return dateStr
  }
}

export default function NewsDetailPage() {
  const { slug } = useParams<{ slug: string }>()
  const [article, setArticle] = useState<NewsDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    axiosInstance
      .get(`/news/${slug}`)
      .then((res) => {
        const data = res.data?.data
        setArticle(data ?? null)
      })
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (loading) {
    const shimmer: React.CSSProperties = {
      background: 'linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)',
      backgroundSize: '200% 100%',
      animation: 'ndShimmer 1.4s infinite',
      borderRadius: 8,
    }
    return (
      <div className="container py-5" style={{ maxWidth: 860 }}>
        <style>{`@keyframes ndShimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
        <div style={{ ...shimmer, height: 28, width: '60%', marginBottom: 20 }} />
        <div style={{ ...shimmer, height: 420, marginBottom: 24, borderRadius: 16 }} />
        <div style={{ ...shimmer, height: 16, width: '80%', marginBottom: 12 }} />
        <div style={{ ...shimmer, height: 16, width: '90%', marginBottom: 12 }} />
        <div style={{ ...shimmer, height: 16, width: '70%', marginBottom: 12 }} />
      </div>
    )
  }

  // ── Not found ────────────────────────────────────────────────────────────────
  if (notFound || !article) {
    return (
      <div className="container py-5 text-center" style={{ maxWidth: 600 }}>
        <div style={{ fontSize: 64, marginBottom: 16 }}>📰</div>
        <h3 style={{ fontWeight: 700, color: '#1a1a2e' }}>Không tìm thấy bài viết</h3>
        <p className="text-muted mb-4">Bài viết bạn tìm kiếm không tồn tại hoặc đã bị xoá.</p>
        <Link
          to="/"
          className="btn btn-primary rounded-pill px-4"
          style={{ fontWeight: 600 }}
        >
          <ArrowLeft size={16} className="me-2" />
          Về trang chủ
        </Link>
      </div>
    )
  }

  // ── Article ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`
        .nd-content h1, .nd-content h2, .nd-content h3 { font-weight: 700; color: #1a1a2e; margin-top: 1.5rem; }
        .nd-content p { line-height: 1.85; color: #374151; margin-bottom: 1.1rem; }
        .nd-content img { max-width: 100%; border-radius: 10px; margin: 12px 0; }
        .nd-content a { color: #0d6efd; }
        .nd-content ul, .nd-content ol { padding-left: 24px; color: #374151; line-height: 1.8; }
        .nd-content blockquote {
          border-left: 4px solid #0d6efd;
          padding: 12px 20px;
          background: #f0f6ff;
          border-radius: 0 8px 8px 0;
          color: #374151;
          margin: 16px 0;
          font-style: italic;
        }
      `}</style>

      <div
        style={{
          background: 'linear-gradient(135deg, #667eea22 0%, #764ba222 100%)',
          padding: '48px 0 0',
        }}
      >
        <div className="container" style={{ maxWidth: 860 }}>
          {/* Breadcrumb */}
          <nav style={{ marginBottom: 24, fontSize: '0.84rem' }}>
            <Link to="/" style={{ color: '#6c757d', textDecoration: 'none' }}>Trang chủ</Link>
            <span className="mx-2" style={{ color: '#adb5bd' }}>/</span>
            <Link to="/news" style={{ color: '#6c757d', textDecoration: 'none' }}>Tin tức</Link>
            <span className="mx-2" style={{ color: '#adb5bd' }}>/</span>
            <span style={{ color: '#1a1a2e', fontWeight: 500 }}>{article.title}</span>
          </nav>

          {/* Title */}
          <h1
            style={{
              fontWeight: 800,
              fontSize: 'clamp(1.6rem, 3.5vw, 2.4rem)',
              color: '#1a1a2e',
              lineHeight: 1.3,
              marginBottom: 16,
            }}
          >
            {article.title}
          </h1>

          {/* Meta */}
          <div
            className="d-flex flex-wrap align-items-center gap-3 pb-4"
            style={{ fontSize: '0.82rem', color: '#6c757d', borderBottom: '1px solid #e9ecef' }}
          >
            {article.author?.fullname && (
              <span className="d-flex align-items-center gap-1">
                <User size={13} />
                {article.author.fullname}
              </span>
            )}
            <span className="d-flex align-items-center gap-1">
              <Calendar size={13} />
              {formatDate(article.published_at)}
            </span>
            <span className="d-flex align-items-center gap-1">
              <Eye size={13} />
              {article.view_count} lượt xem
            </span>
            {article.is_featured && (
              <span
                style={{
                  background: 'linear-gradient(135deg,#0d6efd,#6610f2)',
                  color: '#fff',
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: 20,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                }}
              >
                ⭐ Nổi bật
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="container py-4 pb-5" style={{ maxWidth: 860 }}>
        {/* Thumbnail */}
        {(article.thumbnail_url || article.thumbnail) && (
          <img
            src={article.thumbnail_url || article.thumbnail || FALLBACK_IMG}
            alt={article.title}
            style={{
              width: '100%',
              maxHeight: 480,
              objectFit: 'cover',
              borderRadius: 16,
              marginBottom: 32,
              boxShadow: '0 12px 40px rgba(0,0,0,0.12)',
            }}
            onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_IMG }}
          />
        )}

        {/* Excerpt */}
        {article.excerpt && (
          <p
            style={{
              fontSize: '1.05rem',
              color: '#374151',
              fontWeight: 500,
              lineHeight: 1.7,
              borderLeft: '4px solid #0d6efd',
              paddingLeft: 16,
              marginBottom: 24,
              fontStyle: 'italic',
            }}
          >
            {article.excerpt}
          </p>
        )}

        {/* Content */}
        <div
          className="nd-content"
          dangerouslySetInnerHTML={{ __html: article.content }}
          style={{ fontSize: '1rem', lineHeight: 1.9 }}
        />

        {/* Back button */}
        <div
          style={{
            marginTop: 48,
            paddingTop: 24,
            borderTop: '1px solid #e9ecef',
          }}
        >
          <Link
            to="/"
            className="btn btn-outline-primary rounded-pill px-4"
            style={{ fontWeight: 600, fontSize: '0.88rem' }}
          >
            <ArrowLeft size={15} className="me-2" />
            Về trang chủ
          </Link>
        </div>
      </div>
    </>
  )
}

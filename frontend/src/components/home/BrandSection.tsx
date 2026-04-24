import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { axiosInstance } from "../../api/axios";

interface Brand {
    id: number;
    name: string;
    slug: string;
    logo: string | null;
    is_active: boolean;
    display_order: number;
}

const STORAGE_BASE = "http://localhost:8000/storage/";

const getLogoUrl = (logo: string | null): string | null => {
    if (!logo) return null;
    if (logo.startsWith("http")) return logo;
    return `${STORAGE_BASE}${logo}`;
};

const BrandSection: React.FC = () => {
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axiosInstance
            .get("/brands", { params: { is_active: true, all: true } })
            .then((res) => {
                const raw: Brand[] = res.data?.data || res.data || [];
                setBrands(raw.filter((b) => b.is_active && b.logo).slice(0, 7));
            })
            .catch((e) => console.error("BrandSection fetch error", e))
            .finally(() => setLoading(false));
    }, []);

    if (loading) return <BrandSkeleton />;
    if (brands.length === 0) return null;

    return (
        <section className="container-fluid py-4" style={{ background: '#f8f9fa' }}>
            <style>{`
                .bs-wrap {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    text-decoration: none;
                    gap: 6px;
                }
                .bs-img {
                    width: 100px;
                    height: 100px;
                    object-fit: contain;
                    transition: transform 0.18s ease, filter 0.18s ease;
                    border-radius: 14px;
                    mix-blend-mode: multiply;
                }
                .bs-wrap:hover .bs-img {
                    transform: translateY(-4px) scale(1.07);
                    filter: drop-shadow(0 4px 8px rgba(0,0,0,0.12));
                }
                .bs-name {
                    font-size: 0.85rem;
                    font-weight: 600;
                    color: #444;
                    text-align: center;
                    line-height: 1.35;
                    max-width: 110px;
                    overflow: hidden;
                    display: -webkit-box;
                    -webkit-line-clamp: 2;
                    -webkit-box-orient: vertical;
                    font-family: 'Roboto', sans-serif;
                    transition: color 0.18s ease;
                }
                .bs-wrap:hover .bs-name {
                    color: var(--bs-primary);
                }
                .bs-grid {
                    display: flex;
                    flex-wrap: wrap;
                    gap: 32px 72px;
                    justify-content: center;
                }
                @media (max-width: 576px) {
                    .bs-img { width: 76px; height: 76px; }
                    .bs-name { font-size: 0.75rem; max-width: 84px; }
                    .bs-grid { gap: 24px 36px; }
                }
            `}</style>

            <div className="container">
                {/* Header — căn giữa + nổi bật như ProductTabs */}
                <div className="text-center mb-4">
                    <h5
                        className="text-primary text-uppercase fw-bold mb-1"
                        style={{
                            fontFamily: "'Roboto', sans-serif",
                            letterSpacing: '2px',
                            fontSize: '0.82rem',
                        }}
                    >
                        <i className="fas fa-award me-2" />Đối Tác
                    </h5>
                    <h4
                        className="fw-bold text-dark mb-0"
                        style={{
                            fontFamily: "'Roboto', sans-serif",
                            fontSize: 'clamp(1.3rem, 2.5vw, 1.8rem)',
                        }}
                    >
                        Thương Hiệu Nổi Bật
                    </h4>
                </div>

                {/* Grid */}
                <div className="bs-grid mb-4">
                    {brands.map((brand) => {
                        const logoUrl = getLogoUrl(brand.logo);
                        if (!logoUrl) return null;
                        return (
                            <Link
                                key={brand.id}
                                to={`/shop?brand=${brand.slug}`}
                                className="bs-wrap"
                            >
                                <img
                                    src={logoUrl}
                                    alt={brand.name}
                                    className="bs-img"
                                    onError={(e) => {
                                        (e.currentTarget.parentElement as HTMLElement).style.display = "none";
                                    }}
                                />
                                <span className="bs-name">{brand.name}</span>
                            </Link>
                        );
                    })}
                </div>

            </div>
        </section>
    );
};

/* Skeleton */
const BrandSkeleton: React.FC = () => (
    <section className="container-fluid py-4" style={{ background: '#f8f9fa' }}>
        <style>{`
            @keyframes bsSkim {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
            .bs-skel {
                width: 100px; height: 100px; border-radius: 14px;
                background: linear-gradient(90deg,#ececec 25%,#f5f5f5 50%,#ececec 75%);
                background-size: 200% 100%;
                animation: bsSkim 1.4s infinite;
            }
            .bs-skel-txt {
                width: 52px; height: 9px; border-radius: 5px; margin-top: 7px;
                background: linear-gradient(90deg,#ececec 25%,#f5f5f5 50%,#ececec 75%);
                background-size: 200% 100%;
                animation: bsSkim 1.4s infinite;
            }
        `}</style>
        <div className="container">
            <div style={{ display: "flex", flexWrap: "wrap", gap: "32px 72px", justifyContent: "center" }}>
                {[...Array(8)].map((_, i) => (
                    <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <div className="bs-skel" />
                        <div className="bs-skel-txt" />
                    </div>
                ))}
            </div>
        </div>
    </section>
);

export default BrandSection;

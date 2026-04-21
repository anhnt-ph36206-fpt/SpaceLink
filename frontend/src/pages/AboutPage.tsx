import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';

// ── Animated counter hook ──────────────────────────────────────────────────
function useCountUp(target: number, duration = 2000, start = false) {
    const [count, setCount] = useState(0);
    useEffect(() => {
        if (!start) return;
        let startTime: number | null = null;
        const step = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / duration, 1);
            setCount(Math.floor(progress * target));
            if (progress < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
    }, [target, duration, start]);
    return count;
}

// ── Data ────────────────────────────────────────────────────────────────────
const STATS = [
    { icon: 'fas fa-users', value: 50000, suffix: '+', label: 'Khách hàng tin dùng' },
    { icon: 'fas fa-store', value: 12, suffix: '', label: 'Chi nhánh toàn quốc' },
    { icon: 'fas fa-box-open', value: 3000, suffix: '+', label: 'Sản phẩm công nghệ' },
    { icon: 'fas fa-star', value: 99, suffix: '%', label: 'Khách hàng hài lòng' },
];

const VALUES = [
    {
        icon: 'fas fa-shield-alt',
        color: '#f28b01',
        title: 'Chính hãng 100%',
        desc: 'Toàn bộ sản phẩm nhập khẩu chính ngạch, có tem bảo hành nhà sản xuất, cam kết không hàng giả hàng nhái.',
    },
    {
        icon: 'fas fa-sync-alt',
        color: '#0d6efd',
        title: 'Đổi trả dễ dàng',
        desc: 'Chính sách đổi trả 15 ngày không cần lý do. Bảo hành chính hãng từ 12 – 24 tháng tùy sản phẩm.',
    },
    {
        icon: 'fas fa-headset',
        color: '#198754',
        title: 'Hỗ trợ 24/7',
        desc: 'Đội ngũ tư vấn công nghệ luôn trực tuyến, sẵn sàng hỗ trợ bạn chọn thiết bị phù hợp nhất.',
    },
    {
        icon: 'fas fa-truck',
        color: '#f28b01',
        title: 'Giao hàng nhanh',
        desc: 'Giao hàng toàn quốc trong 24 – 48 giờ. Miễn phí vận chuyển cho đơn hàng từ 500.000 VNĐ.',
    },
    {
        icon: 'fas fa-tag',
        color: '#6f42c1',
        title: 'Giá cạnh tranh',
        desc: 'Cam kết giá tốt nhất thị trường. Nếu tìm thấy nơi rẻ hơn, SpaceLink hoàn tiền chênh lệch.',
    },
    {
        icon: 'fas fa-credit-card',
        color: '#20c997',
        title: 'Thanh toán an toàn',
        desc: 'Hỗ trợ COD, chuyển khoản, ví điện tử (Momo, ZaloPay) và thẻ tín dụng 0% lãi suất.',
    },
];

const TEAM = [
    {
        name: 'Vũ Hoàng Hiệp',
        role: 'CEO & Nhà sáng lập',
        avatar: 'https://i.pravatar.cc/150?img=11',
        quote: '"Công nghệ không chỉ là công cụ — đó là cầu nối tương lai."',
    },
    {
        name: 'Nguyễn Duy Hưng',
        role: 'Giám đốc Kinh doanh',
        avatar: 'https://i.pravatar.cc/150?img=49',
        quote: '"Khách hàng hài lòng là thành công lớn nhất của chúng tôi."',
    },
    {
        name: 'Nguyễn Thế Anh',
        role: 'Trưởng phòng Kỹ thuật',
        avatar: 'https://i.pravatar.cc/150?img=67',
        quote: '"Mỗi sản phẩm qua tay chúng tôi đều được kiểm tra kỹ lưỡng."',
    },
    {
        name: 'Hà Văn Mạnh',
        role: 'Quản lý Trải nghiệm KH',
        avatar: 'https://i.pravatar.cc/150?img=45',
        quote: '"Nụ cười của khách hàng là động lực mỗi ngày."',
    },
    {
        name: 'Nguyễn Hữu Đan',
        role: 'Quản lý Trải nghiệm KH',
        avatar: 'https://i.pravatar.cc/150?img=45',
        quote: '"Nụ cười của khách hàng là động lực mỗi ngày."',
    },
];

const TIMELINE = [
    { year: '2018', title: 'Thành lập SpaceLink', desc: 'Ra mắt cửa hàng đầu tiên tại Cầu Giấy, Hà Nội với 200 sản phẩm điện thoại chính hãng.' },
    { year: '2019', title: 'Mở rộng danh mục', desc: 'Bổ sung laptop, máy tính bảng và thiết bị âm thanh, nâng tổng sản phẩm lên 800+.' },
    { year: '2020', title: 'Ra mắt website', desc: 'Khai trương nền tảng thương mại điện tử SpaceLink.vn, phục vụ khách hàng toàn quốc 24/7.' },
    { year: '2021', title: '5 chi nhánh', desc: 'Mở thêm 4 chi nhánh tại Hà Nội & TP.HCM, đạt 10.000 đơn hàng mỗi tháng.' },
    { year: '2022', title: 'Đạt 30.000 KH', desc: 'Vượt mốc 30.000 khách hàng trung thành, ra mắt chương trình tích điểm SpaceLink Star.' },
    { year: '2024', title: '12 chi nhánh toàn cầu', desc: 'Phủ sóng 63 tỉnh thành với hệ thống giao hàng nhanh, đạt doanh thu 100 tỷ VNĐ.' },
];

const CATEGORIES = [
    { icon: 'fas fa-mobile-alt', label: 'Điện thoại', count: '500+' },
    { icon: 'fas fa-laptop', label: 'Laptop', count: '300+' },
    { icon: 'fas fa-tablet-alt', label: 'Máy tính bảng', count: '150+' },
    { icon: 'fas fa-headphones', label: 'Âm thanh', count: '400+' },
    { icon: 'fas fa-gamepad', label: 'Gaming', count: '200+' },
    { icon: 'fas fa-camera', label: 'Máy ảnh', count: '120+' },
    { icon: 'fas fa-tv', label: 'Smart TV', count: '80+' },
    { icon: 'fas fa-watch', label: 'Smartwatch', count: '250+' },
];

// ── Stat Card ───────────────────────────────────────────────────────────────
const StatCard: React.FC<{ icon: string; value: number; suffix: string; label: string; animate: boolean }> = ({
    icon, value, suffix, label, animate,
}) => {
    const count = useCountUp(value, 2000, animate);
    return (
        <div className="col-6 col-md-3">
            <div className="text-center p-4" style={{ borderRadius: '1rem', background: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(6px)' }}>
                <i className={`${icon} fa-2x mb-3`} style={{ color: '#f28b01' }}></i>
                <div className="display-5 fw-bold text-white">{count.toLocaleString()}{suffix}</div>
                <div className="text-white-50 mt-1">{label}</div>
            </div>
        </div>
    );
};

// ── Main Component ──────────────────────────────────────────────────────────
const AboutPage: React.FC = () => {
    const statsRef = useRef<HTMLDivElement>(null);
    const [statsVisible, setStatsVisible] = useState(false);

    useEffect(() => {
        const observer = new IntersectionObserver(([entry]) => {
            if (entry.isIntersecting) setStatsVisible(true);
        }, { threshold: 0.3 });
        if (statsRef.current) observer.observe(statsRef.current);
        return () => observer.disconnect();
    }, []);

    return (
        <div style={{ fontFamily: "'Inter', sans-serif" }}>

            {/* ── HERO ── */}
            <section
                style={{
                    background: 'linear-gradient(135deg, #ffffffff 0%, #ffffffff 50%, #fdfdfdff 100%)',
                    padding: '100px 0 80px',
                    position: 'relative',
                    overflow: 'hidden',
                }}
            >
                {/* Red glow */}
                <div style={{
                    position: 'absolute', top: '50%', left: '50%',
                    transform: 'translate(-50%,-50%)',
                    width: 600, height: 600, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(255, 255, 255, 0.15) 0%, transparent 70%)',
                    pointerEvents: 'none',
                }} />

                <div className="container text-center position-relative">
                    <nav aria-label="breadcrumb" className="mb-4">
                        <ol className="breadcrumb justify-content-center" style={{ background: 'transparent' }}>
                            <li className="breadcrumb-item">
                                <Link to="/" className="text-decoration-none" style={{ color: '#aaa' }}>Trang chủ</Link>
                            </li>
                            <li className="breadcrumb-item active" style={{ color: '#f28b01' }}>Giới thiệu</li>
                        </ol>
                    </nav>

                    <div className="mb-3">
                        <span style={{
                            background: 'rgba(224,4,41,0.15)', border: '1px solid rgba(224,4,41,0.4)',
                            color: '#f28b01', borderRadius: 999, padding: '6px 20px', fontSize: 13, fontWeight: 600,
                        }}>
                            🚀 Thành lập từ năm 2018
                        </span>
                    </div>

                    <h1 className="display-3 fw-bold text-white mb-4" style={{ letterSpacing: '-1px' }}>
                        <span style={{ color: '#f28b01' }}> Về SpaceLink</span>
                    </h1>

                    <p className="lead mx-auto mb-5" style={{ maxWidth: 640, color: '#bbb', lineHeight: 1.8 }}>
                        Chúng tôi là hệ thống bán lẻ công nghệ hàng đầu Việt Nam — nơi kết nối hàng triệu người dùng với  
                        những sản phẩm công nghệ chính hãng, chất lượng và giá tốt nhất thị trường.
                    </p>

                    <div className="d-flex gap-3 justify-content-center flex-wrap">
                        <Link to="/shop" className="btn btn-lg px-5 py-3 fw-bold" style={{
                            background: '#f28b01', color: '#ffffffff', borderRadius: 999, border: 'none',
                            boxShadow: '0 8px 30px rgba(224,4,41,0.4)',
                        }}>
                            <i className="fas fa-shopping-bag me-2"></i> Mua sắm ngay
                        </Link>
                        <Link to="/contact" className="btn btn-lg px-5 py-3 fw-bold" style={{
                            background: 'transparent', color: '#f28b01', borderRadius: 999,
                            border: '1px solid #f28b01',
                        }}>
                            <i className="fas fa-envelope me-2"></i> Liên hệ
                        </Link>
                    </div>
                </div>
            </section>

            {/* ── STATS ── */}
            <section
                ref={statsRef}
                style={{ background: 'linear-gradient(90deg,#f28b01,#f28b01)', padding: '64px 0' }}
            >
                <div className="container">
                    <div className="row g-4">
                        {STATS.map((s, i) => (
                            <StatCard key={i} {...s} animate={statsVisible} />
                        ))}
                    </div>
                </div>
            </section>

            {/* ── OUR STORY ── */}
            <section style={{ background: '#f8f9fa', padding: '90px 0' }}>
                <div className="container">
                    <div className="row align-items-center g-5">
                        <div className="col-lg-5">
                            <div style={{ position: 'relative' }}>
                                <img
                                    src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=600&q=80"
                                    alt="SpaceLink cửa hàng"
                                    className="w-100 rounded-4 shadow-lg"
                                    style={{ objectFit: 'cover', height: 420 }}
                                />
                                {/* Floating badge */}
                                <div style={{
                                    position: 'absolute', bottom: -20, right: -20,
                                    background: '#f28b01', color: '#fff', borderRadius: '1rem',
                                    padding: '16px 24px', boxShadow: '0 8px 30px rgba(224,4,41,0.5)',
                                }}>
                                    <div className="fw-bold" style={{ fontSize: 28 }}>6+</div>
                                    <div style={{ fontSize: 13 }}>Năm kinh nghiệm</div>
                                </div>
                            </div>
                        </div>
                        <div className="col-lg-7">
                            <div className="mb-2" style={{ color: '#f28b01', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, fontSize: 13 }}>
                                Câu chuyện của chúng tôi
                            </div>
                            <h2 className="display-5 fw-bold mb-4" style={{ lineHeight: 1.2 }}>
                                Từ một cửa hàng nhỏ đến hệ thống công nghệ toàn quốc
                            </h2>
                            <p className="text-muted mb-4" style={{ lineHeight: 1.9, fontSize: 16 }}>
                                SpaceLink ra đời năm 2018 với sứ mệnh đơn giản: mang đến cho người Việt Nam cơ hội sở hữu 
                                các sản phẩm công nghệ chính hãng với giá hợp lý nhất. Xuất phát từ một cửa hàng điện thoại 
                                nhỏ ở Cầu Giấy, chúng tôi đã dần lớn mạnh thành hệ thống bán lẻ multi-channel với 12 chi nhánh 
                                trải dài từ Hà Nội đến TP.HCM.
                            </p>
                            <p className="text-muted mb-5" style={{ lineHeight: 1.9, fontSize: 16 }}>
                                Hơn 50.000 khách hàng trung thành là minh chứng rõ ràng nhất cho cam kết của chúng tôi:  
                                <strong> chất lượng thật, giá thật, dịch vụ thật</strong>. Chúng tôi không chỉ bán sản phẩm, 
                                chúng tôi kết nối con người với công nghệ — và kết nối với nhau.
                            </p>
                            <div className="row g-3">
                                {[
                                    { icon: 'fas fa-check-circle', text: 'Apple Premium Reseller được ủy quyền' },
                                    { icon: 'fas fa-check-circle', text: 'Đại lý chính thức Samsung, Xiaomi, OPPO' },
                                    { icon: 'fas fa-check-circle', text: 'Chứng nhận ISO 9001:2015' },
                                    { icon: 'fas fa-check-circle', text: 'Top 10 nhà bán lẻ điện tử uy tín 2024' },
                                ].map((item, i) => (
                                    <div key={i} className="col-md-6 d-flex align-items-center gap-2">
                                        <i className={`${item.icon}`} style={{ color: '#f28b01', fontSize: 18 }}></i>
                                        <span style={{ fontSize: 15 }}>{item.text}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* ── PRODUCT CATEGORIES ── */}
            <section style={{ background: '#fff', padding: '90px 0' }}>
                <div className="container">
                    <div className="text-center mb-5">
                        <div className="mb-2" style={{ color: '#f28b01', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, fontSize: 13 }}>
                            Danh mục sản phẩm
                        </div>
                        <h2 className="display-5 fw-bold mb-3">Hơn 3.000 sản phẩm công nghệ</h2>
                        <p className="text-muted mx-auto" style={{ maxWidth: 560 }}>
                            Từ flagship đắt tiền đến phân khúc phổ thông — SpaceLink cung cấp giải pháp công nghệ cho mọi nhu cầu và ngân sách.
                        </p>
                    </div>
                    <div className="row g-3">
                        {CATEGORIES.map((cat, i) => (
                            <div key={i} className="col-6 col-md-3">
                                <Link to="/shop" className="text-decoration-none">
                                    <div
                                        className="text-center p-4 h-100 rounded-3 border"
                                        style={{ transition: 'all .25s', cursor: 'pointer' }}
                                        onMouseEnter={e => {
                                            (e.currentTarget as HTMLDivElement).style.background = '#f28b01';
                                            (e.currentTarget as HTMLDivElement).style.color = '#fff';
                                            (e.currentTarget as HTMLDivElement).style.borderColor = '#f28b01';
                                            (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)';
                                            (e.currentTarget as HTMLDivElement).style.boxShadow = '0 12px 40px rgba(224,4,41,0.25)';
                                        }}
                                        onMouseLeave={e => {
                                            (e.currentTarget as HTMLDivElement).style.background = '';
                                            (e.currentTarget as HTMLDivElement).style.color = '';
                                            (e.currentTarget as HTMLDivElement).style.borderColor = '';
                                            (e.currentTarget as HTMLDivElement).style.transform = '';
                                            (e.currentTarget as HTMLDivElement).style.boxShadow = '';
                                        }}
                                    >
                                        <i className={`${cat.icon} fa-2x mb-3 d-block`}></i>
                                        <div className="fw-bold mb-1">{cat.label}</div>
                                        <div style={{ fontSize: 13, opacity: 0.7 }}>{cat.count} sản phẩm</div>
                                    </div>
                                </Link>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CORE VALUES ── */}
            <section style={{ background: '#f8f9fa', padding: '90px 0' }}>
                <div className="container">
                    <div className="text-center mb-5">
                        <div className="mb-2" style={{ color: '#f28b01', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, fontSize: 13 }}>
                            Cam kết của chúng tôi
                        </div>
                        <h2 className="display-5 fw-bold mb-3">Tại sao chọn SpaceLink?</h2>
                        <p className="text-muted mx-auto" style={{ maxWidth: 560 }}>
                            Chúng tôi xây dựng lòng tin qua từng giao dịch, từng sản phẩm và từng trải nghiệm khách hàng.
                        </p>
                    </div>
                    <div className="row g-4">
                        {VALUES.map((v, i) => (
                            <div key={i} className="col-md-6 col-lg-4">
                                <div
                                    className="bg-white rounded-4 p-4 h-100 shadow-sm"
                                    style={{ borderTop: `3px solid ${v.color}`, transition: 'transform .25s' }}
                                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-6px)'}
                                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = ''}
                                >
                                    <div
                                        className="d-inline-flex align-items-center justify-content-center mb-4"
                                        style={{
                                            width: 56, height: 56, borderRadius: '14px',
                                            background: `${v.color}15`,
                                        }}
                                    >
                                        <i className={`${v.icon} fa-lg`} style={{ color: v.color }}></i>
                                    </div>
                                    <h5 className="fw-bold mb-2">{v.title}</h5>
                                    <p className="text-muted mb-0" style={{ lineHeight: 1.7, fontSize: 15 }}>{v.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── TIMELINE ── */}
            <section style={{ background: '#fff', padding: '90px 0' }}>
                <div className="container">
                    <div className="text-center mb-5">
                        <div className="mb-2" style={{ color: '#f28b01', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, fontSize: 13 }}>
                            Lịch sử phát triển
                        </div>
                        <h2 className="display-5 fw-bold mb-3">Hành trình 6 năm của SpaceLink</h2>
                    </div>
                    <div className="row justify-content-center">
                        <div className="col-lg-8">
                            {TIMELINE.map((item, i) => (
                                <div key={i} className="d-flex gap-4 mb-4">
                                    <div className="d-flex flex-column align-items-center">
                                        <div style={{
                                            width: 52, height: 52, borderRadius: '50%',
                                            background: i % 2 === 0 ? '#f28b01' : '#0d6efd',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: '#fff', fontWeight: 700, fontSize: 13, flexShrink: 0,
                                        }}>
                                            {item.year}
                                        </div>
                                        {i < TIMELINE.length - 1 && (
                                            <div style={{ width: 2, flex: 1, background: '#e9ecef', marginTop: 4 }} />
                                        )}
                                    </div>
                                    <div className="bg-light rounded-3 p-4 mb-4 flex-fill">
                                        <div className="fw-bold mb-1" style={{ fontSize: 17 }}>{item.title}</div>
                                        <div className="text-muted" style={{ fontSize: 15, lineHeight: 1.7 }}>{item.desc}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            {/* ── TEAM ── */}
            <section style={{ background: '#f8f9fa', padding: '90px 0' }}>
                <div className="container">
                    <div className="text-center mb-5">
                        <div className="mb-2" style={{ color: '#f28b01', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, fontSize: 13 }}>
                            Đội ngũ lãnh đạo
                        </div>
                        <h2 className="display-5 fw-bold mb-3">Những con người phía sau SpaceLink</h2>
                        <p className="text-muted mx-auto" style={{ maxWidth: 520 }}>
                            Đội ngũ nhiệt huyết, giàu kinh nghiệm với niềm đam mê công nghệ và sứ mệnh phục vụ khách hàng.
                        </p>
                    </div>
                    <div className="row g-4 justify-content-center">
                        {TEAM.map((member, i) => (
                            <div key={i} className="col-sm-6 col-lg-3">
                                <div
                                    className="bg-white rounded-4 p-4 text-center shadow-sm h-100"
                                    style={{ transition: 'transform .25s' }}
                                    onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-6px)'}
                                    onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.transform = ''}
                                >
                                    <img
                                        src={member.avatar}
                                        alt={member.name}
                                        className="rounded-circle mb-3"
                                        style={{ width: 90, height: 90, objectFit: 'cover', border: '3px solid #f28b01' }}
                                    />
                                    <h6 className="fw-bold mb-1">{member.name}</h6>
                                    <div className="text-muted mb-3" style={{ fontSize: 13 }}>{member.role}</div>
                                    <p style={{ fontSize: 13, color: '#666', lineHeight: 1.6, fontStyle: 'italic' }}>{member.quote}</p>
                                    <div className="d-flex justify-content-center gap-2 mt-3">
                                        <a href="#" style={{ color: '#0d6efd' }}><i className="fab fa-linkedin"></i></a>
                                        <a href="#" style={{ color: '#f28b01' }}><i className="fab fa-facebook"></i></a>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── PARTNERS / BRANDS ── */}
            <section style={{ background: '#fff', padding: '60px 0' }}>
                <div className="container">
                    <div className="text-center mb-5">
                        <div className="mb-2" style={{ color: '#f28b01', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 2, fontSize: 13 }}>
                            Đối tác thương hiệu
                        </div>
                        <h2 className="fw-bold h3 mb-2">Các thương hiệu công nghệ chúng tôi phân phối</h2>
                    </div>
                    <div className="row g-3 align-items-center justify-content-center text-center">
                        {['Apple', 'Samsung', 'Sony', 'Xiaomi', 'OPPO', 'Asus', 'Dell', 'HP'].map((brand, i) => (
                            <div key={i} className="col-6 col-md-3 col-lg-auto px-4">
                                <div
                                    className="py-3 px-4 rounded-3"
                                    style={{
                                        fontSize: 20, fontWeight: 800, letterSpacing: -0.5,
                                        color: '#999', border: '1px solid #eee', transition: 'all .25s',
                                    }}
                                    onMouseEnter={e => {
                                        (e.currentTarget as HTMLDivElement).style.color = '#f28b01';
                                        (e.currentTarget as HTMLDivElement).style.borderColor = '#f28b01';
                                        (e.currentTarget as HTMLDivElement).style.background = 'rgba(224,4,41,0.05)';
                                    }}
                                    onMouseLeave={e => {
                                        (e.currentTarget as HTMLDivElement).style.color = '#999';
                                        (e.currentTarget as HTMLDivElement).style.borderColor = '#eee';
                                        (e.currentTarget as HTMLDivElement).style.background = '';
                                    }}
                                >
                                    {brand}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ── CTA ── */}
            <section style={{
                background: 'linear-gradient(135deg, #f28b01 0%, #7a0014 100%)',
                padding: '90px 0',
            }}>
                <div className="container text-center text-white">
                    <h2 className="display-5 fw-bold mb-4">Sẵn sàng khám phá công nghệ cùng SpaceLink?</h2>
                    <p className="lead mb-5 mx-auto" style={{ maxWidth: 560, opacity: 0.9 }}>
                        Hàng ngàn sản phẩm chính hãng, giá tốt và dịch vụ tận tâm đang chờ bạn.
                    </p>
                    <div className="d-flex gap-3 justify-content-center flex-wrap">
                        <Link to="/shop" className="btn btn-lg px-5 py-3 fw-bold" style={{
                            background: '#fff', color: '#f28b01', borderRadius: 999,
                            boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                        }}>
                            <i className="fas fa-store me-2"></i> Xem cửa hàng
                        </Link>
                        <Link to="/contact" className="btn btn-lg px-5 py-3 fw-bold" style={{
                            background: 'transparent', color: '#fff', borderRadius: 999,
                            border: '2px solid rgba(255,255,255,0.5)',
                        }}>
                            <i className="fas fa-phone me-2"></i> Tư vấn miễn phí
                        </Link>
                    </div>
                </div>
            </section>

        </div>
    );
};

export default AboutPage;

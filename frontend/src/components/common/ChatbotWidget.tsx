import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { axiosInstance } from '../../api/axios';

// ─── Types ───────────────────────────────────────────────────────────────────
interface Message {
    id: string;
    role: 'user' | 'bot';
    content: React.ReactNode;  // supports JSX cards
    time: string;
}

interface OrderSummary {
    id: number;
    order_code: string;
    status: string;
    payment_status: string;
    total_amount: number;
    created_at: string;
    items?: { product_name: string; quantity: number }[];
}

// ─── Constants ────────────────────────────────────────────────────────────────
const BOT_NAME = 'SpaceLink AI';

const QUICK_REPLIES = [
    'Kiểm tra đơn hàng',
    'Tôi cần tư vấn sản phẩm',
    'Chính sách đổi trả?',
    'Phí vận chuyển?',
];

const ORDER_STATUS_LABEL: Record<string, { label: string; icon: string; color: string }> = {
    pending:    { label: 'Chờ xác nhận',    icon: '⏳', color: '#b45309' },
    confirmed:  { label: 'Đã xác nhận',     icon: '✅', color: '#0369a1' },
    processing: { label: 'Đang đóng gói',   icon: '📦', color: '#7c3aed' },
    shipping:   { label: 'Đang vận chuyển', icon: '🚚', color: '#ea580c' },
    delivered:  { label: 'Đã giao hàng',    icon: '🎁', color: '#0f766e' },
    completed:  { label: 'Hoàn thành',      icon: '🎉', color: '#15803d' },
    cancelled:  { label: 'Đã hủy',          icon: '❌', color: '#b91c1c' },
    returned:   { label: 'Hoàn trả',        icon: '↩️', color: '#64748b' },
};

const PAYMENT_STATUS_LABEL: Record<string, string> = {
    unpaid:         'Chưa thanh toán',
    paid:           'Đã thanh toán',
    refunded:       'Đã hoàn tiền',
    partial_refund: 'Hoàn một phần',
};

// ─── FAQ Engine ───────────────────────────────────────────────────────────────
const FAQ: { pattern: RegExp; answer: string }[] = [
    {
        pattern: /chào|hello|hi|xin chào/i,
        answer: 'Xin chào! 👋 Tôi là trợ lý ảo của **SpaceLink**. Tôi có thể giúp bạn:\n- 🔍 **Tra cứu tình trạng đơn hàng**\n- 💻 **Tư vấn sản phẩm công nghệ**\n- 📋 **Giải đáp chính sách mua hàng**\n\nBạn cần hỗ trợ gì hôm nay?',
    },
    {
        pattern: /đổi trả|bảo hành|hoàn tiền|trả hàng/i,
        answer: '🔄 **Chính sách đổi trả SpaceLink:**\n- Đổi trả trong **7 ngày** nếu có lỗi nhà sản xuất\n- Bảo hành chính hãng từ **12–24 tháng** tuỳ sản phẩm\n- Hoàn tiền 100% nếu hàng không đúng mô tả\n\nLiên hệ hotline **1900 1234** để được hỗ trợ nhanh nhất!',
    },
    {
        pattern: /vận chuyển|giao hàng|ship|phí ship/i,
        answer: '🚚 **Phí vận chuyển:**\n- Miễn phí với đơn hàng từ **500.000đ** trở lên\n- Giao hàng nhanh 2–5 ngày làm việc\n- Hà Nội & TP.HCM: giao trong **24h**\n\nBạn muốn kiểm tra tình trạng đơn hàng không?',
    },
    {
        pattern: /thanh toán|trả góp|momo|vnpay|visa|thẻ/i,
        answer: '💳 **Phương thức thanh toán:**\n- Thanh toán khi nhận hàng (COD)\n- Chuyển khoản ngân hàng\n- Ví điện tử: MoMo, ZaloPay, VNPay\n- Thẻ Visa / MasterCard\n- Trả góp 0% lãi suất qua thẻ tín dụng',
    },
    {
        pattern: /sản phẩm nổi bật|bán chạy|bestseller|top|phổ biến/i,
        answer: '🔥 **Sản phẩm hot tháng này:**\n- Laptop Gaming ASUS ROG Strix\n- iPhone 15 Pro Max\n- Màn hình LG UltraWide 34"\n- Tai nghe Sony WH-1000XM5\n- SSD Samsung 990 Pro 2TB\n\nBạn có muốn xem thêm chi tiết không?',
    },
    {
        pattern: /laptop|máy tính xách tay/i,
        answer: '💻 **Tư vấn Laptop:**\n- **Gaming:** ASUS ROG, MSI, Lenovo Legion\n- **Văn phòng:** Dell XPS, HP Spectre, MacBook Air\n- **Học sinh:** Acer Aspire, HP 14s, ASUS VivoBook\n\nBạn có ngân sách cụ thể không? Tôi sẽ gợi ý phù hợp hơn! 😊',
    },
    {
        pattern: /điện thoại|phone|iphone|samsung|android/i,
        answer: '📱 **Tư vấn Điện thoại:**\n- **iPhone:** iPhone 15, 15 Plus, 15 Pro, 15 Pro Max\n- **Samsung:** Galaxy S24, A55, A35\n- **Xiaomi:** Redmi Note 13, Poco X6 Pro\n\nBạn ưu tiên hệ điều hành iOS hay Android?',
    },
    {
        pattern: /tư vấn|cần mua|muốn mua|gợi ý|recommend/i,
        answer: '😊 Tôi rất vui được tư vấn cho bạn! Để gợi ý chính xác hơn, bạn cho biết:\n1️⃣ Bạn cần thiết bị gì? (Laptop, điện thoại, tai nghe...)\n2️⃣ Ngân sách dự kiến?\n3️⃣ Mục đích sử dụng chính?',
    },
    {
        pattern: /liên hệ|hotline|email|địa chỉ|cửa hàng/i,
        answer: '📞 **Thông tin liên hệ SpaceLink:**\n- **Hotline:** 1900 1234 (8:00–22:00)\n- **Email:** hotro@spacelink.vn\n- **Địa chỉ:** 123 Cầu Giấy, Hà Nội\n\nHoặc chat trực tiếp với tôi ngay đây! 😊',
    },
];

const DEFAULT_RESPONSE = 'Cảm ơn bạn đã nhắn tin! 😊 Tôi chưa hiểu rõ câu hỏi của bạn. Bạn có thể hỏi về:\n- 🔍 **Tra cứu đơn hàng** — nhắn "kiểm tra đơn hàng"\n- 💻 **Tư vấn sản phẩm** — laptop, điện thoại...\n- 📋 **Chính sách** — đổi trả, vận chuyển, thanh toán\n\nHoặc liên hệ hotline **1900 1234** để được hỗ trợ trực tiếp!';

function getFaqResponse(input: string): string | null {
    for (const faq of FAQ) {
        if (faq.pattern.test(input)) return faq.answer;
    }
    return null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getNow(): string {
    return new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

function formatVND(v: number): string {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(v);
}

function formatText(text: string): React.ReactNode {
    const lines = text.split('\n');
    return lines.map((line, i) => (
        <span key={i}>
            {line.split(/\*\*(.*?)\*\*/g).map((part, j) =>
                j % 2 === 1 ? <strong key={j}>{part}</strong> : part
            )}
            {i < lines.length - 1 && <br />}
        </span>
    ));
}

// ─── Order Intent Detection ───────────────────────────────────────────────────
const ORDER_INTENT_PATTERN = /đơn hàng|tra cứu|kiểm tra đơn|tình trạng đơn|đơn của tôi|order|mã đơn|check order/i;
// Pattern để extract mã đơn hàng (format: SL-XXXXXXXX hoặc số thuần túy)
const ORDER_CODE_PATTERN = /\b(SL[-_]?[A-Z0-9]{6,}|[A-Z]{2,}[0-9]{6,})\b/i;

// ─── Order Card Component ─────────────────────────────────────────────────────
const OrderCard: React.FC<{ order: OrderSummary; onView: (id: number) => void }> = ({ order, onView }) => {
    const st = ORDER_STATUS_LABEL[order.status] ?? { label: order.status, icon: '📋', color: '#64748b' };
    const payLabel = PAYMENT_STATUS_LABEL[order.payment_status] ?? order.payment_status;
    return (
        <div className="cw-order-card">
            <div className="cw-order-card-header">
                <span className="cw-order-code">#{order.order_code}</span>
                <span className="cw-order-status" style={{ color: st.color }}>
                    {st.icon} {st.label}
                </span>
            </div>
            {order.items && order.items.length > 0 && (
                <div className="cw-order-items">
                    {order.items.slice(0, 2).map((item, i) => (
                        <div key={i} className="cw-order-item-row">
                            🛒 {item.product_name} × {item.quantity}
                        </div>
                    ))}
                    {order.items.length > 2 && (
                        <div className="cw-order-item-more">+{order.items.length - 2} sản phẩm khác</div>
                    )}
                </div>
            )}
            <div className="cw-order-card-footer">
                <div className="cw-order-meta">
                    <span className="cw-order-total">{formatVND(order.total_amount)}</span>
                    <span className="cw-order-pay">{payLabel}</span>
                </div>
                <button className="cw-order-view-btn" onClick={() => onView(order.id)}>
                    Xem chi tiết →
                </button>
            </div>
        </div>
    );
};

// ─── Main Widget ──────────────────────────────────────────────────────────────
const ChatbotWidget: React.FC = () => {
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([
        {
            id: '0',
            role: 'bot',
            content: formatText('Xin chào! 👋 Tôi là trợ lý ảo của **SpaceLink**. Tôi có thể giúp bạn tra cứu đơn hàng, tư vấn sản phẩm và giải đáp mọi thắc mắc. Bạn cần hỗ trợ gì?'),
            time: getNow(),
        },
    ]);
    const [input, setInput] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const [hasUnread, setHasUnread] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
            setHasUnread(false);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [messages, isOpen]);

    useEffect(() => {
        if (!isOpen) {
            const t = setTimeout(() => setHasUnread(true), 4000);
            return () => clearTimeout(t);
        }
    }, [isOpen]);

    // ── Add message helpers ─────────────────────────────────────────────────
    const addBotMessage = useCallback((content: React.ReactNode) => {
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'bot',
            content,
            time: getNow(),
        }]);
        setIsTyping(false);
    }, []);

    const addUserMessage = useCallback((text: string) => {
        setMessages(prev => [...prev, {
            id: Date.now().toString(),
            role: 'user',
            content: text,
            time: getNow(),
        }]);
    }, []);

    // ── Navigate to order detail ────────────────────────────────────────────
    const handleViewOrder = useCallback((orderId: number) => {
        setIsOpen(false);
        navigate(`/orders/${orderId}`);
    }, [navigate]);

    // ── Fetch latest orders ─────────────────────────────────────────────────
    const fetchOrders = useCallback(async (specificCode?: string) => {
        setIsTyping(true);
        try {
            if (specificCode) {
                // Search by order_code in the list
                const res = await axiosInstance.get('/client/orders', { params: { per_page: 50 } });
                const orders: OrderSummary[] = res.data?.data ?? res.data ?? [];
                const found = orders.find((o: OrderSummary) =>
                    o.order_code.toLowerCase().includes(specificCode.toLowerCase())
                );
                if (found) {
                    addBotMessage(
                        <div>
                            <div className="cw-text-node">
                                {formatText(`🔍 Tìm thấy đơn hàng **#${found.order_code}**:`)}
                            </div>
                            <OrderCard order={found} onView={handleViewOrder} />
                        </div>
                    );
                } else {
                    addBotMessage(formatText(`😕 Tôi không tìm thấy đơn hàng với mã **${specificCode}**. Vui lòng kiểm tra lại mã đơn hàng.\n\nBạn có thể xem tất cả đơn hàng tại trang **Tài khoản → Đơn hàng của tôi**.`));
                }
            } else {
                // Fetch latest 3 orders
                const res = await axiosInstance.get('/client/orders', { params: { per_page: 3 } });
                const orders: OrderSummary[] = res.data?.data ?? res.data ?? [];
                if (!orders || orders.length === 0) {
                    addBotMessage(formatText('📭 Bạn chưa có đơn hàng nào. Hãy khám phá các sản phẩm của SpaceLink và đặt hàng ngay! 🛒'));
                } else {
                    addBotMessage(
                        <div>
                            <div className="cw-text-node">
                                {formatText(`📦 Đây là **${orders.length} đơn hàng gần nhất** của bạn:`)}
                            </div>
                            {orders.map((o: OrderSummary) => (
                                <OrderCard key={o.id} order={o} onView={handleViewOrder} />
                            ))}
                            <div className="cw-order-hint">
                                Bạn muốn tra cứu đơn hàng cụ thể? Hãy nhập mã đơn hàng (VD: SL-ABC123)
                            </div>
                        </div>
                    );
                }
            }
        } catch {
            addBotMessage(formatText('❌ Không thể tải thông tin đơn hàng. Vui lòng thử lại sau hoặc liên hệ hotline **1900 1234**.'));
        }
    }, [addBotMessage, handleViewOrder]);

    // ── Main message handler ────────────────────────────────────────────────
    const handleSend = useCallback((text: string) => {
        const trimmed = text.trim();
        if (!trimmed) return;

        addUserMessage(trimmed);
        setInput('');
        setIsTyping(true);

        const isOrderIntent = ORDER_INTENT_PATTERN.test(trimmed);
        const codeMatch = trimmed.match(ORDER_CODE_PATTERN);

        setTimeout(() => {
            if (isOrderIntent || codeMatch) {
                // Order lookup flow
                if (!isAuthenticated) {
                    addBotMessage(
                        <div>
                            <div className="cw-text-node">
                                {formatText('🔐 Bạn cần **đăng nhập** để tra cứu đơn hàng của mình.')}
                            </div>
                            <button
                                className="cw-login-btn"
                                onClick={() => { setIsOpen(false); navigate('/login'); }}
                            >
                                Đăng nhập ngay →
                            </button>
                        </div>
                    );
                } else {
                    if (codeMatch) {
                        // User provided a specific order code
                        fetchOrders(codeMatch[1]);
                    } else {
                        // Show recent orders
                        addBotMessage(
                            <div>
                                <div className="cw-text-node">
                                    {formatText(`👋 Xin chào **${user?.name ?? 'bạn'}**! Đang tải đơn hàng của bạn...`)}
                                </div>
                            </div>
                        );
                        fetchOrders();
                    }
                }
                return;
            }

            // FAQ
            const faq = getFaqResponse(trimmed);
            if (faq) {
                addBotMessage(formatText(faq));
            } else {
                addBotMessage(formatText(DEFAULT_RESPONSE));
            }
        }, 700 + Math.random() * 500);
    }, [isAuthenticated, user, addUserMessage, addBotMessage, fetchOrders, navigate]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSend(input);
    };

    return (
        <>
            <style>{`
                .cw-wrapper {
                    position: fixed;
                    bottom: 24px;
                    right: 24px;
                    z-index: 9999;
                    font-family: 'Inter', 'Segoe UI', sans-serif;
                }
                .cw-toggle {
                    width: 58px;
                    height: 58px;
                    border-radius: 50%;
                    background: linear-gradient(135deg, #e00429 0%, #b8001f 100%);
                    border: none;
                    cursor: pointer;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    box-shadow: 0 4px 20px rgba(224,4,41,0.45);
                    transition: transform 0.2s ease, box-shadow 0.2s ease;
                    position: relative;
                    margin-left: auto;
                }
                .cw-toggle:hover { transform: scale(1.08); box-shadow: 0 6px 28px rgba(224,4,41,0.55); }
                .cw-toggle-icon { font-size: 26px; color: #fff; line-height: 1; transition: transform 0.3s ease; }
                .cw-toggle-icon.open { transform: rotate(90deg); }
                .cw-badge {
                    position: absolute; top: -2px; right: -2px;
                    width: 18px; height: 18px; background: #ff4d4d;
                    border-radius: 50%; border: 2px solid #fff;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 10px; color: #fff; font-weight: 700;
                    animation: cw-pulse 1.5s infinite;
                }
                @keyframes cw-pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.2)} }
                .cw-chat-box {
                    position: absolute; bottom: 70px; right: 0;
                    width: 370px; height: 530px;
                    background: #fff; border-radius: 20px;
                    box-shadow: 0 20px 60px rgba(0,0,0,0.18), 0 4px 20px rgba(0,0,0,0.1);
                    display: flex; flex-direction: column; overflow: hidden;
                    transform-origin: bottom right;
                    animation: cw-pop 0.25s cubic-bezier(0.34,1.56,0.64,1) forwards;
                }
                @keyframes cw-pop {
                    from{opacity:0;transform:scale(0.85) translateY(10px)}
                    to{opacity:1;transform:scale(1) translateY(0)}
                }
                .cw-header {
                    background: linear-gradient(135deg, #e00429 0%, #b8001f 100%);
                    padding: 14px 16px; display: flex; align-items: center;
                    gap: 11px; color: #fff; flex-shrink: 0;
                }
                .cw-avatar {
                    width: 40px; height: 40px; background: rgba(255,255,255,0.2);
                    border-radius: 50%; display: flex; align-items: center;
                    justify-content: center; font-size: 20px; flex-shrink: 0;
                }
                .cw-header-info { flex: 1; }
                .cw-header-name { font-weight: 700; font-size: 15px; }
                .cw-header-status { font-size: 12px; opacity: 0.85; display: flex; align-items: center; gap: 5px; margin-top: 2px; }
                .cw-online-dot { width: 7px; height: 7px; background: #4ade80; border-radius: 50%; animation: cw-blink 2s infinite; }
                @keyframes cw-blink { 0%,100%{opacity:1} 50%{opacity:0.4} }
                .cw-close-btn {
                    background: rgba(255,255,255,0.15); border: none; color: #fff;
                    width: 28px; height: 28px; border-radius: 50%; cursor: pointer;
                    font-size: 16px; display: flex; align-items: center; justify-content: center;
                    transition: background 0.2s;
                }
                .cw-close-btn:hover { background: rgba(255,255,255,0.3); }
                .cw-messages {
                    flex: 1; overflow-y: auto; padding: 14px 12px 8px;
                    display: flex; flex-direction: column; gap: 10px;
                    background: #f8f9fc; scroll-behavior: smooth;
                }
                .cw-messages::-webkit-scrollbar { width: 4px; }
                .cw-messages::-webkit-scrollbar-thumb { background: #ddd; border-radius: 4px; }
                .cw-bubble-row { display: flex; gap: 8px; align-items: flex-end; }
                .cw-bubble-row.user { justify-content: flex-end; }
                .cw-bubble-row.bot  { justify-content: flex-start; }
                .cw-bot-icon {
                    width: 28px; height: 28px;
                    background: linear-gradient(135deg, #e00429, #b8001f);
                    border-radius: 50%; display: flex; align-items: center;
                    justify-content: center; font-size: 14px; flex-shrink: 0;
                }
                .cw-bubble {
                    max-width: 82%; padding: 9px 13px;
                    border-radius: 16px; font-size: 13.5px; line-height: 1.55;
                }
                .cw-bubble.bot {
                    background: #fff; color: #1a1a2e;
                    border-radius: 4px 16px 16px 16px;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.08);
                }
                .cw-bubble.user {
                    background: linear-gradient(135deg, #e00429, #b8001f);
                    color: #fff; border-radius: 16px 16px 4px 16px;
                }
                .cw-time { font-size: 10.5px; opacity: 0.5; margin-top: 3px; }
                .cw-bubble-col { display: flex; flex-direction: column; }
                .cw-bubble-col.user { align-items: flex-end; }
                .cw-typing {
                    display: flex; align-items: center; gap: 5px; padding: 10px 13px;
                    background: #fff; border-radius: 4px 16px 16px 16px;
                    box-shadow: 0 1px 4px rgba(0,0,0,0.08); width: fit-content;
                }
                .cw-typing span {
                    width: 7px; height: 7px; background: #ccc; border-radius: 50%;
                    display: inline-block; animation: cw-typing-anim 1.2s infinite;
                }
                .cw-typing span:nth-child(2) { animation-delay: 0.2s; }
                .cw-typing span:nth-child(3) { animation-delay: 0.4s; }
                @keyframes cw-typing-anim {
                    0%,80%,100%{transform:translateY(0);background:#ccc}
                    40%{transform:translateY(-5px);background:#e00429}
                }
                /* ── Order Card ── */
                .cw-order-card {
                    background: #fff; border: 1px solid #e8e8e8; border-radius: 12px;
                    padding: 12px; margin-top: 8px;
                    box-shadow: 0 2px 8px rgba(0,0,0,0.06);
                    transition: box-shadow 0.2s;
                }
                .cw-order-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
                .cw-order-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
                .cw-order-code { font-weight: 700; font-size: 13px; color: #1a1a2e; }
                .cw-order-status { font-size: 12px; font-weight: 600; }
                .cw-order-items { margin: 6px 0; }
                .cw-order-item-row { font-size: 12px; color: #555; padding: 2px 0; }
                .cw-order-item-more { font-size: 11px; color: #888; font-style: italic; }
                .cw-order-card-footer { display: flex; justify-content: space-between; align-items: center; margin-top: 8px; border-top: 1px solid #f0f0f0; padding-top: 8px; }
                .cw-order-meta { display: flex; flex-direction: column; gap: 2px; }
                .cw-order-total { font-weight: 700; font-size: 13.5px; color: #e00429; }
                .cw-order-pay { font-size: 11px; color: #888; }
                .cw-order-view-btn {
                    background: linear-gradient(135deg, #e00429, #b8001f);
                    color: #fff; border: none; border-radius: 8px;
                    padding: 5px 12px; font-size: 12px; font-weight: 600;
                    cursor: pointer; transition: transform 0.15s, box-shadow 0.15s;
                }
                .cw-order-view-btn:hover { transform: scale(1.04); box-shadow: 0 2px 8px rgba(224,4,41,0.35); }
                .cw-order-hint { font-size: 11.5px; color: #888; margin-top: 8px; font-style: italic; }
                .cw-text-node { margin-bottom: 4px; }
                /* ── Login button ── */
                .cw-login-btn {
                    display: block; width: 100%; margin-top: 10px;
                    background: linear-gradient(135deg, #e00429, #b8001f);
                    color: #fff; border: none; border-radius: 10px;
                    padding: 9px 16px; font-size: 13px; font-weight: 600;
                    cursor: pointer; text-align: center;
                    transition: transform 0.15s, box-shadow 0.15s;
                }
                .cw-login-btn:hover { transform: scale(1.02); box-shadow: 0 3px 10px rgba(224,4,41,0.4); }
                /* ── Quick replies ── */
                .cw-quick-replies {
                    padding: 8px 12px; display: flex; flex-wrap: wrap; gap: 6px;
                    background: #f8f9fc; border-top: 1px solid #eee; flex-shrink: 0;
                }
                .cw-quick-btn {
                    background: #fff; border: 1.5px solid #e00429; color: #e00429;
                    border-radius: 20px; padding: 5px 12px; font-size: 12px;
                    cursor: pointer; transition: all 0.2s; font-weight: 500;
                }
                .cw-quick-btn:hover { background: #e00429; color: #fff; }
                /* ── Input area ── */
                .cw-input-area {
                    padding: 10px 12px; background: #fff; border-top: 1px solid #eee;
                    display: flex; gap: 8px; align-items: center; flex-shrink: 0;
                }
                .cw-input {
                    flex: 1; border: 1.5px solid #e8e8e8; border-radius: 22px;
                    padding: 9px 15px; font-size: 13.5px; outline: none;
                    transition: border-color 0.2s; color: #1a1a2e; background: #f8f9fc;
                }
                .cw-input:focus { border-color: #e00429; background: #fff; }
                .cw-send-btn {
                    width: 38px; height: 38px;
                    background: linear-gradient(135deg, #e00429, #b8001f);
                    border: none; border-radius: 50%; color: #fff; cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    font-size: 16px; transition: transform 0.2s, box-shadow 0.2s; flex-shrink: 0;
                }
                .cw-send-btn:hover { transform: scale(1.1); box-shadow: 0 3px 10px rgba(224,4,41,0.4); }
                .cw-send-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }
                @media (max-width: 480px) {
                    .cw-chat-box { width: calc(100vw - 32px); right: 0; }
                    .cw-wrapper { bottom: 16px; right: 16px; }
                }
            `}</style>

            <div className="cw-wrapper">
                {isOpen && (
                    <div className="cw-chat-box">
                        {/* Header */}
                        <div className="cw-header">
                            <div className="cw-avatar">🤖</div>
                            <div className="cw-header-info">
                                <div className="cw-header-name">{BOT_NAME}</div>
                                <div className="cw-header-status">
                                    <span className="cw-online-dot" />
                                    Trực tuyến • Phản hồi ngay
                                    {isAuthenticated && user && (
                                        <span style={{ opacity: 0.75, marginLeft: 4 }}>
                                            | Xin chào, {user.name?.split(' ').pop()}
                                        </span>
                                    )}
                                </div>
                            </div>
                            <button className="cw-close-btn" onClick={() => setIsOpen(false)}>✕</button>
                        </div>

                        {/* Messages */}
                        <div className="cw-messages">
                            {messages.map(msg => (
                                <div key={msg.id} className={`cw-bubble-row ${msg.role}`}>
                                    {msg.role === 'bot' && <div className="cw-bot-icon">🤖</div>}
                                    <div className={`cw-bubble-col ${msg.role}`}>
                                        <div className={`cw-bubble ${msg.role}`}>
                                            {msg.content}
                                        </div>
                                        <div className="cw-time">{msg.time}</div>
                                    </div>
                                </div>
                            ))}
                            {isTyping && (
                                <div className="cw-bubble-row bot">
                                    <div className="cw-bot-icon">🤖</div>
                                    <div className="cw-typing">
                                        <span /><span /><span />
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>

                        {/* Quick Replies */}
                        <div className="cw-quick-replies">
                            {QUICK_REPLIES.map(q => (
                                <button key={q} className="cw-quick-btn" onClick={() => handleSend(q)}>
                                    {q}
                                </button>
                            ))}
                        </div>

                        {/* Input */}
                        <form className="cw-input-area" onSubmit={handleSubmit}>
                            <input
                                ref={inputRef}
                                className="cw-input"
                                type="text"
                                placeholder={isAuthenticated ? 'Nhập mã đơn hàng hoặc câu hỏi...' : 'Nhập tin nhắn...'}
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                disabled={isTyping}
                            />
                            <button className="cw-send-btn" type="submit" disabled={!input.trim() || isTyping}>
                                ➤
                            </button>
                        </form>
                    </div>
                )}

                {/* Toggle Button */}
                <button className="cw-toggle" onClick={() => setIsOpen(o => !o)} title="Chat với SpaceLink AI">
                    {hasUnread && !isOpen && <span className="cw-badge">1</span>}
                    <span className={`cw-toggle-icon ${isOpen ? 'open' : ''}`}>
                        {isOpen ? '✕' : '💬'}
                    </span>
                </button>
            </div>
        </>
    );
};

export default ChatbotWidget;

import React, { createContext, useContext, useState, useEffect, useRef, type ReactNode } from 'react';
import { axiosInstance } from '../api/axios';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';
// @ts-ignore
import { debounce } from 'lodash';

export interface CartItem {
    id: number; // mapped from cart_item_id
    productId: number;
    variantId?: number;
    name: string;
    image: string;
    price: number;
    sku?: string;
    attributes?: string; // e.g. "Đỏ / 128GB"
    quantity: number;
    stock: number;
    lineTotal: number;
    productSlug?: string;
    availableVariants?: any[]; // for switching
}

interface CartContextType {
    items: CartItem[];
    loading: boolean;
    addToCart: (variantId: number, quantity?: number) => Promise<void>;
    removeFromCart: (cartItemId: number) => Promise<void>;
    updateQty: (cartItemId: number, qty: number, variantId?: number) => Promise<void>;
    clearCart: () => Promise<void>;
    totalItems: number;
    totalPrice: number;
    refreshCart: () => Promise<void>;
    updatingItems: Set<number>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const SESSION_KEY = 'spacelink_session_id';
const CART_CACHE_KEY = 'spacelink_cart_cache';

const getOrSetSessionId = () => {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
        id = 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        localStorage.setItem(SESSION_KEY, id);
    }
    return id;
};

// Đọc giỏ hàng từ localStorage (fallback khi API chưa kịp load)
const loadCartFromCache = (): CartItem[] => {
    try {
        const raw = localStorage.getItem(CART_CACHE_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
};

// Lưu giỏ hàng vào localStorage
const saveCartToCache = (items: CartItem[]) => {
    try {
        localStorage.setItem(CART_CACHE_KEY, JSON.stringify(items));
    } catch {
        // ignore storage errors
    }
};

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    // Khởi tạo từ localStorage cache nếu có
    const [items, setItems] = useState<CartItem[]>(loadCartFromCache);
    const [loading, setLoading] = useState(false);
    const [updatingItems, setUpdatingItems] = useState<Set<number>>(new Set());
    const { isAuthenticated } = useAuth();
    // Guard chống race condition: track các variant đang trong quá trình add
    const addingRef = useRef<Set<number>>(new Set());

    // Khi items thay đổi → lưu vào localStorage
    useEffect(() => {
        saveCartToCache(items);
    }, [items]);

    // Khởi tạo session ID nếu chưa có
    useEffect(() => {
        getOrSetSessionId();
    }, []);

    const mapApiItem = (item: any): CartItem => {
        // Lấy ảnh: ưu tiên variant image, sau đó đến product images
        let img = item.variant_image;
        if (!img && item.product_images && item.product_images.length > 0) {
            const primary = item.product_images.find((i: any) => i.is_primary) || item.product_images[0];
            img = primary.image_url || `http://localhost:8000/storage/${primary.image_path}`;
        }

        // Format attributes string
        const attrs = item.variant_attrs?.map((a: any) => a.value).join(' / ') || '';

        return {
            id: item.cart_item_id,
            productId: item.product_id,
            variantId: item.variant_id,
            name: item.product_name,
            image: img || '',
            price: item.effective_price,
            sku: item.variant_sku,
            attributes: attrs,
            quantity: item.quantity,
            stock: item.stock_available,
            lineTotal: item.line_total,
            productSlug: item.product_slug,
            availableVariants: item.available_variants
        };
    };

    const refreshCart = async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.get('/client/cart');
            if (res.data.status === 'success') {
                const mapped = res.data.data.map(mapApiItem);
                setItems(mapped);
            }
        } catch (error) {
            console.error('Failed to fetch cart:', error);
        } finally {
            setLoading(false);
        }
    };

    // Tải lại giỏ hàng khi mount hoặc khi auth thay đổi
    useEffect(() => {
        refreshCart();
    }, [isAuthenticated]);

    const addToCart = async (variantId: number, quantity: number = 1) => {
        // Chặn thêm vào giỏ khi đang có đơn VNPAY chờ thanh toán
        const pendingId = sessionStorage.getItem('vnpay_pending_order_id');
        if (pendingId) {
            toast.warning(
                '⚠️ Bạn đang có đơn hàng chờ thanh toán VNPAY. Vui lòng thanh toán hoặc hủy đơn đó trước khi thêm sản phẩm mới.',
                { autoClose: 4000 }
            );
            return;
        }
        // Chống race condition: nếu đang gọi API cho variantId này thì bỏ qua
        if (addingRef.current.has(variantId)) return;
        addingRef.current.add(variantId);
        setLoading(true);
        try {
            const res = await axiosInstance.post('/client/cart/add', {
                variant_id: variantId,
                quantity: quantity
            });
            if (res.data.status === 'success') {
                await refreshCart();
                toast.success('Đã thêm sản phẩm vào giỏ hàng!');
            }
        } catch (error: any) {
            console.error('Failed to add to cart:', error);
            const msg: string = error.response?.data?.message || '';
            const status = error.response?.status;

            // Backend báo có pending VNPAY order → sync lại sessionStorage từ API
            if (status === 422 && msg.toLowerCase().includes('vnpay')) {
                toast.warning('⚠️ ' + msg, { autoClose: 5000 });
                // Tự động tìm pending VNPAY order và cập nhật sessionStorage
                try {
                    const res = await axiosInstance.get('/client/orders');
                    const orders: any[] = res.data?.data?.data ?? res.data?.data ?? [];
                    const pending = orders.find((o: any) =>
                        o.status === 'pending' &&
                        o.payment_method === 'vnpay' &&
                        o.payment_status === 'unpaid'
                    );
                    if (pending) {
                        sessionStorage.setItem('vnpay_pending_order_id', String(pending.id));
                    } else {
                        sessionStorage.removeItem('vnpay_pending_order_id');
                    }
                } catch {
                    // ignore
                }
            } else {
                toast.error(msg || 'Không thể thêm vào giỏ hàng');
            }
        } finally {
            addingRef.current.delete(variantId);
            setLoading(false);
        }
    };

    const removeFromCart = async (cartItemId: number) => {
        setLoading(true);
        try {
            const res = await axiosInstance.delete(`/client/cart/remove/${cartItemId}`);
            if (res.data.status === 'success') {
                setItems(prev => {
                    const next = prev.filter(i => i.id !== cartItemId);
                    saveCartToCache(next);
                    return next;
                });
                toast.info('Đã xóa sản phẩm khỏi giỏ hàng');
            }
        } catch (error: any) {
            console.error('Failed to remove from cart:', error);
            const status = error.response?.status;
            // 404: item đã bị xóa từ backend (ví dụ: cancel đơn hàng đã xóa item)
            // → Vẫn xóa khỏi local state mà không hiện lỗi, rồi refresh để đồng bộ
            if (status === 404) {
                setItems(prev => {
                    const next = prev.filter(i => i.id !== cartItemId);
                    saveCartToCache(next);
                    return next;
                });
                await refreshCart();
            } else {
                const msg = error.response?.data?.message || 'Không thể xóa sản phẩm';
                toast.error(msg);
            }
        } finally {
            setLoading(false);
        }
    };

    const updateQty = async (cartItemId: number, qty: number, variantId?: number) => {
        // Chặn thay đổi khi đang có đơn VNPAY chờ thanh toán
        const pendingId = sessionStorage.getItem('vnpay_pending_order_id');
        if (pendingId) {
            toast.warning('⚠️ Vui lòng xử lý đơn hàng VNPAY đang chờ trước khi thay đổi giỏ hàng.', { autoClose: 3000 });
            return;
        }

        if (qty <= 0) {
            await removeFromCart(cartItemId);
            return;
        }

        const originalItems = [...items];
        const itemToUpdate = originalItems.find(i => i.id === cartItemId);
        if (!itemToUpdate) return;

        const isVariantChange = variantId !== undefined && variantId !== itemToUpdate.variantId;

        // Optimistic UI update
        setItems(prev => prev.map(item => {
            if (item.id === cartItemId) {
                return {
                    ...item,
                    quantity: qty,
                    lineTotal: item.price * qty, // Optimistic line total
                    variantId: variantId ?? item.variantId
                };
            }
            return item;
        }));

        const performUpdate = async (cid: number, q: number, vid?: number) => {
            setUpdatingItems(prev => new Set(prev).add(cid));
            try {
                const res = await axiosInstance.put(`/client/cart/update/${cid}`, {
                    quantity: q,
                    variant_id: vid
                });
                if (res.data.status === 'success') {
                    await refreshCart();
                }
            } catch (error: any) {
                console.error('Failed to update quantity:', error);
                toast.error(error.response?.data?.message || 'Không thể cập nhật số lượng');
                setItems(originalItems);
            } finally {
                setUpdatingItems(prev => {
                    const next = new Set(prev);
                    next.delete(cid);
                    return next;
                });
            }
        };

        if (isVariantChange) {
            await performUpdate(cartItemId, qty, variantId);
        } else {
            if (!(window as any)._debouncedCartUpdates) (window as any)._debouncedCartUpdates = {};
            if (!(window as any)._debouncedCartUpdates[cartItemId]) {
                (window as any)._debouncedCartUpdates[cartItemId] = debounce(
                    async (cid: number, q: number, vid?: number) => {
                        await performUpdate(cid, q, vid);
                    },
                    500
                );
            }
            (window as any)._debouncedCartUpdates[cartItemId](cartItemId, qty, variantId);
        }
    };

    const clearCart = async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.delete('/client/cart/clear');
            if (res.data.status === 'success') {
                setItems([]);
                localStorage.removeItem(CART_CACHE_KEY);
            }
        } catch (error) {
            console.error('Failed to clear cart:', error);
        } finally {
            setLoading(false);
        }
    };

    const totalItems = items.reduce((s, i) => s + i.quantity, 0);
    const totalPrice = items.reduce((s, i) => s + i.lineTotal, 0);

    return (
        <CartContext.Provider value={{
            items,
            loading,
            addToCart,
            removeFromCart,
            updateQty,
            clearCart,
            totalItems,
            totalPrice,
            refreshCart,
            updatingItems
        }}>
            {children}
        </CartContext.Provider>
    );
};

export const useCart = () => {
    const ctx = useContext(CartContext);
    if (!ctx) throw new Error('useCart must be used within CartProvider');
    return ctx;
};

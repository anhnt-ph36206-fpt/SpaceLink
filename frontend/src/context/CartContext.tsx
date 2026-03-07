import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { axiosInstance } from '../api/axios';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';

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
}

interface CartContextType {
    items: CartItem[];
    loading: boolean;
    addToCart: (variantId: number, quantity?: number) => Promise<void>;
    removeFromCart: (cartItemId: number) => Promise<void>;
    updateQty: (cartItemId: number, qty: number) => Promise<void>;
    clearCart: () => Promise<void>;
    totalItems: number;
    totalPrice: number;
    refreshCart: () => Promise<void>;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const SESSION_KEY = 'spacelink_session_id';

const getOrSetSessionId = () => {
    let id = localStorage.getItem(SESSION_KEY);
    if (!id) {
        id = 'sess_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
        localStorage.setItem(SESSION_KEY, id);
    }
    return id;
};

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [items, setItems] = useState<CartItem[]>([]);
    const [loading, setLoading] = useState(false);
    const { isAuthenticated } = useAuth();

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
            lineTotal: item.line_total
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
            toast.error(error.response?.data?.message || 'Không thể thêm vào giỏ hàng');
        } finally {
            setLoading(false);
        }
    };

    const removeFromCart = async (cartItemId: number) => {
        setLoading(true);
        try {
            const res = await axiosInstance.delete(`/client/cart/remove/${cartItemId}`);
            if (res.data.status === 'success') {
                setItems(prev => prev.filter(i => i.id !== cartItemId));
                toast.info('Đã xóa sản phẩm khỏi giỏ hàng');
            }
        } catch (error) {
            console.error('Failed to remove from cart:', error);
            toast.error('Không thể xóa sản phẩm');
        } finally {
            setLoading(false);
        }
    };

    const updateQty = async (cartItemId: number, qty: number) => {
        if (qty <= 0) {
            await removeFromCart(cartItemId);
            return;
        }
        setLoading(true);
        try {
            const res = await axiosInstance.put(`/client/cart/update/${cartItemId}`, {
                quantity: qty
            });
            if (res.data.status === 'success') {
                await refreshCart();
            }
        } catch (error: any) {
            console.error('Failed to update quantity:', error);
            toast.error(error.response?.data?.message || 'Không thể cập nhật số lượng');
        } finally {
            setLoading(false);
        }
    };

    const clearCart = async () => {
        setLoading(true);
        try {
            const res = await axiosInstance.delete('/client/cart/clear');
            if (res.data.status === 'success') {
                setItems([]);
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
            refreshCart
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

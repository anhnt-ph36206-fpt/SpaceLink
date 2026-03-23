import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { wishlistApi, type WishlistItem } from '../api/apiWishlist';
import { useAuth } from './AuthContext';
import { toast } from 'react-toastify';

interface WishlistContextType {
    items: WishlistItem[];
    loading: boolean;
    totalItems: number;
    addToWishlist: (productId: number | string) => Promise<boolean>;
    removeFromWishlist: (productId: number | string) => Promise<boolean>;
    isInWishlist: (productId: number | string) => boolean;
    refreshWishlist: () => Promise<void>;
    updatingItems: Set<string | number>;
}

const WishlistContext = createContext<WishlistContextType | undefined>(undefined);

export const WishlistProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [items, setItems] = useState<WishlistItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [updatingItems, setUpdatingItems] = useState<Set<string | number>>(new Set());
    const { isAuthenticated } = useAuth();

    const refreshWishlist = async () => {
        if (!isAuthenticated) {
            setItems([]);
            return;
        }
        setLoading(true);
        try {
            const res = await wishlistApi.getWishlist();
            if (res.status === 'success') {
                setItems(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch wishlist:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        refreshWishlist();
    }, [isAuthenticated]);

    const addToWishlist = async (productId: number | string) => {
        if (!isAuthenticated) {
            toast.warning('Vui lòng đăng nhập để thêm vào danh sách yêu thích!');
            return false;
        }
        
        setUpdatingItems(prev => new Set(prev).add(productId));
        try {
            const res = await wishlistApi.addToWishlist(productId);
            if (res.status === 'success') {
                await refreshWishlist();
                return true;
            }
            return false;
        } catch (error: any) {
            console.error('Failed to add to wishlist:', error);
            toast.error(error.response?.data?.message || 'Không thể thêm vào danh sách yêu thích');
            return false;
        } finally {
            setUpdatingItems(prev => {
                const copy = new Set(prev);
                copy.delete(productId);
                return copy;
            });
        }
    };

    const removeFromWishlist = async (productId: number | string) => {
        if (!isAuthenticated) return false;
        
        setUpdatingItems(prev => new Set(prev).add(productId));
        try {
            const res = await wishlistApi.removeFromWishlist(productId);
            if (res.status === 'success') {
                // Optimistic UI update
                setItems(prev => prev.filter(item => String(item.product_id) !== String(productId)));
                return true;
            }
            return false;
        } catch (error: any) {
            console.error('Failed to remove from wishlist:', error);
            const msg = error.response?.data?.message || 'Không thể xóa sản phẩm';
            toast.error(msg);
            return false;
        } finally {
            setUpdatingItems(prev => {
                const copy = new Set(prev);
                copy.delete(productId);
                return copy;
            });
        }
    };

    const isInWishlist = (productId: number | string) => {
        return items.some(item => String(item.product_id) === String(productId));
    };

    const totalItems = items.length;

    return (
        <WishlistContext.Provider value={{
            items,
            loading,
            totalItems,
            addToWishlist,
            removeFromWishlist,
            isInWishlist,
            refreshWishlist,
            updatingItems
        }}>
            {children}
        </WishlistContext.Provider>
    );
};

export const useWishlist = () => {
    const ctx = useContext(WishlistContext);
    if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
    return ctx;
};

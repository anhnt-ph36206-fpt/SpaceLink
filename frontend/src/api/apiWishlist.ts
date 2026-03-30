import { axiosInstance } from './axios';

export interface WishlistItem {
    id: number;
    user_id: number;
    product_id: number;
    created_at: string;
    product: {
        id: number;
        name: string;
        price: number;
        sale_price?: number;
        image?: string;
        category?: { id: number; name: string };
        brand?: { id: number; name: string };
        images?: any[];
        is_featured?: boolean;
        is_active?: boolean;
    };
}

export const wishlistApi = {
    // Lấy danh sách yêu thích
    getWishlist: async () => {
        const response = await axiosInstance.get('/client/wishlist');
        return response.data;
    },

    // Thêm sản phẩm vào yêu thích
    addToWishlist: async (productId: number | string) => {
        const response = await axiosInstance.post('/client/wishlist', {
            product_id: productId
        });
        return response.data;
    },

    // Xóa sản phẩm khỏi yêu thích
    removeFromWishlist: async (productId: number | string) => {
        const response = await axiosInstance.delete(`/client/wishlist/${productId}`);
        return response.data;
    }
};

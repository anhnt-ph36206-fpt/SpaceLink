// Product Type
export interface Product {
    id: string;
    name: string;
    category: string;
    image: string;
    price: number;
    oldPrice?: number;
    rating: number;
    isNew?: boolean;
    isSale?: boolean;
    description?: string;
}

// Category Type
export interface Category {
    id: string;
    name: string;
    count: number;
}

// Cart Item Type
export interface CartItem {
    product: Product;
    quantity: number;
}

// Service Item Type
export interface ServiceItem {
    icon: string;
    title: string;
    description: string;
}

// Order Item Type
export interface OrderItem {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    image?: string;
}

// Order Type
export interface Order {
    id: string;
    userId: string;
    customerName: string;
    customerEmail: string;
    customerPhone?: string;
    address?: string;
    items: OrderItem[];
    totalAmount: number;
    status: 'pending' | 'confirmed' | 'shipping' | 'delivered' | 'cancelled';
    paymentMethod?: string;
    note?: string;
    createdAt: string;
    updatedAt?: string;
}

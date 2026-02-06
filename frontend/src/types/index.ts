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

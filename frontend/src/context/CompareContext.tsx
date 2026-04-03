import React, { createContext, useContext, useState, type ReactNode } from 'react';

export interface CompareProduct {
    id: string;
    name: string;
    image: string;
    price: number;
    oldPrice?: number;
    category?: string;
    categoryId?: number;
    rating?: number;
    isSale?: boolean;
    isNew?: boolean;
}

interface CompareContextType {
    compareList: CompareProduct[];
    addToCompare: (product: CompareProduct) => boolean; // returns false if limit exceeded
    removeFromCompare: (id: string) => void;
    clearCompare: () => void;
    isInCompare: (id: string) => boolean;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

const MAX_COMPARE = 4;

export const CompareProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [compareList, setCompareList] = useState<CompareProduct[]>([]);

    const addToCompare = (product: CompareProduct): boolean => {
        if (compareList.length >= MAX_COMPARE) return false;
        if (compareList.some(p => p.id === product.id)) return true;
        setCompareList(prev => [...prev, product]);
        return true;
    };

    const removeFromCompare = (id: string) => {
        setCompareList(prev => prev.filter(p => p.id !== id));
    };

    const clearCompare = () => setCompareList([]);

    const isInCompare = (id: string) => compareList.some(p => p.id === id);

    return (
        <CompareContext.Provider value={{ compareList, addToCompare, removeFromCompare, clearCompare, isInCompare }}>
            {children}
        </CompareContext.Provider>
    );
};

export const useCompare = (): CompareContextType => {
    const ctx = useContext(CompareContext);
    if (!ctx) throw new Error('useCompare must be used within CompareProvider');
    return ctx;
};

import { useState, useEffect, useCallback, useRef } from 'react';
import { axiosInstance } from '../api/axios';

export interface AdminNotif {
    id: number;
    type: 'new_order' | 'order_cancelled' | 'cancel_request' | 'return_request' | 'complaint';
    title: string;
    body: string;
    order_id: number | null;
    is_read: boolean;
    created_at: string;
}

const POLL_INTERVAL = 30_000; // 30 giây

export function useAdminNotifications() {
    const [notifications, setNotifications] = useState<AdminNotif[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchNotifications = useCallback(async () => {
        try {
            setLoading(true);
            const res = await axiosInstance.get('/admin/notifications?limit=20');
            setNotifications(res.data.data ?? []);
            setUnreadCount(res.data.unread_count ?? 0);
        } catch {
            // Silently fail — không interrupt UI
        } finally {
            setLoading(false);
        }
    }, []);

    const markAllRead = useCallback(async () => {
        try {
            await axiosInstance.patch('/admin/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch { /* */ }
    }, []);

    const markRead = useCallback(async (id: number) => {
        try {
            await axiosInstance.patch(`/admin/notifications/${id}/read`);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch { /* */ }
    }, []);

    useEffect(() => {
        fetchNotifications();
        timerRef.current = setInterval(fetchNotifications, POLL_INTERVAL);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [fetchNotifications]);

    return { notifications, unreadCount, loading, fetchNotifications, markAllRead, markRead };
}

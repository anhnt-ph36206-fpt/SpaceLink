import { useState, useEffect, useCallback, useRef } from 'react';
import { axiosInstance } from '../api/axios';

export interface UserNotif {
    id: number;
    type: string;
    title: string;
    content: string;
    order_id: number | null;
    is_read: boolean;
    created_at: string;
}

const POLL_INTERVAL = 30_000; // 30 giây

export function useUserNotifications(enabled: boolean = true) {
    const [notifications, setNotifications] = useState<UserNotif[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const fetchNotifications = useCallback(async () => {
        if (!enabled) return;
        try {
            setLoading(true);
            const res = await axiosInstance.get('/client/notifications?limit=20');
            setNotifications(res.data.data ?? []);
            setUnreadCount(res.data.unread_count ?? 0);
        } catch {
            // Silently fail — không interrupt UI
        } finally {
            setLoading(false);
        }
    }, [enabled]);

    const markAllRead = useCallback(async () => {
        try {
            await axiosInstance.patch('/client/notifications/read-all');
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
            setUnreadCount(0);
        } catch { /* */ }
    }, []);

    const markRead = useCallback(async (id: number) => {
        try {
            await axiosInstance.patch(`/client/notifications/${id}/read`);
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, is_read: true } : n)
            );
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch { /* */ }
    }, []);

    useEffect(() => {
        if (!enabled) return;
        fetchNotifications();
        timerRef.current = setInterval(fetchNotifications, POLL_INTERVAL);
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [enabled, fetchNotifications]);

    return { notifications, unreadCount, loading, fetchNotifications, markAllRead, markRead };
}

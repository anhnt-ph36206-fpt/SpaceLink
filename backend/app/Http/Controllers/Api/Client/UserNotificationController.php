<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\UserNotification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UserNotificationController extends Controller
{
    /**
     * GET /api/client/notifications?limit=20
     * Lấy danh sách thông báo của user hiện tại.
     */
    public function index(Request $request): JsonResponse
    {
        $user  = $request->user();
        $limit = (int) $request->input('limit', 20);

        $notifications = UserNotification::where('user_id', $user->id)
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();

        $unreadCount = UserNotification::where('user_id', $user->id)
            ->where('is_read', false)
            ->count();

        return response()->json([
            'status'       => 'success',
            'data'         => $notifications,
            'unread_count' => $unreadCount,
        ]);
    }

    /**
     * PATCH /api/client/notifications/read-all
     * Đánh dấu tất cả thông báo là đã đọc.
     */
    public function readAll(Request $request): JsonResponse
    {
        $user = $request->user();

        UserNotification::where('user_id', $user->id)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Đã đánh dấu tất cả thông báo đã đọc.',
        ]);
    }

    /**
     * PATCH /api/client/notifications/{id}/read
     * Đánh dấu 1 thông báo là đã đọc.
     */
    public function read(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        $notification = UserNotification::where('id', $id)
            ->where('user_id', $user->id)
            ->firstOrFail();

        $notification->update(['is_read' => true]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Đã đánh dấu đã đọc.',
        ]);
    }
}

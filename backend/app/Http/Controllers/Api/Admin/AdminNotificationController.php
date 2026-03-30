<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\AdminNotification;
use App\Models\Order;
use App\Models\OrderCancelRequest;
use App\Models\OrderStatusHistory;
use App\Models\Voucher;
use App\Models\VoucherUsage;
use App\Models\Product;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AdminNotificationController extends Controller
{
    // =========================================================================
    // GET /api/admin/notifications
    // =========================================================================
    public function index(Request $request): JsonResponse
    {
        $limit = min((int) $request->input('limit', 20), 50);

        $notifications = AdminNotification::latest()
            ->limit($limit)
            ->get();

        $unreadCount = AdminNotification::where('is_read', false)->count();

        return response()->json([
            'status'       => 'success',
            'unread_count' => $unreadCount,
            'data'         => $notifications,
        ]);
    }

    // =========================================================================
    // PATCH /api/admin/notifications/read-all
    // =========================================================================
    public function readAll(): JsonResponse
    {
        AdminNotification::where('is_read', false)->update(['is_read' => true]);

        return response()->json(['status' => 'success', 'message' => 'Đã đánh dấu tất cả là đã đọc.']);
    }

    // =========================================================================
    // PATCH /api/admin/notifications/{id}/read
    // =========================================================================
    public function markRead(string $id): JsonResponse
    {
        $notification = AdminNotification::findOrFail($id);
        $notification->update(['is_read' => true]);

        return response()->json(['status' => 'success']);
    }

    // =========================================================================
    // GET /api/admin/orders/{id}/cancel-requests — Xem cancel requests của đơn
    // =========================================================================
    public function cancelRequests(string $orderId): JsonResponse
    {
        $requests = OrderCancelRequest::with(['user:id,fullname,email,phone'])
            ->where('order_id', $orderId)
            ->latest()
            ->get();

        return response()->json(['status' => 'success', 'data' => $requests]);
    }

    // =========================================================================
    // POST /api/admin/orders/{id}/cancel-requests/{reqId}/approve
    // Admin duyệt: huỷ đơn + record transaction code
    // =========================================================================
    public function approveCancelRequest(Request $request, string $orderId, string $reqId): JsonResponse
    {
        $admin       = $request->user();
        $order       = Order::with('items.variant')->findOrFail($orderId);
        $cancelReq   = OrderCancelRequest::where('order_id', $orderId)->findOrFail($reqId);

        if ($cancelReq->status !== 'pending') {
            return response()->json(['status' => 'error', 'message' => 'Yêu cầu không ở trạng thái pending.'], 422);
        }

        $request->validate([
            'transaction_code' => 'nullable|string|max:100',
            'admin_note'       => 'nullable|string|max:500',
        ]);

        DB::transaction(function () use ($order, $cancelReq, $admin, $request) {
            // 1. Cập nhật cancel request
            $cancelReq->update([
                'status'           => 'approved',
                'transaction_code' => $request->transaction_code,
                'admin_note'       => $request->admin_note,
                'processed_by'     => $admin->id,
                'processed_at'     => now(),
            ]);

            // 2. Hủy đơn, hoàn kho
            $order->update([
                'status'           => 'cancelled',
                'payment_status'   => 'refunded',
                'cancelled_reason' => 'Admin duyệt yêu cầu hủy sau thanh toán VNPAY.',
                'cancelled_by'     => $admin->id,
                'cancelled_at'     => now(),
            ]);

            foreach ($order->items as $item) {
                if ($item->variant_id && $item->variant) {
                    $item->variant->increment('quantity', $item->quantity);
                }
                Product::where('id', $item->product_id)->increment('quantity', $item->quantity);
            }

            // 3. KHÔNG hoàn voucher (đơn đã paid = đã dùng dịch vụ)
            // Ghi lịch sử
            OrderStatusHistory::create([
                'order_id'    => $order->id,
                'from_status' => 'pending',
                'to_status'   => 'cancelled',
                'note'        => 'Admin duyệt yêu cầu hủy. Mã GD hoàn tiền: ' . ($request->transaction_code ?? '—'),
                'changed_by'  => $admin->id,
            ]);
        });

        return response()->json([
            'status'  => 'success',
            'message' => 'Đã duyệt yêu cầu hủy. Đơn hàng đã được hủy và tồn kho đã hoàn lại.',
        ]);
    }

    // =========================================================================
    // POST /api/admin/orders/{id}/cancel-requests/{reqId}/reject
    // Admin từ chối yêu cầu hủy
    // =========================================================================
    public function rejectCancelRequest(Request $request, string $orderId, string $reqId): JsonResponse
    {
        $admin     = $request->user();
        $cancelReq = OrderCancelRequest::where('order_id', $orderId)->findOrFail($reqId);

        if ($cancelReq->status !== 'pending') {
            return response()->json(['status' => 'error', 'message' => 'Yêu cầu không ở trạng thái pending.'], 422);
        }

        $request->validate(['admin_note' => 'required|string|max:500']);

        $cancelReq->update([
            'status'       => 'rejected',
            'admin_note'   => $request->admin_note,
            'processed_by' => $admin->id,
            'processed_at' => now(),
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Đã từ chối yêu cầu hủy đơn.',
        ]);
    }
}

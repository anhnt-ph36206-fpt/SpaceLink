<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\AdminNotification;
use App\Models\Order;
use App\Models\OrderCancelRequest;
use App\Models\OrderStatusHistory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderCancelRequestController extends Controller
{
    // =========================================================================
    // POST /api/client/orders/{id}/cancel-request
    // Dùng khi đơn VNPAY đã thanh toán (payment_status=paid) muốn hủy
    // =========================================================================
    public function store(Request $request, string $id): JsonResponse
    {
        $user  = $request->user();
        $order = Order::findOrFail($id);

        // Kiểm tra quyền sở hữu
        if ($order->user_id !== $user->id) {
            return response()->json(['status' => 'error', 'message' => 'Bạn không có quyền thực hiện thao tác này.'], 403);
        }

        // Chỉ áp dụng cho đơn VNPAY đã thanh toán + đang pending
        if ($order->payment_method !== 'vnpay' || $order->payment_status !== 'paid') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Chỉ có thể gửi yêu cầu hủy cho đơn VNPAY đã thanh toán. Với đơn COD hoặc chưa thanh toán, hãy dùng chức năng Hủy đơn trực tiếp.',
            ], 422);
        }

        // Cho phép: đơn VNPAY paid + (pending/confirmed) HOẶC (cancelled vì hết hàng)
        $isStockCancelled = $order->status === 'cancelled'
            && $order->cancelled_reason === 'out_of_stock_after_payment';

        if (! $isStockCancelled && ! in_array($order->status, ['pending', 'confirmed'], true)) {
            return response()->json([
                'status'  => 'error',
                'message' => "Không thể yêu cầu hủy đơn đang ở trạng thái \"{$order->status}\".",
            ], 422);
        }

        // Kiểm tra đã có yêu cầu đang pending chưa
        $existing = OrderCancelRequest::where('order_id', $order->id)
            ->where('status', 'pending')->first();

        if ($existing) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Bạn đã gửi yêu cầu hủy đơn này rồi. Vui lòng chờ admin xử lý.',
            ], 422);
        }

        $request->validate([
            'reason'               => 'required|string|max:1000',
            'refund_bank'          => 'nullable|string|max:100',
            'refund_account_name'  => 'nullable|string|max:255',
            'refund_account_number'=> 'nullable|string|max:50',
        ]);

        DB::transaction(function () use ($order, $user, $request, $isStockCancelled) {
            OrderCancelRequest::create([
                'order_id'              => $order->id,
                'user_id'               => $user->id,
                'reason'                => $request->reason,
                'refund_bank'           => $request->refund_bank,
                'refund_account_name'   => $request->refund_account_name,
                'refund_account_number' => $request->refund_account_number,
                'status'                => 'pending',
            ]);

            $note = $isStockCancelled
                ? 'Khách gửi thông tin ngân hàng hoàn tiền (đơn hủy vì hết hàng): ' . $request->reason
                : 'Khách hàng gửi yêu cầu hủy đơn đã thanh toán VNPAY: ' . $request->reason;

            OrderStatusHistory::create([
                'order_id'    => $order->id,
                'from_status' => $order->status,
                'to_status'   => $order->status,
                'note'        => $note,
                'changed_by'  => $user->id,
            ]);

            // Push admin notification
            AdminNotification::notify(
                'cancel_request',
                '⚠️ Yêu cầu hủy đơn đã thanh toán',
                "Đơn #{$order->order_code} — {$user->fullname}: {$request->reason}",
                $order->id
            );
        });

        return response()->json([
            'status'  => 'success',
            'message' => 'Yêu cầu hủy đơn đã được gửi. Chúng tôi sẽ xử lý và hoàn tiền trong 3–5 ngày làm việc.',
        ]);
    }

    // =========================================================================
    // GET /api/client/orders/{id}/cancel-request
    // Lấy trạng thái yêu cầu hủy hiện tại
    // =========================================================================
    public function show(Request $request, string $id): JsonResponse
    {
        $user  = $request->user();
        $order = Order::findOrFail($id);

        if ($order->user_id !== $user->id) {
            return response()->json(['status' => 'error', 'message' => 'Không có quyền truy cập.'], 403);
        }

        $cancelRequest = OrderCancelRequest::where('order_id', $order->id)
            ->latest()->first();

        return response()->json([
            'status' => 'success',
            'data'   => $cancelRequest,
        ]);
    }
}

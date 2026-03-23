<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderComplaint;
use Illuminate\Http\Request;

class ComplaintController extends Controller
{
    // GET /api/client/orders/{id}/complaint — Xem khiếu nại của đơn
    public function show(Request $request, string $id)
    {
        $user = $request->user();
        $order = Order::findOrFail($id);

        if ($order->user_id !== $user->id) {
            return response()->json(['status' => 'error', 'message' => 'Bạn không có quyền truy cập đơn hàng này.'], 403);
        }

        $complaint = OrderComplaint::where('order_id', $order->id)
            ->where('user_id', $user->id)
            ->latest()
            ->first();

        return response()->json([
            'status' => 'success',
            'data'   => $complaint,
        ]);
    }

    // POST /api/client/orders/{id}/complaint — Tạo/cập nhật khiếu nại
    public function store(Request $request, string $id)
    {
        $user = $request->user();
        $order = Order::findOrFail($id);

        if ($order->user_id !== $user->id) {
            return response()->json(['status' => 'error', 'message' => 'Bạn không có quyền thực hiện thao tác này.'], 403);
        }

        // Không cho phép khiếu nại đơn pending chưa xác nhận (chưa có vấn đề)
        if ($order->status === 'pending') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Đơn hàng đang chờ xác nhận, chưa thể khiếu nại.',
            ], 422);
        }

        $request->validate([
            'type'    => 'required|in:wrong_item,damaged,late_delivery,payment_issue,other',
            'subject' => 'required|string|max:255',
            'content' => 'required|string|max:2000',
        ]);

        // Kiểm tra đã có khiếu nại đang pending chưa
        $existing = OrderComplaint::where('order_id', $order->id)
            ->where('user_id', $user->id)
            ->whereIn('status', ['pending', 'processing'])
            ->first();

        if ($existing) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Bạn đã có một khiếu nại đang được xử lý cho đơn hàng này. Vui lòng chờ phản hồi.',
            ], 422);
        }

        $complaint = OrderComplaint::create([
            'order_id' => $order->id,
            'user_id'  => $user->id,
            'type'     => $request->type,
            'subject'  => $request->subject,
            'content'  => $request->content,
            'status'   => 'pending',
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Đã gửi khiếu nại thành công. Chúng tôi sẽ phản hồi trong thời gian sớm nhất.',
            'data'    => $complaint,
        ], 201);
    }
}

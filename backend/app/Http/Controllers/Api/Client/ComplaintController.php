<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\AdminNotification;
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

        // Chỉ cho phép khiếu nại đối với đơn hàng đã giao (delivered) hoặc đã hoàn thành (completed)
        if (!in_array($order->status, ['delivered', 'completed'])) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Chỉ có thể khiếu nại khi đơn hàng đã được giao hoặc hoàn thành.',
            ], 422);
        }

        $request->validate([
            'type'    => 'required|in:wrong_item,damaged,late_delivery,payment_issue,other',
            'subject' => 'required|string|max:255',
            'content' => 'required|string|max:2000',
            'images.*' => 'image|mimes:jpeg,png,jpg,webp|max:5120',
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

        $imagePaths = [];
        if ($request->hasFile('images')) {
            foreach ($request->file('images') as $file) {
                $path = $file->store('complaints/evidences', 'public');
                $imagePaths[] = env('APP_URL') . '/storage/' . $path;
            }
        }

        $complaint = OrderComplaint::create([
            'order_id' => $order->id,
            'user_id'  => $user->id,
            'type'     => $request->input('type'),
            'subject'  => $request->input('subject'),
            'content'  => $request->input('content'),
            'images'   => count($imagePaths) > 0 ? $imagePaths : null,
            'status'   => 'pending',
        ]);

        AdminNotification::notify(
            'complaint',
            '💬 Khiếu nại mới',
            "#{$order->order_code} — {$user->fullname}: " . $request->input('subject'),
            $order->id
        );

        return response()->json([
            'status'  => 'success',
            'message' => 'Đã gửi khiếu nại thành công. Chúng tôi sẽ phản hồi trong thời gian sớm nhất.',
            'data'    => $complaint,
        ], 201);
    }
}

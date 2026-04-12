<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\OrderComplaint;
use App\Models\UserNotification;
use Illuminate\Http\Request;

class ComplaintController extends Controller
{
    // Lấy danh sách khiếu nại (có filter theo status)
    public function index(Request $request)
    {
        $query = OrderComplaint::with(['order', 'user'])->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        $complaints = $query->paginate($request->get('per_page', 10));

        return response()->json([
            'status' => 'success',
            'data'   => $complaints,
        ]);
    }

    // Chi tiết khiếu nại
    public function show(string $id)
    {
        $complaint = OrderComplaint::with(['order.items', 'user'])->findOrFail($id);

        return response()->json([
            'status' => 'success',
            'data'   => $complaint,
        ]);
    }

    // Admin xử lý khiếu nại (cập nhật status và viết câu trả lời)
    public function update(Request $request, string $id)
    {
        $request->validate([
            'status'      => 'required|in:pending,processing,resolved,rejected',
            'admin_reply' => 'nullable|string|max:2000',
        ]);

        $complaint = OrderComplaint::findOrFail($id);
        
        $oldStatus = $complaint->status;
        $newStatus = $request->status;

        $complaint->update([
            'status'      => $newStatus,
            'admin_reply' => $request->admin_reply,
        ]);

        // Nếu chuyển từ trạng thái khác sang resolved hoặc rejected -> gửi thông báo cho khách
        if ($oldStatus !== $newStatus && in_array($newStatus, ['resolved', 'rejected'])) {
             $statusText = $newStatus === 'resolved' ? 'đã được giải quyết' : 'bị từ chối';
             $title = $newStatus === 'resolved' ? '✅ Khiếu nại đã giải quyết' : '❌ Khiếu nại bị từ chối';
             
             UserNotification::notify(
                 $complaint->user_id,
                 'complaint_resolved',
                 $title,
                 "Khiếu nại về đơn hàng #{$complaint->order->order_code} của bạn {$statusText}. Vui lòng xem phản hồi.",
                 $complaint->order_id
             );
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Đã cập nhật khiếu nại thành công.',
            'data'    => $complaint->fresh(['order', 'user']),
        ]);
    }
}

<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\OrderStatusHistory;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

class OrderController extends Controller
{
    // =========================================================================
    // GET /api/client/orders — Danh sách đơn hàng của user hiện tại
    // =========================================================================
    #[OA\Get(
        path: '/api/client/orders',
        summary: 'Danh sách đơn hàng của user',
        tags: ['Client - Orders'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'status',         in: 'query', required: false, schema: new OA\Schema(type: 'string'),  description: 'Lọc theo trạng thái: pending, confirmed, shipping, delivered, completed, cancelled'),
            new OA\Parameter(name: 'payment_status', in: 'query', required: false, schema: new OA\Schema(type: 'string'),  description: 'Lọc theo thanh toán: unpaid, paid, refunded'),
            new OA\Parameter(name: 'per_page',       in: 'query', required: false, schema: new OA\Schema(type: 'integer'), description: 'Số bản ghi/trang (mặc định 10)'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Thành công'),
            new OA\Response(response: 401, description: 'Chưa xác thực'),
        ]
    )]
    public function index(Request $request)
    {
        $user  = $request->user();
        $query = Order::where('user_id', $user->id)->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }

        $perPage = min((int) $request->get('per_page', 10), 50);
        $orders  = $query->paginate($perPage);

        return OrderResource::collection($orders);
    }

    // =========================================================================
    // GET /api/client/orders/{id} — Chi tiết 1 đơn hàng
    // =========================================================================
    #[OA\Get(
        path: '/api/client/orders/{id}',
        summary: 'Chi tiết đơn hàng của user',
        tags: ['Client - Orders'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID đơn hàng'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Thành công'),
            new OA\Response(response: 403, description: 'Không phải đơn hàng của bạn'),
            new OA\Response(response: 404, description: 'Không tìm thấy đơn hàng'),
        ]
    )]
    public function show(Request $request, string $id)
    {
        $user  = $request->user();
        $order = Order::with([
            'items',
            'statusHistory' => fn($q) => $q->orderBy('id', 'asc'),
        ])->findOrFail($id);

        // Bảo vệ: chỉ xem đơn của chính mình
        if ($order->user_id !== $user->id) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Bạn không có quyền xem đơn hàng này.',
            ], 403);
        }

        return response()->json([
            'status' => 'success',
            'data'   => new OrderResource($order),
        ]);
    }

    // =========================================================================
    // POST /api/client/orders/{id}/cancel — Hủy đơn hàng (chỉ khi pending)
    // =========================================================================
    #[OA\Post(
        path: '/api/client/orders/{id}/cancel',
        summary: 'Hủy đơn hàng (chỉ khi đang ở trạng thái pending)',
        tags: ['Client - Orders'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: false,
            content: new OA\JsonContent(
                properties: [
                    new OA\Property(property: 'reason', type: 'string', nullable: true, description: 'Lý do hủy đơn (không bắt buộc)'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Hủy đơn thành công'),
            new OA\Response(response: 403, description: 'Không phải đơn của bạn hoặc không thể hủy'),
            new OA\Response(response: 404, description: 'Không tìm thấy đơn hàng'),
            new OA\Response(response: 422, description: 'Đơn hàng không ở trạng thái có thể hủy'),
        ]
    )]
    public function cancel(Request $request, string $id)
    {
        $user  = $request->user();
        $order = Order::findOrFail($id);

        // Kiểm tra quyền sở hữu
        if ($order->user_id !== $user->id) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Bạn không có quyền hủy đơn hàng này.',
            ], 403);
        }

        // Chỉ cho phép hủy khi đang ở trạng thái pending
        if ($order->status !== 'pending') {
            return response()->json([
                'status'  => 'error',
                'message' => "Không thể hủy đơn hàng đang ở trạng thái \"{$order->status}\". Chỉ có thể hủy đơn hàng đang chờ xử lý (pending).",
            ], 422);
        }

        $reason = $request->input('reason', 'Khách hàng tự hủy.');

        $order->update([
            'status'           => 'cancelled',
            'cancelled_reason' => $reason,
            'cancelled_by'     => $user->id,
            'cancelled_at'     => now(),
        ]);

        // Ghi lịch sử
        OrderStatusHistory::create([
            'order_id'    => $order->id,
            'from_status' => 'pending',
            'to_status'   => 'cancelled',
            'note'        => $reason,
            'changed_by'  => $user->id,
        ]);

        // Hoàn lại tồn kho cho các variant trong đơn
        foreach ($order->items()->with('variant')->get() as $item) {
            if ($item->variant_id && $item->variant) {
                $item->variant->increment('quantity', $item->quantity);
            }
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Đã hủy đơn hàng thành công.',
            'data'    => new OrderResource($order->fresh()),
        ]);
    }
}

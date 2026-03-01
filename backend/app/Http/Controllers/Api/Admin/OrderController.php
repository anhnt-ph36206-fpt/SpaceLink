<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Order\UpdateOrderStatusRequest;
use App\Http\Requests\Admin\Order\UpdatePaymentStatusRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\OrderStatusHistory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use OpenApi\Attributes as OA;

class OrderController extends Controller
{
    // Map trạng thái → timestamp field tương ứng
    private const STATUS_TIMESTAMPS = [
        'confirmed'  => 'confirmed_at',
        'shipped'    => 'shipped_at',
        'shipping'   => 'shipped_at',
        'delivered'  => 'delivered_at',
        'completed'  => 'completed_at',
        'cancelled'  => 'cancelled_at',
    ];

    // =========================================================================
    // GET /api/admin/orders — Danh sách đơn hàng (filter + paginate)
    // =========================================================================
    #[OA\Get(
        path: '/api/admin/orders',
        summary: '[Admin] Danh sách đơn hàng',
        tags: ['Admin - Orders'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'search',         in: 'query', required: false, schema: new OA\Schema(type: 'string'),  description: 'Tìm theo order_code, tên KH, SĐT'),
            new OA\Parameter(name: 'status',          in: 'query', required: false, schema: new OA\Schema(type: 'string'),  description: 'Lọc theo trạng thái đơn'),
            new OA\Parameter(name: 'payment_status',  in: 'query', required: false, schema: new OA\Schema(type: 'string'),  description: 'Lọc theo trạng thái thanh toán'),
            new OA\Parameter(name: 'payment_method',  in: 'query', required: false, schema: new OA\Schema(type: 'string'),  description: 'Lọc theo phương thức thanh toán'),
            new OA\Parameter(name: 'date_from',       in: 'query', required: false, schema: new OA\Schema(type: 'string', format: 'date'), description: 'Từ ngày (Y-m-d)'),
            new OA\Parameter(name: 'date_to',         in: 'query', required: false, schema: new OA\Schema(type: 'string', format: 'date'), description: 'Đến ngày (Y-m-d)'),
            new OA\Parameter(name: 'per_page',        in: 'query', required: false, schema: new OA\Schema(type: 'integer'), description: 'Số bản ghi/trang (mặc định 15)'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Thành công'),
            new OA\Response(response: 401, description: 'Chưa xác thực'),
            new OA\Response(response: 403, description: 'Không phải Admin'),
        ]
    )]
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Order::with(['user:id,fullname,email,phone'])
            ->latest();

        // Tìm kiếm theo order_code / tên KH / SĐT
        if ($request->filled('search')) {
            $kw = $request->search;
            $query->where(function ($q) use ($kw) {
                $q->where('order_code', 'like', "%{$kw}%")
                  ->orWhere('shipping_name', 'like', "%{$kw}%")
                  ->orWhere('shipping_phone', 'like', "%{$kw}%")
                  ->orWhere('shipping_email', 'like', "%{$kw}%");
            });
        }

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }

        if ($request->filled('payment_method')) {
            $query->where('payment_method', $request->payment_method);
        }

        if ($request->filled('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->filled('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $perPage  = min((int) $request->get('per_page', 15), 100);
        $orders   = $query->paginate($perPage);

        return OrderResource::collection($orders);
    }

    // =========================================================================
    // GET /api/admin/orders/{id} — Chi tiết đơn hàng
    // =========================================================================
    #[OA\Get(
        path: '/api/admin/orders/{id}',
        summary: '[Admin] Chi tiết đơn hàng',
        tags: ['Admin - Orders'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer'), description: 'ID đơn hàng'),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Thành công'),
            new OA\Response(response: 404, description: 'Không tìm thấy đơn hàng'),
        ]
    )]
    public function show(string $id): OrderResource
    {
        $order = Order::with([
            'user:id,fullname,email,phone',
            'items',
            'statusHistory' => fn($q) => $q->orderBy('id', 'asc'),
        ])->findOrFail($id);

        return new OrderResource($order);
    }

    // =========================================================================
    // PATCH /api/admin/orders/{id}/status — Cập nhật trạng thái
    // =========================================================================
    #[OA\Patch(
        path: '/api/admin/orders/{id}/status',
        summary: '[Admin] Cập nhật trạng thái đơn hàng',
        tags: ['Admin - Orders'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['status'],
                properties: [
                    new OA\Property(property: 'status',             type: 'string', enum: ['pending', 'confirmed', 'processing', 'shipping', 'delivered', 'completed', 'cancelled', 'returned']),
                    new OA\Property(property: 'note',               type: 'string', nullable: true, description: 'Ghi chú nội bộ'),
                    new OA\Property(property: 'cancelled_reason',   type: 'string', nullable: true, description: 'Lý do hủy (bắt buộc khi status=cancelled)'),
                    new OA\Property(property: 'tracking_code',      type: 'string', nullable: true),
                    new OA\Property(property: 'shipping_partner',   type: 'string', nullable: true),
                    new OA\Property(property: 'estimated_delivery', type: 'string', format: 'date', nullable: true),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Cập nhật thành công'),
            new OA\Response(response: 404, description: 'Không tìm thấy đơn hàng'),
            new OA\Response(response: 422, description: 'Validation thất bại'),
        ]
    )]
    public function updateStatus(UpdateOrderStatusRequest $request, string $id): JsonResponse
    {
        $order      = Order::findOrFail($id);
        $oldStatus  = $order->status;
        $newStatus  = $request->status;
        $admin      = $request->user();

        // Build update payload
        $updateData = ['status' => $newStatus];

        // Ghi timestamp tương ứng với trạng thái mới
        $tsField = self::STATUS_TIMESTAMPS[$newStatus] ?? null;
        if ($tsField && !$order->{$tsField}) {
            $updateData[$tsField] = now();
        }

        // Xử lý riêng khi hủy đơn
        if ($newStatus === 'cancelled') {
            $updateData['cancelled_reason'] = $request->cancelled_reason;
            $updateData['cancelled_by']     = $admin->id;
        }

        // Thông tin vận chuyển (khi chuyển sang shipping)
        if ($request->filled('tracking_code'))     $updateData['tracking_code']     = $request->tracking_code;
        if ($request->filled('shipping_partner'))  $updateData['shipping_partner']  = $request->shipping_partner;
        if ($request->filled('estimated_delivery')) $updateData['estimated_delivery'] = $request->estimated_delivery;

        // Ghi admin note nếu có
        if ($request->filled('note')) {
            $updateData['admin_note'] = $request->note;
        }

        $order->update($updateData);

        // Ghi lịch sử chuyển trạng thái
        OrderStatusHistory::create([
            'order_id'   => $order->id,
            'from_status'=> $oldStatus,
            'to_status'  => $newStatus,
            'note'       => $request->note,
            'changed_by' => $admin->id,
        ]);

        $order->load(['user:id,fullname,email', 'items', 'statusHistory']);

        return response()->json([
            'status'  => true,
            'message' => "Đã cập nhật trạng thái đơn hàng từ \"{$oldStatus}\" → \"{$newStatus}\".",
            'data'    => new OrderResource($order),
        ]);
    }

    // =========================================================================
    // PATCH /api/admin/orders/{id}/payment-status — Cập nhật thanh toán
    // =========================================================================
    #[OA\Patch(
        path: '/api/admin/orders/{id}/payment-status',
        summary: '[Admin] Cập nhật trạng thái thanh toán',
        tags: ['Admin - Orders'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['payment_status'],
                properties: [
                    new OA\Property(property: 'payment_status', type: 'string', enum: ['unpaid', 'paid', 'refunded', 'partial_refund']),
                    new OA\Property(property: 'note',           type: 'string', nullable: true),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Cập nhật thành công'),
            new OA\Response(response: 404, description: 'Không tìm thấy đơn hàng'),
            new OA\Response(response: 422, description: 'Validation thất bại'),
        ]
    )]
    public function updatePaymentStatus(UpdatePaymentStatusRequest $request, string $id): JsonResponse
    {
        $order = Order::findOrFail($id);

        $updateData = ['payment_status' => $request->payment_status];
        if ($request->filled('note')) {
            $updateData['admin_note'] = $request->note;
        }

        $order->update($updateData);

        return response()->json([
            'status'  => true,
            'message' => "Đã cập nhật thanh toán thành \"{$request->payment_status}\".",
            'data'    => new OrderResource($order),
        ]);
    }
}

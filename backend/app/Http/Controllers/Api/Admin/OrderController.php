<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Order\UpdateOrderStatusRequest;
use App\Http\Requests\Admin\Order\UpdatePaymentStatusRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

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
    public function updateStatus(UpdateOrderStatusRequest $request, string $id): JsonResponse
    {
        $order      = Order::findOrFail($id);
        $oldStatus  = $order->status;
        $newStatus  = $request->status;
        $admin      = $request->user();

        $order = DB::transaction(function () use ($order, $oldStatus, $newStatus, $admin, $request) {
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

                // Khôi phục tồn kho: variant + product
                foreach ($order->items()->with('variant')->get() as $item) {
                    if ($item->variant_id && $item->variant) {
                        $item->variant->increment('quantity', $item->quantity);
                    }
                    Product::where('id', $item->product_id)
                        ->increment('quantity', $item->quantity);
                }
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

            return $order;
        });

        return response()->json([
            'status'  => true,
            'message' => "Đã cập nhật trạng thái đơn hàng từ \"{$oldStatus}\" → \"{$newStatus}\".",
            'data'    => new OrderResource($order),
        ]);
    }

    // =========================================================================
    // PATCH /api/admin/orders/{id}/payment-status — Cập nhật thanh toán
    // =========================================================================
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

<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\Admin\Order\ApproveReturnRequest;
use App\Http\Requests\Admin\Order\RejectReturnRequest;
use App\Http\Requests\Admin\Order\UpdateOrderStatusRequest;
use App\Http\Requests\Admin\Order\UpdatePaymentStatusRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Voucher;
use App\Models\VoucherUsage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    // Trạng thái đã trừ kho (dùng để quyết định có hoàn kho khi cancel không)
    private const STOCK_DEDUCTED_STATUSES = ['confirmed', 'processing', 'shipping', 'delivered', 'completed'];

    private const VALID_STATUS_TRANSITIONS_ADMIN = [
        'pending' => ['confirmed', 'cancelled'],
        'confirmed' => ['processing', 'cancelled'],
        'processing' => ['shipping', 'cancelled'],
        'shipping' => ['delivered'],
        'delivered' => [],
        'completed' => [],
        'cancelled' => [],
        'returned' => [],
    ];

    // Map trạng thái → timestamp field tương ứng
    private const STATUS_TIMESTAMPS = [
        'confirmed' => 'confirmed_at',
        'shipped' => 'shipped_at',
        'shipping' => 'shipped_at',
        'delivered' => 'delivered_at',
        'completed' => 'completed_at',
        'cancelled' => 'cancelled_at',
    ];

    // =========================================================================
    // GET /api/admin/orders — Danh sách đơn hàng (filter + paginate)
    // =========================================================================
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Order::with(['user:id,fullname,email,phone', 'productReturn.evidences'])
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

        $perPage = min((int) $request->get('per_page', 15), 100);
        $orders = $query->paginate($perPage);

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
            'statusHistory' => fn ($q) => $q->orderBy('id', 'asc'),
            'productReturn.evidences',
            'cancelRequests' => fn ($q) => $q->latest()->limit(1),
        ])->findOrFail($id);

        return new OrderResource($order);
    }

    // =========================================================================
    // PATCH /api/admin/orders/{id}/status — Cập nhật trạng thái
    // Lazy deduction: TRỪ KHO khi confirmed, HOÀN KHO khi cancel (nếu đã trừ)
    // =========================================================================
    public function updateStatus(UpdateOrderStatusRequest $request, string $id): JsonResponse
    {
        $order = Order::findOrFail($id);
        $oldStatus = $order->status;
        $newStatus = $request->status;
        $admin = $request->user();

        // `completed`/`returned` là các trạng thái do phía khác điều khiển
        if ($newStatus === 'completed') {
            return response()->json([
                'status' => 'error',
                'message' => 'Chỉ khách hàng xác nhận nhận hàng mới có thể chuyển sang \"completed\".',
            ], 422);
        }

        if ($newStatus === 'returned') {
            return response()->json([
                'status' => 'error',
                'message' => 'Không thể cập nhật \"returned\" trực tiếp. Hãy duyệt/từ chối hoàn trả qua luồng hoàn trả.',
            ], 422);
        }

        $allowed = self::VALID_STATUS_TRANSITIONS_ADMIN[$oldStatus] ?? [];
        if (! in_array($newStatus, $allowed, true)) {
            return response()->json([
                'status' => 'error',
                'message' => "Chuyển trạng thái không hợp lệ: \"{$oldStatus}\" → \"{$newStatus}\".",
            ], 422);
        }

        try {
            $order = DB::transaction(function () use ($order, $oldStatus, $newStatus, $admin, $request) {
                // Build update payload
                $updateData = ['status' => $newStatus];

                // Ghi timestamp tương ứng với trạng thái mới
                $tsField = self::STATUS_TIMESTAMPS[$newStatus] ?? null;
                if ($tsField && ! $order->{ $tsField}) {
                    $updateData[$tsField] = now();
                }

                // ===================================================================
                // Lazy deduction: TRỪ KHO khi xác nhận đơn (pending → confirmed)
                // ===================================================================
                if ($newStatus === 'confirmed') {
                    $stockErrors = [];
                    foreach ($order->items()->with('variant')->get() as $item) {
                        if (! $item->variant_id) continue;

                        $variant = ProductVariant::where('id', $item->variant_id)
                            ->lockForUpdate()
                            ->first();

                        if (! $variant || $variant->quantity < $item->quantity) {
                            $available = $variant ? $variant->quantity : 0;
                            $stockErrors[] = "{$item->product_name} (cần {$item->quantity}, còn {$available})";
                            continue;
                        }

                        // Trừ kho variant
                        $variant->decrement('quantity', $item->quantity);
                        // Trừ kho product tổng
                        Product::where('id', $item->product_id)
                            ->where('quantity', '>=', $item->quantity)
                            ->decrement('quantity', $item->quantity);
                    }

                    // Nếu có sản phẩm hết hàng → không cho confirm
                    if (! empty($stockErrors)) {
                        throw new \Exception(
                            'Không thể xác nhận đơn vì tồn kho không đủ: ' . implode(', ', $stockErrors)
                        );
                    }
                }

                // ===================================================================
                // Xử lý khi hủy đơn
                // ===================================================================
                if ($newStatus === 'cancelled') {
                    $updateData['cancelled_reason'] = $request->cancelled_reason;
                    $updateData['cancelled_by'] = $admin->id;

                    // Lazy deduction: CHỈ hoàn kho nếu đơn đã confirmed+ (stock đã bị trừ)
                    if (in_array($oldStatus, self::STOCK_DEDUCTED_STATUSES, true)) {
                        foreach ($order->items()->with('variant')->get() as $item) {
                            if ($item->variant_id && $item->variant) {
                                $item->variant->increment('quantity', $item->quantity);
                            }
                            Product::where('id', $item->product_id)
                                ->increment('quantity', $item->quantity);
                        }
                    }
                    // Đơn pending bị cancel → KHÔNG hoàn kho (vì chưa trừ)

                    // Hoàn trả voucher khi admin hủy đơn
                    if ($order->voucher_id) {
                        Voucher::where('id', $order->voucher_id)
                            ->where('used_count', '>', 0)
                            ->decrement('used_count');
                        VoucherUsage::where('voucher_id', $order->voucher_id)
                            ->where('order_id', $order->id)
                            ->delete();
                    }
                }


                // Thông tin vận chuyển (khi chuyển sang shipping)
                if ($request->filled('tracking_code')) {
                    $updateData['tracking_code'] = $request->tracking_code;
                }
                if ($request->filled('shipping_partner')) {
                    $updateData['shipping_partner'] = $request->shipping_partner;
                }
                if ($request->filled('estimated_delivery')) {
                    $updateData['estimated_delivery'] = $request->estimated_delivery;
                }

                // Ghi admin note nếu có
                if ($request->filled('note')) {
                    $updateData['admin_note'] = $request->note;
                }

                $order->update($updateData);

                // Ghi lịch sử chuyển trạng thái
                OrderStatusHistory::create([
                    'order_id' => $order->id,
                    'from_status' => $oldStatus,
                    'to_status' => $newStatus,
                    'note' => $request->note,
                    'changed_by' => $admin->id,
                ]);

                $order->load(['user:id,fullname,email', 'items', 'statusHistory']);

                return $order;
            });

            return response()->json([
                'status' => true,
                'message' => "Đã cập nhật trạng thái đơn hàng từ \"{$oldStatus}\" → \"{$newStatus}\".",
                'data' => new OrderResource($order),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => $e->getMessage(),
            ], 409);
        }
    }

    // =========================================================================
    // PATCH /api/admin/orders/{id}/payment-status — Cập nhật thanh toán
    // =========================================================================
    public function updatePaymentStatus(UpdatePaymentStatusRequest $request, string $id): JsonResponse
    {
        $order = Order::with(['productReturn.evidences'])->findOrFail($id);

        $newPaymentStatus = $request->payment_status;
        $productReturn = $order->productReturn;

        // Luồng hoàn trả: chỉ cho phép cập nhật refunded/partial_refund khi đã duyệt hoàn trả (approved)
        if (in_array($newPaymentStatus, ['refunded', 'partial_refund'], true)) {
            if ($order->status !== 'returned') {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Chỉ có thể cập nhật hoàn tiền khi đơn đang ở trạng thái \"returned\".',
                ], 422);
            }

            if (! $productReturn) {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Không tìm thấy yêu cầu hoàn trả tương ứng với đơn hàng.',
                ], 422);
            }

            if ($productReturn->status !== 'approved') {
                return response()->json([
                    'status' => 'error',
                    'message' => 'Chỉ có thể cập nhật hoàn tiền sau khi admin đã duyệt yêu cầu hoàn trả.',
                ], 422);
            }
        }

        // Nếu đang ở luồng hoàn trả thì chỉ cho phép cập nhật hoàn tiền
        if ($order->status === 'returned' && ! in_array($newPaymentStatus, ['refunded', 'partial_refund'], true)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Trong luồng hoàn trả, chỉ cho phép cập nhật refunded/partial_refund.',
            ], 422);
        }

        $updateData = ['payment_status' => $newPaymentStatus];
        if ($request->filled('note')) {
            $updateData['admin_note'] = $request->note;
        }

        DB::transaction(function () use ($order, $updateData, $newPaymentStatus, $productReturn): void {
            $order->update($updateData);

            if (in_array($newPaymentStatus, ['refunded', 'partial_refund'], true) && $productReturn) {
                $productReturn->status = 'refunded';
                $productReturn->refund_amount = $newPaymentStatus === 'refunded' ? $order->total_amount : $productReturn->refund_amount;
                $productReturn->save();

                // Lazy deduction: Hoàn kho khi refund (vì stock đã bị trừ khi confirmed/paid)
                foreach ($order->items()->with('variant')->get() as $item) {
                    if ($item->variant_id && $item->variant) {
                        $item->variant->increment('quantity', $item->quantity);
                    }
                    Product::where('id', $item->product_id)
                        ->increment('quantity', $item->quantity);
                }
            }
        });

        return response()->json([
            'status' => true,
            'message' => "Đã cập nhật thanh toán thành \"{$newPaymentStatus}\".",
            'data' => new OrderResource($order),
        ]);
    }

    // =========================================================================
    // POST /api/admin/orders/{id}/return/approve — Admin duyệt hoàn trả
    // =========================================================================
    public function approveReturn(ApproveReturnRequest $request, string $id): JsonResponse
    {
        $admin = $request->user();
        $order = Order::with(['productReturn.evidences'])->findOrFail($id);

        if ($order->status !== 'returned') {
            return response()->json([
                'status' => 'error',
                'message' => 'Chỉ có thể duyệt hoàn trả khi đơn đang ở trạng thái \"returned\".',
            ], 422);
        }

        $productReturn = $order->productReturn;
        if (! $productReturn || $productReturn->status !== 'pending') {
            return response()->json([
                'status' => 'error',
                'message' => 'Không tìm thấy yêu cầu hoàn trả đang chờ duyệt cho đơn này.',
            ], 422);
        }

        DB::transaction(function () use ($order, $productReturn, $admin, $request): void {
            $productReturn->status = 'approved';
            $productReturn->reason_for_refusal = null;
            $productReturn->save();

            if ($request->filled('admin_note')) {
                $order->update(['admin_note' => $request->admin_note]);
            }

            OrderStatusHistory::create([
                'order_id' => $order->id,
                'from_status' => 'returned',
                'to_status' => 'returned',
                'note' => 'Admin đã duyệt yêu cầu hoàn trả.',
                'changed_by' => $admin->id,
            ]);
        });

        $order->load(['productReturn.evidences']);

        return response()->json([
            'status' => true,
            'message' => 'Đã duyệt hoàn trả. Tiếp theo admin có thể cập nhật hoàn tiền.',
            'data' => new OrderResource($order),
        ]);
    }

    // =========================================================================
    // POST /api/admin/orders/{id}/return/reject — Admin từ chối hoàn trả
    // =========================================================================
    public function rejectReturn(RejectReturnRequest $request, string $id): JsonResponse
    {
        $admin = $request->user();
        $order = Order::with(['productReturn.evidences'])->findOrFail($id);

        if ($order->status !== 'returned') {
            return response()->json([
                'status' => 'error',
                'message' => 'Chỉ có thể từ chối hoàn trả khi đơn đang ở trạng thái \"returned\".',
            ], 422);
        }

        $productReturn = $order->productReturn;
        if (! $productReturn || $productReturn->status !== 'pending') {
            return response()->json([
                'status' => 'error',
                'message' => 'Yêu cầu hoàn trả không ở trạng thái chờ duyệt.',
            ], 422);
        }

        if (in_array($order->payment_status, ['refunded', 'partial_refund'], true)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Không thể từ chối khi đơn hàng đã được hoàn tiền.',
            ], 422);
        }

        $reason = $request->input('reason_for_refusal');

        DB::transaction(function () use ($order, $productReturn, $admin, $reason): void {
            $productReturn->status = 'rejected';
            $productReturn->reason_for_refusal = $reason;
            $productReturn->save();

            $restoreStatus = $order->completed_at ? 'completed' : 'delivered';
            $order->update(['status' => $restoreStatus]);

            OrderStatusHistory::create([
                'order_id' => $order->id,
                'from_status' => 'returned',
                'to_status' => $restoreStatus,
                'note' => 'Admin từ chối hoàn trả: '.$reason,
                'changed_by' => $admin->id,
            ]);
        });

        $order->load(['productReturn.evidences']);

        return response()->json([
            'status' => true,
            'message' => 'Đã từ chối hoàn trả. Trạng thái đơn hàng đã được khôi phục.',
            'data' => new OrderResource($order),
        ]);
    }
}

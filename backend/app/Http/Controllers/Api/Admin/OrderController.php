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
use App\Models\UserNotification;
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
                // Immediate deduction: KHÔNG cần trừ kho khi confirm nữa
                // Stock đã được trừ ngay khi user đặt hàng (checkout)
                // ===================================================================

                // ===================================================================
                // Xử lý khi hủy đơn — LUÔN hoàn kho (vì stock đã trừ ngay khi đặt hàng)
                // ===================================================================
                if ($newStatus === 'cancelled') {
                    $updateData['cancelled_reason'] = $request->cancelled_reason;
                    $updateData['cancelled_by'] = $admin->id;

                    // Immediate deduction: LUÔN hoàn kho khi cancel (vì stock đã bị trừ ngay khi checkout)
                    foreach ($order->items()->with('variant')->get() as $item) {
                        if ($item->variant_id && $item->variant) {
                            $item->variant->increment('quantity', $item->quantity);
                        }
                        // Sync product.quantity = tổng variant
                        $p = Product::find($item->product_id);
                        if ($p) {
                            $p->update(['quantity' => ProductVariant::where('product_id', $p->id)->sum('quantity')]);
                        }
                    }

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

                // ===================================================================
                // COD: tự động paid khi delivered (khách trả tiền khi nhận hàng)
                // ===================================================================
                if ($newStatus === 'delivered' && $order->payment_method === 'cod' && $order->payment_status !== 'paid') {
                    $updateData['payment_status'] = 'paid';
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

                // ===================================================================
                // Gửi thông báo cho khách hàng khi thay đổi trạng thái
                // ===================================================================
                if ($order->user_id) {
                    $notifMap = [
                        'confirmed'  => ['order_confirmed',  '✅ Đơn hàng đã được xác nhận',  "Đơn #{$order->order_code} đã được shop xác nhận và đang chuẩn bị hàng."],
                        'processing' => ['order_processing', '📦 Đơn hàng đang được đóng gói', "Đơn #{$order->order_code} đang được đóng gói để giao cho đơn vị vận chuyển."],
                        'shipping'   => ['order_shipping',   '🚚 Đơn hàng đang vận chuyển',   "Đơn #{$order->order_code} đã được giao cho đơn vị vận chuyển."],
                        'delivered'  => ['order_delivered',  '📬 Đơn hàng đã giao thành công', "Đơn #{$order->order_code} đã được giao thành công. Hãy xác nhận nếu bạn đã nhận được hàng!"],
                        'cancelled'  => ['order_cancelled',  '❌ Đơn hàng đã bị hủy',         "Đơn #{$order->order_code} đã bị hủy. Lý do: " . ($request->cancelled_reason ?? 'Admin hủy đơn')],
                    ];
                    if (isset($notifMap[$newStatus])) {
                        [$type, $title, $body] = $notifMap[$newStatus];
                        UserNotification::notify($order->user_id, $type, $title, $body, $order->id);
                    }
                }

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
            // Lock order để tránh race condition (admin double-click)
            $freshOrder = Order::where('id', $order->id)->lockForUpdate()->first();
            if (!$freshOrder) return;

            $freshOrder->update($updateData);

            if (in_array($newPaymentStatus, ['refunded', 'partial_refund'], true) && $productReturn) {
                // Re-lock productReturn bên trong transaction để đảm bảo idempotent
                $freshReturn = \App\Models\ProductReturn::where('id', $productReturn->id)
                    ->lockForUpdate()->first();

                // ĐÃ refunded rồi → KHÔNG hoàn kho lần 2 (chống double-click)
                if (!$freshReturn || $freshReturn->status === 'refunded') {
                    return;
                }

                $freshReturn->status = 'refunded';
                $freshReturn->refund_amount = $newPaymentStatus === 'refunded'
                    ? $freshOrder->total_amount
                    : $freshReturn->refund_amount;
                $freshReturn->save();

                // Lazy deduction: Hoàn kho khi refund (vì stock đã bị trừ khi confirmed/paid)
                foreach ($freshOrder->items()->with('variant')->get() as $item) {
                    if ($item->variant_id) {
                        // Lock variant trước khi increment để tránh race condition
                        $variant = ProductVariant::where('id', $item->variant_id)
                            ->lockForUpdate()->first();
                        if ($variant) {
                            $variant->increment('quantity', $item->quantity);
                        }
                    }
                    // Sync product.quantity = tổng variant
                    $p = Product::find($item->product_id);
                    if ($p) {
                        $p->update(['quantity' => ProductVariant::where('product_id', $p->id)->sum('quantity')]);
                    }
                }
            }
        });

        // Thông báo cho khách khi hoàn tiền
        if (in_array($newPaymentStatus, ['refunded', 'partial_refund'], true) && $order->user_id) {
            $label = $newPaymentStatus === 'refunded' ? 'toàn bộ' : 'một phần';
            UserNotification::notify(
                $order->user_id,
                'payment_refunded',
                "💰 Đã hoàn tiền {$label} cho đơn hàng",
                "Đơn #{$order->order_code} đã được hoàn tiền {$label}.",
                $order->id
            );
        }

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

            // Upload ảnh bằng chứng chuyển khoản hoàn tiền
            if ($request->hasFile('refund_proof_image')) {
                $path = $request->file('refund_proof_image')->store('refunds', 'public');
                $productReturn->refund_proof_image = $path;
            }

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

        // Thông báo cho khách
        if ($order->user_id) {
            UserNotification::notify(
                $order->user_id,
                'return_approved',
                '✅ Yêu cầu hoàn trả đã được duyệt',
                "Yêu cầu hoàn trả cho đơn #{$order->order_code} đã được admin duyệt. Chờ xử lý hoàn tiền.",
                $order->id
            );
        }

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

            // Bug #6 Fix: dùng delivered_at thay completed_at
            // completed_at chỉ set khi khách xác nhận nhận hàng — không phải mốc giao hàng
            // delivered_at đáng tin cậy hơn: có để restore 'delivered', không có là chưa giao
            $restoreStatus = $order->delivered_at ? 'delivered' : 'completed';
            // Fallback: nếu quả thực đã completed (có cả 2 mốc) thì restore về completed
            if ($order->delivered_at && $order->completed_at) {
                $restoreStatus = 'completed';
            }
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

        // Thông báo cho khách
        if ($order->user_id) {
            UserNotification::notify(
                $order->user_id,
                'return_rejected',
                '❌ Yêu cầu hoàn trả bị từ chối',
                "Yêu cầu hoàn trả cho đơn #{$order->order_code} đã bị từ chối. Lý do: {$reason}",
                $order->id
            );
        }

        return response()->json([
            'status' => true,
            'message' => 'Đã từ chối hoàn trả. Trạng thái đơn hàng đã được khôi phục.',
            'data' => new OrderResource($order),
        ]);
    }
    // =========================================================================
    // POST /api/admin/orders/{id}/refund-out-of-stock
    // Bug #7 Fix: Luồng hoàn tiền riêng cho đơn bị hủy do hết hàng sau VNPAY
    // Khác với updatePaymentStatus(): không yêu cầu status='returned' + productReturn
    // =========================================================================
    public function refundOutOfStock(\Illuminate\Http\Request $request, string $id): JsonResponse
    {
        $admin = $request->user();
        $order = Order::findOrFail($id);

        // Chỉ dành cho đơn bị hủy đúng lý do hết hàng sau thanh toán VNPAY
        if ($order->status !== 'cancelled' || $order->cancelled_reason !== 'out_of_stock_after_payment') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Endpoint này chỉ dành cho đơn bị hủy do hết hàng sau thanh toán VNPAY.',
            ], 422);
        }

        // Không cần thanh toán lại nếu đã refunded rồi
        if (in_array($order->payment_status, ['refunded', 'partial_refund'], true)) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Đơn hàng này đã được hoàn tiền.',
            ], 422);
        }

        $transactionCode = $request->input('transaction_code', '');
        $note = $request->input('note', 'Admin xác nhận đã hoàn tiền cho khách.');

        DB::transaction(function () use ($order, $admin, $transactionCode, $note): void {
            $order->update([
                'payment_status' => 'refunded',
                'admin_note'     => $note . ($transactionCode ? ' | Mã GD hoàn tiền: ' . $transactionCode : ''),
            ]);

            OrderStatusHistory::create([
                'order_id'    => $order->id,
                'from_status' => 'cancelled',
                'to_status'   => 'cancelled',
                'note'        => 'Admin xác nhận đã hoàn tiền cho đơn hết hàng sau VNPAY.' . ($transactionCode ? ' Mã GD: ' . $transactionCode : ''),
                'changed_by'  => $admin->id,
            ]);
        });

        // Thông báo cho khách
        if ($order->user_id) {
            UserNotification::notify(
                $order->user_id,
                'payment_refunded',
                '💰 Đã hoàn tiền cho đơn hàng hết hàng',
                "Đơn #{$order->order_code} đã được hoàn tiền toàn bộ sau khi bị hủy do hết hàng. Xin lỗi về sự cố này.",
                $order->id
            );
        }

        return response()->json([
            'status'  => true,
            'message' => 'Đã cập nhật trạng thái hoàn tiền thành công.',
            'data'    => new OrderResource($order->fresh()),
        ]);
    }
}

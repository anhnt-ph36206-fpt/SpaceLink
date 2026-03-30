<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Http\Requests\Client\Order\RequestReturnRequest;
use App\Http\Resources\OrderResource;
use App\Models\AdminNotification;
use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\Product;
use App\Models\ProductReturn;
use App\Models\ReturnEvidence;
use App\Models\Voucher;
use App\Models\VoucherUsage;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OrderController extends Controller
{
    // =========================================================================
    // GET /api/client/orders — Danh sách đơn hàng của user hiện tại
    // =========================================================================
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Order::with('items')->where('user_id', $user->id)->latest();

        if ($request->filled('status')) {
            $query->where('status', $request->status);
        }

        if ($request->filled('payment_status')) {
            $query->where('payment_status', $request->payment_status);
        }

        $perPage = min((int) $request->get('per_page', 10), 50);
        $orders = $query->paginate($perPage);

        return OrderResource::collection($orders);
    }

    // =========================================================================
    // GET /api/client/orders/{id} — Chi tiết 1 đơn hàng
    // =========================================================================
    public function show(Request $request, string $id)
    {
        $user = $request->user();
        $order = Order::with([
            'items',
            'statusHistory' => fn ($q) => $q->orderBy('id', 'asc'),
            'productReturn',
        ])->findOrFail($id);

        // Bảo vệ: chỉ xem đơn của chính mình
        if ($order->user_id !== $user->id) {
            return response()->json([
                'status' => 'error',
                'message' => 'Bạn không có quyền xem đơn hàng này.',
            ], 403);
        }

        return response()->json([
            'status' => 'success',
            'data' => new OrderResource($order),
        ]);
    }

    // =========================================================================
    // POST /api/client/orders/{id}/cancel — Hủy đơn hàng (chỉ khi pending)
    // =========================================================================
    public function cancel(Request $request, string $id)
    {
        $user = $request->user();
        $order = Order::findOrFail($id);

        // Kiểm tra quyền sở hữu
        if ($order->user_id !== $user->id) {
            return response()->json([
                'status' => 'error',
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

        DB::transaction(function () use ($order, $user, $reason) {
            // Hoàn lại tồn kho từ order_items — luôn đúng cho mọi loại đơn
            // COD: cart đã bị xóa tại checkout (không hoàn kho), cancel hoàn từ đây ✓
            // VNPAY: CartController.remove() được chặn khi có pending order nên không double-restore ✓
            $variantIds = [];
            foreach ($order->items()->with('variant')->get() as $item) {
                if ($item->variant_id && $item->variant) {
                    $item->variant->increment('quantity', $item->quantity);
                    $variantIds[] = $item->variant_id;
                }
                Product::where('id', $item->product_id)
                    ->increment('quantity', $item->quantity);
            }

            $order->update([
                'status'           => 'cancelled',
                'cancelled_reason' => $reason,
                'cancelled_by'     => $user->id,
                'cancelled_at'     => now(),
            ]);

            OrderStatusHistory::create([
                'order_id'    => $order->id,
                'from_status' => 'pending',
                'to_status'   => 'cancelled',
                'note'        => $reason,
                'changed_by'  => $user->id,
            ]);

            // Xóa cart items (idempotent — an toàn dù đã xóa hay chưa)
            if (count($variantIds) > 0) {
                \App\Models\Cart::where('user_id', $user->id)
                    ->whereIn('variant_id', $variantIds)
                    ->delete();
            }

            // Hoàn trả voucher khi hủy đơn
            if ($order->voucher_id) {
                Voucher::where('id', $order->voucher_id)
                    ->where('used_count', '>', 0)
                    ->decrement('used_count');
                VoucherUsage::where('voucher_id', $order->voucher_id)
                    ->where('order_id', $order->id)
                    ->delete();
            }

            // Admin notification
            AdminNotification::notify(
                'order_cancelled',
                '❌ Khách hủy đơn hàng',
                "#{$order->order_code} — {$user->fullname}: " . ($reason ?? 'Không có lý do'),
                $order->id
            );
        });

        return response()->json([
            'status'  => 'success',
            'message' => 'Đã hủy đơn hàng thành công.',
            'data'    => new OrderResource($order->fresh()),
        ]);
    }


    // =========================================================================
    // POST /api/client/orders/{id}/confirm-received — Khách xác nhận đã nhận hàng
    // =========================================================================
    public function confirmReceived(Request $request, string $id)
    {
        $user = $request->user();
        $order = Order::findOrFail($id);

        if ($order->user_id !== $user->id) {
            return response()->json([
                'status' => 'error',
                'message' => 'Bạn không có quyền thực hiện thao tác này.',
            ], 403);
        }

        if ($order->status !== 'delivered') {
            return response()->json([
                'status' => 'error',
                'message' => 'Chỉ có thể xác nhận nhận hàng khi đơn đang ở trạng thái "Đã giao hàng".',
            ], 422);
        }

        DB::transaction(function () use ($order, $user) {
            $order->update([
                'status' => 'completed',
                'completed_at' => now(),
            ]);

            OrderStatusHistory::create([
                'order_id' => $order->id,
                'from_status' => 'delivered',
                'to_status' => 'completed',
                'note' => 'Khách hàng xác nhận đã nhận được hàng.',
                'changed_by' => $user->id,
            ]);
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Cảm ơn bạn đã xác nhận nhận hàng!',
            'data' => new OrderResource($order->fresh()),
        ]);
    }

    // =========================================================================
    // GET /api/client/orders/{id}/retry-vnpay — Tạo lại link thanh toán VNPAY
    // =========================================================================
    public function retryVnpayPayment(Request $request, string $id)
    {
        $user = $request->user();
        $order = Order::findOrFail($id);

        // Kiểm tra quyền sở hữu
        if ($order->user_id !== $user->id) {
            return response()->json(['status' => 'error', 'message' => 'Bạn không có quyền truy cập đơn hàng này.'], 403);
        }

        // Chỉ cho phép nếu: phương thức VNPAY + chưa thanh toán + đang pending
        if ($order->payment_method !== 'vnpay' || $order->payment_status !== 'unpaid' || $order->status !== 'pending') {
            return response()->json([
                'status' => 'error',
                'message' => 'Đơn hàng không hợp lệ để thanh toán lại. (Yêu cầu: phương thức VNPAY, chưa thanh toán, trạng thái pending)',
            ], 422);
        }

        // Tái sử dụng đú ng logic hash của VNPAY trong CheckoutController
        $vnp_TmnCode = config('vnpay.vnp_TmnCode');
        $vnp_HashSecret = config('vnpay.vnp_HashSecret');
        $vnp_Url = config('vnpay.vnp_Url');
        $vnp_Returnurl = config('vnpay.vnp_Returnurl');

        $inputData = [
            'vnp_Version' => '2.1.0',
            'vnp_TmnCode' => $vnp_TmnCode,
            'vnp_Amount' => $order->total_amount * 100,
            'vnp_Command' => 'pay',
            'vnp_CreateDate' => date('YmdHis'),
            'vnp_CurrCode' => 'VND',
            'vnp_IpAddr' => $request->ip(),
            'vnp_Locale' => 'vn',
            'vnp_OrderInfo' => 'Thanh toan lai don hang '.$order->order_code,
            'vnp_OrderType' => 'billpayment',
            'vnp_ReturnUrl' => $vnp_Returnurl,
            'vnp_TxnRef' => $order->order_code,
        ];

        ksort($inputData);
        $hashdata = '';
        $query = '';
        $i = 0;
        foreach ($inputData as $key => $value) {
            if ($i == 1) {
                $hashdata .= '&'.urlencode($key).'='.urlencode($value);
            } else {
                $hashdata .= urlencode($key).'='.urlencode($value);
                $i = 1;
            }
            $query .= urlencode($key).'='.urlencode($value).'&';
        }

        $paymentUrl = $vnp_Url.'?'.$query.'vnp_SecureHash='.hash_hmac('sha512', $hashdata, $vnp_HashSecret);

        return response()->json([
            'status' => 'success',
            'message' => 'Tạo lại link thanh toán VNPAY thành công.',
            'payment_url' => $paymentUrl,
            'data' => $order->only('id', 'order_code', 'total_amount'),
        ]);
    }

    // =========================================================================
    // POST /api/client/orders/{id}/cancel-vnpay — Hủy đơn VNPAY chưa thanh toán
    // Được gọi từ frontend khi user bấm Hủy trên trang VNPAY
    // =========================================================================
    public function cancelUnpaidVnpay(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $order = Order::with('items')->findOrFail($id);

        // Kiểm tra quyền sở hữu
        if ($order->user_id !== $user->id) {
            return response()->json(['status' => 'error', 'message' => 'Bạn không có quyền truy cập đơn hàng này.'], 403);
        }

        // Chỉ cho phép hủy đơn VNPAY chưa thanh toán
        if ($order->payment_method !== 'vnpay' || $order->payment_status !== 'unpaid') {
            return response()->json([
                'status' => 'error',
                'message' => 'Chỉ có thể hủy đơn VNPAY chưa thanh toán.',
            ], 422);
        }

        // Bảo vệ: không hủy nếu đã cancelled hoặc đã paid
        if (in_array($order->status, ['cancelled', 'completed', 'shipping', 'delivered'])) {
            return response()->json([
                'status' => 'error',
                'message' => "Không thể hủy đơn đang ở trạng thái \"{$order->status}\".",
            ], 422);
        }

        DB::transaction(function () use ($order, $user) {
            $order->update([
                'status'           => 'cancelled',
                'cancelled_reason' => 'Hủy thanh toán VNPAY.',
                'cancelled_by'     => $user->id,
                'cancelled_at'     => now(),
            ]);

            OrderStatusHistory::create([
                'order_id'    => $order->id,
                'from_status' => $order->getOriginal('status'),
                'to_status'   => 'cancelled',
                'note'        => 'Khách hàng hủy thanh toán trên cổng VNPAY.',
                'changed_by'  => $user->id,
            ]);

            // Hoàn lại tồn kho từ order_items
            // CartController.remove() đã được chặn khi có pending VNPAY order
            // nên không xảy ra double-restore ở đây
            $variantIds = [];
            foreach ($order->items as $item) {
                if ($item->variant_id) {
                    \App\Models\ProductVariant::where('id', $item->variant_id)
                        ->increment('quantity', $item->quantity);
                    $variantIds[] = $item->variant_id;
                }
                Product::where('id', $item->product_id)
                    ->increment('quantity', $item->quantity);
            }

            // Xóa cart items (idempotent)
            if (count($variantIds) > 0) {
                \App\Models\Cart::where('user_id', $user->id)
                    ->whereIn('variant_id', $variantIds)
                    ->delete();
            }

            // Hoàn trả voucher khi hủy đơn VNPAY
            if ($order->voucher_id) {
                Voucher::where('id', $order->voucher_id)
                    ->where('used_count', '>', 0)
                    ->decrement('used_count');
                VoucherUsage::where('voucher_id', $order->voucher_id)
                    ->where('order_id', $order->id)
                    ->delete();
            }

            // Admin notification
            AdminNotification::notify(
                'order_cancelled',
                '❌ Khách hủy đơn VNPAY (chưa thanh toán)',
                "#{$order->order_code} — {$user->fullname}",
                $order->id
            );
        });

        return response()->json([
            'status'  => 'success',
            'message' => 'Đã hủy đơn hàng. Tồn kho đã được hoàn lại.',
        ]);
    }

    // =========================================================================
    // POST /api/client/orders/{id}/return-request — Khách yêu cầu hoàn trả/không nhận hàng
    // =========================================================================
    public function requestReturn(RequestReturnRequest $request, string $id): JsonResponse
    {
        $user = $request->user();
        $order = Order::with(['items', 'productReturn'])->findOrFail($id);

        // Bảo vệ: chỉ thao tác trên đơn của chính mình
        if ($order->user_id !== $user->id) {
            return response()->json([
                'status' => 'error',
                'message' => 'Bạn không có quyền thực hiện thao tác này.',
            ], 403);
        }

        // Chỉ cho phép sau khi đã giao/hoặc đã hoàn thành
        if (! in_array($order->status, ['delivered', 'completed'], true)) {
            return response()->json([
                'status'  => 'error',
                'message' => "Không thể yêu cầu hoàn trả khi đơn đang ở trạng thái \"{$order->status}\".",
            ], 422);
        }

        // ── Kiểm tra thời hạn hoàn trả 7 ngày ──────────────────────────────
        // Tính từ: completed_at (nếu completed) hoặc delivered_at (nếu vẫn delivered)
        $RETURN_WINDOW_DAYS = 7;
        $referenceDate = $order->completed_at ?? $order->delivered_at;

        if ($referenceDate && now()->diffInDays($referenceDate) >= $RETURN_WINDOW_DAYS) {
            return response()->json([
                'status'  => 'error',
                'message' => "Đã quá {$RETURN_WINDOW_DAYS} ngày kể từ khi nhận hàng. Bạn không thể yêu cầu hoàn trả.",
                'expired' => true,
            ], 422);
        }


        $reason = $request->input('reason');

        // Nếu đã có yêu cầu hoàn trả đang xử lý thì không tạo thêm
        if ($order->productReturn && in_array($order->productReturn->status, ['pending', 'approved', 'refunded'], true)) {
            return response()->json([
                'status' => 'error',
                'message' => 'Yêu cầu hoàn trả này đã được tạo và đang chờ xử lý.',
            ], 422);
        }

        $itemIds = $order->items->pluck('id')->all();

        $evidenceFiles = $request->file('evidence_images');

        DB::transaction(function () use ($order, $user, $reason, $itemIds, $evidenceFiles, $request) {
            $oldStatus = $order->status;
            $productReturn = $order->productReturn;
            $refundData = [
                'order_id' => $order->id,
                'user_id' => $user->id,
                'reason' => $reason,
                'status' => 'pending',
                'items' => $itemIds,
                'refund_bank' => $request->input('refund_bank'),
                'refund_account_name' => $request->input('refund_account_name'),
                'refund_account_number' => $request->input('refund_account_number'),
            ];

            if ($productReturn) {
                // Reset fields if re-requesting
                $productReturn->update(array_merge($refundData, [
                    'reason_for_refusal' => null,
                    'refund_amount' => null,
                    'transaction_code' => null,
                ]));
            } else {
                $productReturn = ProductReturn::create($refundData);
            }

            // Đặt trạng thái đơn = returned để UI chuyển sang luồng hoàn trả (client chỉ "yêu cầu", admin sẽ duyệt/từ chối)
            $order->update(['status' => 'returned']);

            OrderStatusHistory::create([
                'order_id' => $order->id,
                'from_status' => $oldStatus,
                'to_status' => 'returned',
                'note' => 'Khách hàng yêu cầu hoàn trả: '.$reason,
                'changed_by' => $user->id,
            ]);

            // Admin notification
            AdminNotification::notify(
                'return_request',
                '↩️ Yêu cầu hoàn trả',
                "#{$order->order_code} — {$user->fullname}: {$reason}",
                $order->id
            );

            if (is_array($evidenceFiles) && count($evidenceFiles) > 0) {
                foreach ($evidenceFiles as $file) {
                    if (! $file) {
                        continue;
                    }

                    $path = $file->store('product-returns/evidences', 'public');

                    ReturnEvidence::create([
                        'product_return_id' => $productReturn->id,
                        'file_path' => $path,
                        'file_type' => $file->getClientMimeType(),
                    ]);
                }
            }
        });

        $order->load(['productReturn.evidences']);

        return response()->json([
            'status' => 'success',
            'message' => 'Đã gửi yêu cầu hoàn trả thành công. Vui lòng chờ admin duyệt.',
            'data' => new OrderResource($order),
        ]);
    }

    // =========================================================================
    // POST /api/client/orders/{id}/switch-to-cod — Chuyển đơn VNPAY pending sang COD
    // =========================================================================
    public function switchToCod(Request $request, string $id): JsonResponse
    {
        $user  = $request->user();
        $order = Order::findOrFail($id);

        // Kiểm tra quyền sở hữu
        if ($order->user_id !== $user->id) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Bạn không có quyền truy cập đơn hàng này.',
            ], 403);
        }

        // Chỉ cho phép với đơn VNPAY + chưa thanh toán + đang pending
        if ($order->payment_method !== 'vnpay' || $order->payment_status !== 'unpaid' || $order->status !== 'pending') {
            return response()->json([
                'status'  => 'error',
                'message' => 'Chỉ có thể chuyển COD khi đơn dùng VNPAY, chưa thanh toán và đang chờ xử lý.',
            ], 422);
        }

        DB::transaction(function () use ($order, $user) {
            $order->update([
                'payment_method'  => 'cod',
                'vnpay_expired_at' => null,
            ]);

            OrderStatusHistory::create([
                'order_id'    => $order->id,
                'from_status' => $order->status,
                'to_status'   => $order->status,
                'note'        => 'Khách hàng đổi phương thức thanh toán từ VNPAY sang COD.',
                'changed_by'  => $user->id,
            ]);

            // Xóa giỏ hàng — đơn đã xác nhận COD, không cần giữ cart nữa
            \App\Models\Cart::where('user_id', $user->id)->delete();
        });

        return response()->json([
            'status'  => 'success',
            'message' => 'Đã chuyển sang thanh toán COD thành công.',
            'data'    => new OrderResource($order->fresh()),
        ]);
    }
}

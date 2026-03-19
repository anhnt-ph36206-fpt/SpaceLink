<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Http\Requests\Client\Order\RequestReturnRequest;
use App\Http\Resources\OrderResource;
use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\Product;
use App\Models\ProductReturn;
use App\Models\ReturnEvidence;
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
                'status' => 'error',
                'message' => "Không thể hủy đơn hàng đang ở trạng thái \"{$order->status}\". Chỉ có thể hủy đơn hàng đang chờ xử lý (pending).",
            ], 422);
        }

        $reason = $request->input('reason', 'Khách hàng tự hủy.');

        DB::transaction(function () use ($order, $user, $reason) {
            $order->update([
                'status' => 'cancelled',
                'cancelled_reason' => $reason,
                'cancelled_by' => $user->id,
                'cancelled_at' => now(),
            ]);

            // Ghi lịch sử
            OrderStatusHistory::create([
                'order_id' => $order->id,
                'from_status' => 'pending',
                'to_status' => 'cancelled',
                'note' => $reason,
                'changed_by' => $user->id,
            ]);

            // Hoàn lại tồn kho: cả variant lẫn product
            foreach ($order->items()->with('variant')->get() as $item) {
                // Khôi phục tồn kho biến thể (nếu có)
                if ($item->variant_id && $item->variant) {
                    $item->variant->increment('quantity', $item->quantity);
                }
                // Khôi phục tồn kho tổng của product (luôn thực hiện)
                Product::where('id', $item->product_id)
                    ->increment('quantity', $item->quantity);
            }
        });

        return response()->json([
            'status' => 'success',
            'message' => 'Đã hủy đơn hàng thành công.',
            'data' => new OrderResource($order->fresh()),
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
                'status' => 'error',
                'message' => "Không thể yêu cầu hoàn trả khi đơn đang ở trạng thái \"{$order->status}\".",
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

        DB::transaction(function () use ($order, $user, $reason, $itemIds, $evidenceFiles) {
            $oldStatus = $order->status;

            /** @var ProductReturn|null $productReturn */
            $productReturn = $order->productReturn;
            if ($productReturn) {
                $productReturn->status = 'pending';
                $productReturn->reason = $reason;
                $productReturn->reason_for_refusal = null;
                $productReturn->refund_amount = null;
                $productReturn->transaction_code = null;
                $productReturn->refund_bank = null;
                $productReturn->refund_account_name = null;
                $productReturn->refund_account_number = null;
                $productReturn->items = $itemIds;
                $productReturn->save();
            } else {
                $productReturn = ProductReturn::create([
                    'order_id' => $order->id,
                    'user_id' => $user->id,
                    'reason' => $reason,
                    'status' => 'pending',
                    'items' => $itemIds,
                ]);
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
}

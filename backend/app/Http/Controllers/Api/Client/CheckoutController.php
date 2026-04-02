<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Http\Requests\CheckoutRequest;
use App\Models\AdminNotification;
use App\Models\Cart;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusHistory;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\UserAddress;
use App\Models\Voucher;
use App\Models\VoucherUsage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CheckoutController extends Controller
{
    public function checkVoucher(\Illuminate\Http\Request $request)
    {
        $user = auth('sanctum')->user();
        $code = $request->input('code') ?? $request->input('voucher_code');

        if (!$code) {
            return response()->json(['status' => 'error', 'message' => 'Vui lòng nhập mã voucher.'], 400);
        }

        if ($request->filled('items')) {
            $cartItems = collect($request->items)->map(function ($item) {
                $variant = ProductVariant::with('product')->find($item['variant_id']);
                if (!$variant) {
                    return null;
                }

                return (object) ['variant_id' => $variant->id, 'quantity' => (int) $item['quantity'], 'product' => $variant->product];
            })->filter();
        } else {
            if (!$user) {
                return response()->json(['status' => 'error', 'message' => 'Vui lòng đăng nhập.'], 401);
            }
            $cartItems = Cart::with(['product', 'variant'])->where('user_id', $user->id)->get();
        }

        if ($cartItems->isEmpty()) {
            return response()->json(['status' => 'error', 'message' => 'Giỏ hàng trống.'], 400);
        }

        $subtotal = (float) $request->input('order_value', 0);
        if ($subtotal <= 0) {
            $subtotal = $cartItems->sum(function ($item) {
                if ($item instanceof Cart) {
                    return (float) ($item->variant?->sale_price ?? $item->variant?->price ?? $item->product->sale_price ?? $item->product->price) * $item->quantity;
                }
                $v = ProductVariant::find($item->variant_id);

                return (float) ($v?->sale_price ?? $v?->price ?? $item->product?->sale_price ?? $item->product?->price) * $item->quantity;
            });
        }

        try {
            [$voucher, $discount] = $this->applyVoucher($code, $subtotal, $user?->id, $cartItems);

            return response()->json(['status' => 'success', 'data' => ['code' => $voucher->code, 'discount_amount' => $discount, 'discount_type' => $voucher->discount_type, 'discount_value' => $voucher->discount_value]]);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 400);
        }
    }

    public function checkout(CheckoutRequest $request)
    {
        $user = auth('sanctum')->user();

        // 1. Get items
        if ($request->filled('items')) {
            $cartItems = collect($request->items)->map(function ($item) {
                $variant = ProductVariant::with('product')->find($item['variant_id']);
                if (!$variant) {
                    return null;
                }

                return (object) [
                    'product_id' => $variant->product_id,
                    'variant_id' => $variant->id,
                    'quantity' => (int) $item['quantity'],
                    'product' => $variant->product,
                    'variant' => $variant,
                ];
            })->filter();
        } else {
            $query = Cart::with(['product', 'variant']);
            if ($user) {
                $query->where('user_id', $user->id);
            } else {
                $sessionId = $request->header('X-Session-ID') ?? $request->input('session_id');
                if (!$sessionId) {
                    return response()->json(['status' => 'error', 'message' => 'Vui lòng đăng nhập hoặc cung cấp Session ID.'], 400);
                }
                $query->where('session_id', $sessionId)->whereNull('user_id');
            }
            $cartItems = $query->get();
        }

        if ($cartItems->isEmpty()) {
            return response()->json(['status' => 'error', 'message' => 'Danh sách sản phẩm trống.'], 400);
        }

        // 2. Pre-flight stock check: validate nhanh toàn bộ items TRƯỚC khi vào transaction
        // Lazy deduction: chỉ validate, KHÔNG trừ kho
        $stockErrors = [];
        foreach ($cartItems as $item) {
            if (!$item->variant_id)
                continue;

            $currentVariant = ProductVariant::select('id', 'quantity', 'is_active')
                ->find($item->variant_id);

            if (!$currentVariant || !$currentVariant->is_active) {
                $stockErrors[] = "Sản phẩm \"{$item->product->name}\" đã ngừng bán.";
            } else {
                // Lazy deduction: so sánh trực tiếp variant.quantity với qty cần mua
                if ($currentVariant->quantity < $item->quantity) {
                    $available = $currentVariant->quantity;
                    $stockErrors[] = $available === 0
                        ? "Sản phẩm \"{$item->product->name}\" đã hết hàng."
                        : "Sản phẩm \"{$item->product->name}\" chỉ còn {$available} trong kho (bạn đang mua {$item->quantity}).";
                }
            }
        }

        if (!empty($stockErrors)) {
            return response()->json([
                'status' => 'error',
                'message' => implode(' | ', $stockErrors),
                'errors' => $stockErrors,
            ], 409);
        }


        // 3. Shipping Address
        $address = null;
        if ($request->filled('shipping_address_id')) {
            if (!$user) {
                return response()->json(['status' => 'error', 'message' => 'Vui lòng đăng nhập để sử dụng địa chỉ đã lưu.'], 401);
            }
            $address = UserAddress::where('id', $request->shipping_address_id)->where('user_id', $user->id)->first();
            if (!$address) {
                return response()->json(['status' => 'error', 'message' => 'Địa chỉ không hợp lệ.'], 403);
            }
        } else {
            $address = (object) [
                'fullname' => $request->fullname,
                'phone' => $request->phone,
                'email' => $request->email,
                'province' => $request->province,
                'district' => $request->district,
                'ward' => $request->ward,
                'address_detail' => $request->address_detail,
            ];
        }

        try {
            return DB::transaction(function () use ($user, $cartItems, $address, $request) {
                // 4. Stock Lock & Validation
                $variantIds = $cartItems->pluck('variant_id')->filter()->unique()->toArray();
                $lockedVariants = ProductVariant::with('attributes')->whereIn('id', $variantIds)->lockForUpdate()->get()->keyBy('id');

                foreach ($cartItems as $item) {
                    if (!$item->variant_id) {
                        continue;
                    }
                    $variant = $lockedVariants->get($item->variant_id);
                    if (!$variant || !$variant->is_active) {
                        throw new \App\Exceptions\StockException("Sản phẩm \"{$item->product->name}\" hiện không còn bán.");
                    }
                    // Lazy deduction: validate trực tiếp — stock chưa bị trừ bởi bất kỳ reservation nào
                    if ($variant->quantity < $item->quantity) {
                        throw new \App\Exceptions\StockException("Sản phẩm \"{$item->product->name}\" không đủ tồn kho.");
                    }
                }

                // 5. Financials
                $subtotal = $cartItems->sum(fn($i) => $this->resolvePrice($i, $lockedVariants) * $i->quantity);
                $shippingFee = $this->calculateShippingFee($subtotal);
                $voucher = null;
                $discountValue = 0;
                if ($request->filled('voucher_code')) {
                    [$voucher, $discountValue] = $this->applyVoucher($request->voucher_code, $subtotal, $user?->id, $cartItems);
                }
                $totalAmount = max(0, $subtotal + $shippingFee - $discountValue);

                // 6. Create Order
                $order = Order::create([
                    'user_id' => $user?->id,
                    'order_code' => $this->generateOrderCode(),
                    'shipping_name' => $address->fullname,
                    'shipping_phone' => $address->phone,
                    'shipping_email' => $request->email ?? ($address->email ?? $user?->email),
                    'shipping_province' => $address->province,
                    'shipping_district' => $address->district,
                    'shipping_ward' => $address->ward,
                    'shipping_address' => $address->address_detail,
                    'subtotal' => $subtotal,
                    'discount_amount' => $discountValue,
                    'shipping_fee' => $shippingFee,
                    'total_amount' => $totalAmount,
                    'status' => 'pending',
                    'payment_status' => 'unpaid',
                    'payment_method' => $request->payment_method,
                    'voucher_id' => $voucher?->id,
                    'voucher_code' => $voucher?->code,
                    'voucher_discount' => $discountValue,
                    'note' => $request->note,
                ]);

                // 7. OrderItems — Lazy deduction: KHÔNG trừ kho tại đây
                foreach ($cartItems as $item) {
                    $price = $this->resolvePrice($item, $lockedVariants);
                    $variant = $item->variant_id ? $lockedVariants->get($item->variant_id) : null;
                    $variantInfo = $variant ? [
                        'sku' => $variant->sku,
                        'image' => $variant->image,
                        'attrs' => $variant->attributes?->map(fn($a) => ['name' => $a->name, 'value' => $a->value])->toArray(),
                    ] : null;

                    OrderItem::create([
                        'order_id' => $order->id,
                        'product_id' => $item->product_id,
                        'variant_id' => $item->variant_id,
                        'product_name' => $item->product->name,
                        'product_image' => $item->product->images->first()?->image_url ?? $variant?->image,
                        'product_sku' => $variant?->sku ?? $item->product->sku,
                        'variant_info' => $variantInfo,
                        'price' => $price,
                        'quantity' => $item->quantity,
                        'total' => $price * $item->quantity,
                    ]);

                    // Lazy deduction: KHÔNG trừ kho ở đây
                    // Stock sẽ được trừ khi:
                    // - COD: Admin xác nhận đơn (pending → confirmed)
                    // - VNPAY: IPN callback thành công (payment_status → paid)
                }

                if ($voucher) {
                    VoucherUsage::create(['voucher_id' => $voucher->id, 'user_id' => $user?->id, 'order_id' => $order->id]);
                    $voucher->increment('used_count');
                }

                OrderStatusHistory::create(['order_id' => $order->id, 'to_status' => 'pending', 'note' => 'Đơn hàng được khởi tạo.', 'changed_by' => $user?->id]);

                // Admin notification: đơn hàng mới
                AdminNotification::notify(
                    'new_order',
                    '🛒 Đơn hàng mới',
                    "#{$order->order_code} — " . ($order->shipping_name ?? 'Khách vãng lai') . ' — ' . number_format((float) $order->total_amount, 0, ',', '.') . '₫',
                    $order->id
                );

                if ($user && !$request->filled('shipping_address_id') && $request->boolean('save_address')) {
                    UserAddress::create([
                        'user_id' => $user->id,
                        'fullname' => $address->fullname,
                        'phone' => $address->phone,
                        'email' => $address->email ?? $user->email,
                        'province' => $address->province,
                        'district' => $address->district,
                        'ward' => $address->ward,
                        'address_detail' => $address->address_detail,
                        'is_default' => !UserAddress::where('user_id', $user->id)->exists(),
                    ]);
                }

                // 8. Xóa giỏ hàng
                if (!$request->boolean('is_buy_now')) {
                    $cartQuery = Cart::query();
                    if ($user) {
                        $cartQuery->where('user_id', $user->id);
                    } else {
                        $sessionId = $request->header('X-Session-ID') ?? $request->input('session_id');
                        $cartQuery->where('session_id', $sessionId)->whereNull('user_id');
                    }

                    if ($request->filled('items')) {
                        $cartQuery->whereIn('variant_id', collect($request->items)->pluck('variant_id'));
                    }
                    $cartQuery->delete();
                }

                $paymentUrl = ($order->payment_method === 'vnpay') ? $this->buildVnpayRedirectUrl($order, $request) : null;

                return response()->json([
                    'status' => 'success',
                    'message' => $paymentUrl ? 'Chuyển hướng đến cổng thanh toán' : 'Đặt hàng thành công!',
                    'data' => [
                        'order_id' => $order->id,
                        'order_code' => $order->order_code,
                        'status' => $order->status,
                        'total_amount' => $order->total_amount,
                        'payment_method' => $order->payment_method,
                        'payment_url' => $paymentUrl,
                    ],
                ], 201);
            });
        } catch (\App\Exceptions\StockException $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 409);
        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => 'Lỗi: ' . $e->getMessage()], 500);
        }
    }

    public function createVnpayPayment(CheckoutRequest $request)
    {
        $user = auth('sanctum')->user();
        if ($request->payment_method !== 'vnpay') {
            return response()->json(['status' => 'error', 'message' => 'Phương thức thanh toán phải là VNPAY.'], 400);
        }

        $cartItems = Cart::with(['product', 'variant'])->where('user_id', $user->id)->get();
        if ($cartItems->isEmpty()) {
            return response()->json(['status' => 'error', 'message' => 'Giỏ hàng trống.'], 400);
        }

        $address = UserAddress::where('id', $request->shipping_address_id)->where('user_id', $user->id)->first();
        if (!$address) {
            return response()->json(['status' => 'error', 'message' => 'Địa chỉ không hợp lệ.'], 403);
        }

        try {
            $order = collect();
            $result = DB::transaction(function () use ($user, $cartItems, $address, $request, &$order) {
                $variantIds = $cartItems->pluck('variant_id')->filter()->unique()->toArray();
                $lockedVariants = ProductVariant::with('attributes')->whereIn('id', $variantIds)->lockForUpdate()->get();

                $subtotal = 0;
                foreach ($cartItems as $item) {
                    $effectivePrice = $this->resolvePrice($item, $lockedVariants);
                    $subtotal += $effectivePrice * $item->quantity;
                }

                // Lazy deduction: validate stock nhưng KHÔNG trừ kho
                foreach ($cartItems as $item) {
                    if (!$item->variant_id)
                        continue;
                    $variant = $lockedVariants->find($item->variant_id);
                    if (!$variant || !$variant->is_active) {
                        throw new \Exception("Sản phẩm \"{$item->product->name}\" hiện không còn bán.");
                    }
                    if ($variant->quantity < $item->quantity) {
                        throw new \Exception("Sản phẩm \"{$item->product->name}\" chỉ còn {$variant->quantity} trong kho.");
                    }
                }

                $shippingFee = $subtotal >= 500000 ? 0 : 30000;
                $voucherDiscount = 0;
                $voucher = null;

                if ($request->filled('voucher_code')) {
                    $voucher = Voucher::where('code', $request->voucher_code)->where('is_active', true)
                        ->where('start_date', '<=', now())->where('end_date', '>=', now())->lockForUpdate()->first();
                    if (!$voucher) {
                        throw new \Exception('Mã giảm giá không hợp lệ hoặc đã hết hạn.');
                    }
                    if ($subtotal < $voucher->min_order_amount) {
                        throw new \Exception('Đơn hàng chưa đạt mức tối thiểu.');
                    }

                    if ($voucher->discount_type === 'percent') {
                        $discount = $subtotal * ($voucher->discount_value / 100);
                        if ($voucher->max_discount && $discount > $voucher->max_discount) {
                            $discount = $voucher->max_discount;
                        }
                        $voucherDiscount = $discount;
                    } else {
                        $voucherDiscount = $voucher->discount_value;
                    }
                }

                $totalAmount = max(0, $subtotal + $shippingFee - $voucherDiscount);

                $order = Order::create([
                    'user_id' => $user->id,
                    'order_code' => $this->generateOrderCode(),
                    'shipping_name' => $address->fullname,
                    'shipping_phone' => $address->phone,
                    'shipping_address' => $address->address_detail . ', ' . $address->ward . ', ' . $address->district . ', ' . $address->province,
                    'subtotal' => $subtotal,
                    'discount_amount' => $voucherDiscount,
                    'shipping_fee' => $shippingFee,
                    'total_amount' => $totalAmount,
                    'status' => 'pending',
                    'payment_status' => 'unpaid',
                    'payment_method' => 'vnpay',
                    'voucher_id' => $voucher?->id,
                    'voucher_code' => $voucher?->code,
                    'voucher_discount' => $voucherDiscount,
                    'note' => $request->note,
                ]);

                foreach ($cartItems as $item) {
                    $effectivePrice = $this->resolvePrice($item, $lockedVariants);
                    $variant = $item->variant_id ? $lockedVariants->find($item->variant_id) : null;

                    // Lazy deduction: KHÔNG trừ kho — sẽ trừ trong vnpayIpn() khi thanh toán thành công

                    OrderItem::create([
                        'order_id' => $order->id,
                        'product_id' => $item->product_id,
                        'variant_id' => $item->variant_id,
                        'product_name' => $item->product->name,
                        'variant_info' => null,
                        'sku' => $variant->sku,
                        'quantity' => $item->quantity,
                        'price' => $effectivePrice,
                    ]);
                }


                if ($voucher) {
                    VoucherUsage::create(['voucher_id' => $voucher->id, 'user_id' => $user->id, 'order_id' => $order->id]);
                    $voucher->increment('used_count');
                }

                OrderStatusHistory::create(['order_id' => $order->id, 'to_status' => 'pending', 'note' => 'Khởi tạo thanh toán VNPAY']);

                // Admin notification: đơn hàng mới VNPAY
                AdminNotification::notify(
                    'new_order',
                    '🛒 Đơn hàng mới (VNPAY)',
                    "#{$order->order_code} — {$user->fullname} — " . number_format((float) $totalAmount, 0, ',', '.') . '₫',
                    $order->id
                );

                // Xóa giỏ hàng ngay khi tạo đơn
                Cart::where('user_id', $user->id)->delete();

                return $order;
            });

            // --- 2. TẠO URL VNPAY ---
            $vnp_Url = config('vnpay.vnp_Url');
            $vnp_Returnurl = config('vnpay.vnp_Returnurl');
            $vnp_TmnCode = config('vnpay.vnp_TmnCode');
            $vnp_HashSecret = config('vnpay.vnp_HashSecret');

            $vnp_TxnRef = $result->order_code;
            $vnp_OrderInfo = 'Thanh toan don hang ' . $result->order_code;
            $vnp_OrderType = 'billpayment';
            $vnp_Amount = $result->total_amount * 100;
            $vnp_Locale = 'vn';
            $vnp_IpAddr = $request->ip();

            $inputData = [
                'vnp_Version' => '2.1.0',
                'vnp_TmnCode' => $vnp_TmnCode,
                'vnp_Amount' => $vnp_Amount,
                'vnp_Command' => 'pay',
                'vnp_CreateDate' => date('YmdHis'),
                'vnp_CurrCode' => 'VND',
                'vnp_IpAddr' => $vnp_IpAddr,
                'vnp_Locale' => $vnp_Locale,
                'vnp_OrderInfo' => $vnp_OrderInfo,
                'vnp_OrderType' => $vnp_OrderType,
                'vnp_ReturnUrl' => $vnp_Returnurl,
                'vnp_TxnRef' => $vnp_TxnRef,
            ];

            ksort($inputData);
            $query = '';
            $i = 0;
            $hashdata = '';
            foreach ($inputData as $key => $value) {
                if ($i == 1) {
                    $hashdata .= '&' . urlencode($key) . '=' . urlencode($value);
                } else {
                    $hashdata .= urlencode($key) . '=' . urlencode($value);
                    $i = 1;
                }
                $query .= urlencode($key) . '=' . urlencode($value) . '&';
            }

            $vnp_Url = $vnp_Url . '?' . $query;
            if (isset($vnp_HashSecret)) {
                $vnpSecureHash = hash_hmac('sha512', $hashdata, $vnp_HashSecret);
                $vnp_Url .= 'vnp_SecureHash=' . $vnpSecureHash;
            }

            return response()->json([
                'status' => 'success',
                'message' => 'Chuyển hướng đến cổng thanh toán',
                'payment_url' => $vnp_Url,
                'data' => $result->only('id', 'order_code', 'total_amount'),
            ], 200);

        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }
    }

    // =========================================================================
    // GET /api/payment/vnpay-ipn — VNPAY Webhook (Dùng để update trạng thái DB)
    // Lazy deduction: TRỪ KHO tại đây khi thanh toán thành công
    // =========================================================================
    public function vnpayIpn(\Illuminate\Http\Request $request)
    {
        $inputData = [];
        foreach ($request->all() as $key => $value) {
            if (substr($key, 0, 4) == 'vnp_') {
                $inputData[$key] = $value;
            }
        }

        $vnp_SecureHash = $inputData['vnp_SecureHash'] ?? '';
        unset($inputData['vnp_SecureHash'], $inputData['vnp_SecureHashType']);
        ksort($inputData);

        $hashData = '';
        foreach ($inputData as $key => $value) {
            $hashData .= ($hashData === '' ? '' : '&') . urlencode($key) . '=' . urlencode($value);
        }

        $secureHash = hash_hmac('sha512', $hashData, config('vnpay.vnp_HashSecret'));

        if ($secureHash == $vnp_SecureHash) {
            $order = Order::where('order_code', $inputData['vnp_TxnRef'])->first();
            if ($order && $order->total_amount == $inputData['vnp_Amount'] / 100) {
                if ($order->payment_status == 'unpaid') {
                    if ($inputData['vnp_ResponseCode'] == '00') {
                        // ===================================================================
                        // VNPAY thanh toán thành công → TRỪ KHO (Lazy Deduction)
                        // Race condition: nếu hết hàng → cancel đơn + đánh dấu hoàn tiền
                        // ===================================================================
                        $this->processVnpaySuccessPayment($order, $inputData['vnp_TransactionNo'] ?? '');
                        return response()->json(['RspCode' => '00', 'Message' => 'Confirm Success']);
                    } else {
                        $order->update(['payment_status' => 'unpaid']);
                        OrderStatusHistory::create(['order_id' => $order->id, 'to_status' => $order->status, 'note' => 'Thanh toán VNPAY thất bại. Đơn vẫn ở trạng thái chưa thanh toán.']);
                    }

                    return response()->json(['RspCode' => '00', 'Message' => 'Confirm Success']);
                }

                return response()->json(['RspCode' => '02', 'Message' => 'Order already confirmed']);
            }

            return response()->json(['RspCode' => '01', 'Message' => 'Order not found']);
        }

        return response()->json(['RspCode' => '97', 'Message' => 'Invalid signature']);
    }

    public function vnpayReturn(\Illuminate\Http\Request $request)
    {
        $inputData = [];
        foreach ($request->all() as $key => $value) {
            if (substr($key, 0, 4) == 'vnp_') {
                $inputData[$key] = $value;
            }
        }
        $vnp_SecureHash = $inputData['vnp_SecureHash'] ?? '';
        unset($inputData['vnp_SecureHash'], $inputData['vnp_SecureHashType']);
        ksort($inputData);
        $hashData = '';
        foreach ($inputData as $key => $value) {
            $hashData .= ($hashData === '' ? '' : '&') . urlencode($key) . '=' . urlencode($value);
        }

        if (hash_hmac('sha512', $hashData, config('vnpay.vnp_HashSecret')) == $vnp_SecureHash) {
            if ($request->vnp_ResponseCode == '00') {
                $order = Order::where('order_code', $request->vnp_TxnRef)->first();

                if ($order) {
                    // ===================================================================
                    // FALLBACK: Nếu IPN chưa xử lý (payment_status vẫn unpaid),
                    // xử lý thanh toán + kiểm tra stock ngay tại đây
                    // ===================================================================
                    if ($order->payment_status === 'unpaid') {
                        $this->processVnpaySuccessPayment($order, $request->vnp_TransactionNo ?? '');
                    }

                    // Reload order sau khi xử lý
                    $order->refresh();

                    // Kiểm tra xem đơn hàng có bị cancel vì hết hàng không (race condition)
                    if ($order->status === 'cancelled' && $order->cancelled_reason === 'out_of_stock_after_payment') {
                        return response()->json([
                            'status' => 'stock_depleted',
                            'message' => 'Rất tiếc, sản phẩm đã hết hàng trong lúc bạn thanh toán. Chúng tôi sẽ hoàn tiền lại cho bạn trong thời gian sớm nhất.',
                            'data' => $request->all(),
                            'order_id' => $order->id,
                            'order_code' => $order->order_code,
                        ]);
                    }
                }

                return response()->json(['status' => 'success', 'message' => 'Giao dịch thành công', 'data' => $request->all()]);
            }

            return response()->json(['status' => 'error', 'message' => 'Giao dịch lỗi', 'data' => $request->all()], 400);
        }

        return response()->json(['status' => 'error', 'message' => 'Chữ ký không hợp lệ'], 400);
    }

    // =========================================================================
    // POST /api/client/checkout/verify-vnpay-payment
    // Xác minh thanh toán VNPAY — KHÔNG cần VNPAY signature
    // Chỉ cần auth + order_code + vnp_TransactionNo
    // Dùng làm FALLBACK khi IPN/return bị lỗi signature do encoding
    // =========================================================================
    public function verifyVnpayPayment(\Illuminate\Http\Request $request)
    {
        $user = auth('sanctum')->user();
        $orderCode = $request->input('order_code');
        $transactionNo = $request->input('transaction_no', '');

        if (!$orderCode) {
            return response()->json(['status' => 'error', 'message' => 'Thiếu mã đơn hàng.'], 400);
        }

        $order = Order::where('order_code', $orderCode)
            ->where('user_id', $user->id)
            ->where('payment_method', 'vnpay')
            ->first();

        if (!$order) {
            return response()->json(['status' => 'error', 'message' => 'Đơn hàng không tồn tại.'], 404);
        }

        // Nếu chưa xử lý → xử lý payment + check stock
        if ($order->payment_status === 'unpaid') {
            $this->processVnpaySuccessPayment($order, $transactionNo);
            $order->refresh();
        }

        // Trả về trạng thái thực tế
        if ($order->status === 'cancelled' && $order->cancelled_reason === 'out_of_stock_after_payment') {
            return response()->json([
                'status' => 'stock_depleted',
                'message' => 'Rất tiếc, sản phẩm đã hết hàng trong lúc bạn thanh toán. Chúng tôi sẽ hoàn tiền lại cho bạn trong thời gian sớm nhất.',
                'order_id' => $order->id,
                'order_code' => $order->order_code,
                'payment_status' => $order->payment_status,
            ]);
        }

        return response()->json([
            'status' => $order->payment_status === 'paid' ? 'success' : 'pending',
            'message' => $order->payment_status === 'paid' ? 'Thanh toán thành công' : 'Đơn hàng đang chờ xử lý',
            'order_id' => $order->id,
            'order_code' => $order->order_code,
            'payment_status' => $order->payment_status,
            'order_status' => $order->status,
        ]);
    }

    // =========================================================================
    // Xử lý thanh toán VNPAY thành công: set paid, kiểm tra stock, trừ kho hoặc cancel
    // Được gọi từ cả vnpayIpn() và vnpayReturn() (fallback)
    // Idempotent: nếu đã xử lý rồi thì skip
    // =========================================================================
    private function processVnpaySuccessPayment(Order $order, string $transactionNo): bool
    {
        $stockDepleted = false;

        DB::transaction(function () use ($order, $transactionNo, &$stockDepleted) {
            // Lock order để tránh xử lý trùng lặp (IPN + Return chạy đồng thời)
            $freshOrder = Order::where('id', $order->id)->lockForUpdate()->first();
            if (!$freshOrder) return;

            // Đã xử lý rồi (idempotent) → chỉ check kết quả
            if ($freshOrder->payment_status !== 'unpaid') {
                $stockDepleted = ($freshOrder->status === 'cancelled'
                    && $freshOrder->cancelled_reason === 'out_of_stock_after_payment');
                return;
            }

            // 1. Đánh dấu đã thanh toán
            $freshOrder->update(['payment_status' => 'paid']);
            OrderStatusHistory::create([
                'order_id' => $freshOrder->id,
                'to_status' => $freshOrder->status,
                'note' => 'Thanh toán VNPAY thành công. Mã GD: ' . $transactionNo,
            ]);

            // 2. Kiểm tra stock
            $orderItems = $freshOrder->items()->with('variant')->get();
            $stockIssues = [];

            foreach ($orderItems as $item) {
                if (!$item->variant_id) continue;

                $variant = ProductVariant::where('id', $item->variant_id)
                    ->lockForUpdate()
                    ->first();

                if (!$variant || $variant->quantity < $item->quantity) {
                    $stockIssues[] = [
                        'product_name' => $item->product_name,
                        'variant_id' => $item->variant_id,
                        'needed' => $item->quantity,
                        'available' => $variant ? $variant->quantity : 0,
                    ];
                }
            }

            if (!empty($stockIssues)) {
                // =====================================================
                // HẾT HÀNG → Cancel đơn + đánh dấu cần hoàn tiền
                // =====================================================
                $stockDepleted = true;
                $issueDetails = collect($stockIssues)->map(function ($issue) {
                    return "{$issue['product_name']} (cần {$issue['needed']}, còn {$issue['available']})";
                })->implode(', ');

                $freshOrder->update([
                    'status' => 'cancelled',
                    'cancelled_at' => now(),
                    'cancelled_reason' => 'out_of_stock_after_payment',
                    'admin_note' => 'HẾT HÀNG SAU THANH TOÁN VNPAY: ' . $issueDetails . '. Cần hoàn tiền cho khách.',
                ]);

                OrderStatusHistory::create([
                    'order_id' => $freshOrder->id,
                    'from_status' => 'pending',
                    'to_status' => 'cancelled',
                    'note' => 'Hệ thống tự động hủy: sản phẩm đã hết hàng trong lúc khách thanh toán VNPAY. ' . $issueDetails,
                ]);

                // Hoàn trả voucher nếu có
                if ($freshOrder->voucher_id) {
                    Voucher::where('id', $freshOrder->voucher_id)
                        ->where('used_count', '>', 0)
                        ->decrement('used_count');
                    VoucherUsage::where('voucher_id', $freshOrder->voucher_id)
                        ->where('order_id', $freshOrder->id)
                        ->delete();
                }

                AdminNotification::notify(
                    'stock_issue_vnpay',
                    '⚠️ VNPAY đã thanh toán nhưng hết hàng — cần hoàn tiền',
                    "Đơn #{$freshOrder->order_code}: {$issueDetails}. Đơn đã tự động hủy, cần xử lý hoàn tiền cho khách.",
                    $freshOrder->id
                );
            } else {
                // =====================================================
                // ĐỦ STOCK → Trừ kho bình thường
                // =====================================================
                foreach ($orderItems as $item) {
                    if (!$item->variant_id) continue;

                    $variant = ProductVariant::where('id', $item->variant_id)
                        ->lockForUpdate()
                        ->first();

                    if ($variant) {
                        $variant->decrement('quantity', $item->quantity);
                        Product::where('id', $item->product_id)
                            ->where('quantity', '>=', $item->quantity)
                            ->decrement('quantity', $item->quantity);
                    }
                }
            }
        });

        $order->refresh();
        return $stockDepleted;
    }

    private function resolvePrice($item, $lockedVariants): float
    {
        if ($item->variant_id) {
            $variant = $lockedVariants->get($item->variant_id);
            if ($variant) {
                return (float) ($variant->sale_price ?? $variant->price);
            }
        }

        return (float) ($item->product->sale_price ?? $item->product->price);
    }

    private function calculateShippingFee(float $subtotal): float
    {
        return $subtotal >= 500000 ? 0 : 30000;
    }

    private function generateOrderCode(): string
    {
        do {
            $code = 'SL-' . now()->format('Ymd') . '-' . strtoupper(Str::random(8));
        } while (Order::where('order_code', $code)->exists());

        return $code;
    }

    private function buildVnpayRedirectUrl(Order $order, \Illuminate\Http\Request $request): string
    {
        $vnpTmnCode = config('vnpay.vnp_TmnCode');
        $vnpHashSecret = config('vnpay.vnp_HashSecret');
        $vnpUrl = config('vnpay.vnp_Url');
        $vnpReturnUrl = config('vnpay.vnp_Returnurl');

        $vnp_IpAddr = $request->ip();
        if ($vnp_IpAddr === '::1') {
            $vnp_IpAddr = '127.0.0.1';
        }

        $inputData = [
            'vnp_Version' => '2.1.0',
            'vnp_TmnCode' => $vnpTmnCode,
            'vnp_Amount' => (int) ($order->total_amount * 100),
            'vnp_Command' => 'pay',
            'vnp_CreateDate' => date('YmdHis'),
            'vnp_CurrCode' => 'VND',
            'vnp_IpAddr' => $vnp_IpAddr,
            'vnp_Locale' => 'vn',
            'vnp_OrderInfo' => 'Thanh toan don hang ' . $order->order_code,
            'vnp_OrderType' => 'billpayment',
            'vnp_ReturnUrl' => $vnpReturnUrl,
            'vnp_TxnRef' => $order->order_code,
        ];

        ksort($inputData);
        $query = '';
        $i = 0;
        $hashdata = '';

        foreach ($inputData as $key => $value) {
            if ($i == 1) {
                $hashdata .= '&' . urlencode($key) . '=' . urlencode($value);
            } else {
                $hashdata .= urlencode($key) . '=' . urlencode($value);
                $i = 1;
            }
            $query .= urlencode($key) . '=' . urlencode($value) . '&';
        }

        $vnpUrl .= '?' . $query;
        if (!empty($vnpHashSecret)) {
            $vnpSecureHash = hash_hmac('sha512', $hashdata, $vnpHashSecret);
            $vnpUrl .= 'vnp_SecureHash=' . $vnpSecureHash;
        }

        return $vnpUrl;
    }

    private function applyVoucher(string $code, float $subtotal, ?int $userId, $cartItems = null): array
    {
        $voucher = Voucher::where('code', strtoupper(trim($code)))->first();
        if (!$voucher || !$voucher->is_active) {
            throw new \App\Exceptions\StockException('Voucher không tồn tại hoặc đã bị vô hiệu hóa.');
        }
        if (now()->lt($voucher->start_date) || now()->gt($voucher->end_date)) {
            throw new \App\Exceptions\StockException('Voucher đã hết hạn sử dụng.');
        }
        if ($subtotal < $voucher->min_order_amount) {
            $formatted = number_format($voucher->min_order_amount, 0, ',', '.');
            throw new \App\Exceptions\StockException("Đơn hàng chưa đạt giá trị tối thiểu {$formatted}₫ để áp dụng voucher.");
        }

        if ($voucher->quantity !== null && $voucher->used_count >= $voucher->quantity) {
            throw new \App\Exceptions\StockException('Voucher đã hết lượt sử dụng.');
        }

        if ($userId && $voucher->usage_limit_per_user !== null) {
            $userUsedCount = VoucherUsage::where('voucher_id', $voucher->id)
                ->where('user_id', $userId)->count();
            if ($userUsedCount >= $voucher->usage_limit_per_user) {
                throw new \App\Exceptions\StockException('Bạn đã hết lượt sử dụng voucher này.');
            }
        }

        if ($cartItems && $cartItems->isNotEmpty()) {
            if ($voucher->product_id) {
                $hasMatchingProduct = $cartItems->contains(function ($item) use ($voucher) {
                    $productId = $item->product_id ?? ($item->product->id ?? null);
                    return $productId == $voucher->product_id;
                });
                if (!$hasMatchingProduct) {
                    $productName = $voucher->product?->name ?? 'sản phẩm chỉ định';
                    throw new \App\Exceptions\StockException("Voucher chỉ áp dụng cho {$productName}.");
                }
            }

            if ($voucher->category_id) {
                $hasMatchingCategory = $cartItems->contains(function ($item) use ($voucher) {
                    $categoryId = $item->product->category_id ?? null;
                    return $categoryId == $voucher->category_id;
                });
                if (!$hasMatchingCategory) {
                    $categoryName = $voucher->category?->name ?? 'danh mục chỉ định';
                    throw new \App\Exceptions\StockException("Voucher chỉ áp dụng cho danh mục {$categoryName}.");
                }
            }
        }

        $discount = ($voucher->discount_type === 'percent')
            ? ($subtotal * $voucher->discount_value / 100)
            : $voucher->discount_value;

        if ($voucher->max_discount && $discount > $voucher->max_discount) {
            $discount = $voucher->max_discount;
        }

        return [$voucher, $discount];
    }
}

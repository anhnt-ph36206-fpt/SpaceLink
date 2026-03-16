<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Http\Requests\CheckoutRequest;
use App\Models\Cart;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusHistory;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Product;
use App\Models\UserAddress;
use App\Models\Voucher;
use App\Models\VoucherUsage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CheckoutController extends Controller
{
    public function checkVoucher(CheckoutRequest $request)
    {
        $user = auth('sanctum')->user();
        if (! $request->filled('voucher_code')) {
            return response()->json(['status' => 'error', 'message' => 'Vui lòng nhập mã voucher.'], 400);
        }

        if ($request->filled('items')) {
            $cartItems = collect($request->items)->map(function ($item) {
                $variant = ProductVariant::with('product')->find($item['variant_id']);
                if (! $variant) return null;
                return (object) ['variant_id' => $variant->id, 'quantity' => (int) $item['quantity'], 'product' => $variant->product];
            })->filter();
        } else {
            if (! $user) return response()->json(['status' => 'error', 'message' => 'Vui lòng đăng nhập.'], 401);
            $cartItems = Cart::with(['product', 'variant'])->where('user_id', $user->id)->get();
        }

        if ($cartItems->isEmpty()) return response()->json(['status' => 'error', 'message' => 'Giỏ hàng trống.'], 400);

        $subtotal = $cartItems->sum(function ($item) {
            if ($item instanceof Cart) {
                return (float) ($item->variant?->sale_price ?? $item->variant?->price ?? $item->product->sale_price ?? $item->product->price) * $item->quantity;
            }
            $v = ProductVariant::find($item->variant_id);
            return (float) ($v?->sale_price ?? $v?->price ?? $item->product?->sale_price ?? $item->product?->price) * $item->quantity;
        });

        try {
            [$voucher, $discount] = $this->applyVoucher($request->voucher_code, $subtotal, $user?->id);
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
                if (!$variant) return null;
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
                if (!$sessionId) return response()->json(['status' => 'error', 'message' => 'Vui lòng đăng nhập hoặc cung cấp Session ID.'], 400);
                $query->where('session_id', $sessionId)->whereNull('user_id');
            }
            $cartItems = $query->get();
        }

        if ($cartItems->isEmpty()) return response()->json(['status' => 'error', 'message' => 'Danh sách sản phẩm trống.'], 400);

        // 2. Shipping Address
        $address = null;
        if ($request->filled('shipping_address_id')) {
            if (!$user) return response()->json(['status' => 'error', 'message' => 'Vui lòng đăng nhập để sử dụng địa chỉ đã lưu.'], 401);
            $address = UserAddress::where('id', $request->shipping_address_id)->where('user_id', $user->id)->first();
            if (!$address) return response()->json(['status' => 'error', 'message' => 'Địa chỉ không hợp lệ.'], 403);
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
                // 3. Stock Lock
                $variantIds = $cartItems->pluck('variant_id')->filter()->unique()->toArray();
                $lockedVariants = ProductVariant::with('attributes')->whereIn('id', $variantIds)->lockForUpdate()->get()->keyBy('id');

                foreach ($cartItems as $item) {
                    if (!$item->variant_id) continue;
                    $variant = $lockedVariants->get($item->variant_id);
                    if (!$variant || !$variant->is_active) throw new \App\Exceptions\StockException("Sản phẩm \"{$item->product->name}\" hiện không còn bán.");
                    if ($variant->quantity < $item->quantity) throw new \App\Exceptions\StockException("Sản phẩm \"{$item->product->name}\" không đủ tồn kho.");
                }

                // 4. Financials
                $subtotal = $cartItems->sum(fn($i) => $this->resolvePrice($i, $lockedVariants) * $i->quantity);
                $shippingFee = $this->calculateShippingFee($subtotal);
                $voucher = null; $discountValue = 0;
                if ($request->filled('voucher_code')) {
                    [$voucher, $discountValue] = $this->applyVoucher($request->voucher_code, $subtotal, $user?->id);
                }
                $totalAmount = max(0, $subtotal + $shippingFee - $discountValue);

                // 5. Create Order
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

                // 6. OrderItems & Inventory
                foreach ($cartItems as $item) {
                    $price = $this->resolvePrice($item, $lockedVariants);
                    $variant = $item->variant_id ? $lockedVariants->get($item->variant_id) : null;
                    $variantInfo = $variant ? [
                        'sku' => $variant->sku,
                        'image' => $variant->image,
                        'attrs' => $variant->attributes?->map(fn($a) => ['name' => $a->name, 'value' => $a->pivot->value])->toArray(),
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

                    // Trừ tồn kho variant
                    if ($item->variant_id) {
                        ProductVariant::where('id', $item->variant_id)->decrement('quantity', $item->quantity);
                    }

                    // Trừ tồn kho tổng của product (luôn thực hiện)
                    Product::where('id', $item->product_id)
                        ->decrement('quantity', $item->quantity);
                }

                if ($voucher) {
                    VoucherUsage::create(['voucher_id' => $voucher->id, 'user_id' => $user?->id, 'order_id' => $order->id]);
                    $voucher->increment('used_count');
                }

                OrderStatusHistory::create(['order_id' => $order->id, 'to_status' => 'pending', 'note' => 'Đơn hàng được khởi tạo.', 'changed_by' => $user?->id]);

                if ($user && !$request->filled('shipping_address_id') && $request->boolean('save_address')) {
                    UserAddress::create([
                        'user_id' => $user->id, 'fullname' => $address->fullname, 'phone' => $address->phone,
                        'email' => $address->email ?? $user->email, 'province' => $address->province,
                        'district' => $address->district, 'ward' => $address->ward, 'address_detail' => $address->address_detail,
                        'is_default' => !UserAddress::where('user_id', $user->id)->exists(),
                    ]);
                }

                // 7. Xóa giỏ hàng (Guest hoặc User)
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

        // Tái sử dụng logic tạo Order ở trên (nhưng gọi ẩn hoặc copy một phần)
        // Dưới đây giả định ta gọi hàm checkout gốc để lấy response (JSON) chứa id đơn hàng,
        // Nhưng do checkout gốc trả về Response, ta cần lấy dữ liệu hoặc tách logic createOrder ra hàm riêng.

        // --- 1. Copy logic check order tương tự hàm checkout() ---
        $cartItems = Cart::with(['product', 'variant'])->where('user_id', $user->id)->get();
        if ($cartItems->isEmpty()) return response()->json(['status' => 'error', 'message' => 'Giỏ hàng trống.'], 400);

        $address = UserAddress::where('id', $request->shipping_address_id)->where('user_id', $user->id)->first();
        if (!$address) return response()->json(['status' => 'error', 'message' => 'Địa chỉ không hợp lệ.'], 403);

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

                $shippingFee = $subtotal >= 500000 ? 0 : 30000;
                $voucherDiscount = 0;
                $voucher = null;

                if ($request->filled('voucher_code')) {
                    $voucher = Voucher::where('code', $request->voucher_code)->where('is_active', true)
                        ->where('start_date', '<=', now())->where('end_date', '>=', now())->lockForUpdate()->first();
                    if (!$voucher) throw new \Exception("Mã giảm giá không hợp lệ hoặc đã hết hạn.");
                    if ($subtotal < $voucher->min_order_amount) throw new \Exception("Đơn hàng chưa đạt mức tối thiểu.");
                    // Check usage... (giản lược trong IPN create)

                    if ($voucher->discount_type === 'percent') {
                        $discount = $subtotal * ($voucher->discount_value / 100);
                        if ($voucher->max_discount && $discount > $voucher->max_discount) $discount = $voucher->max_discount;
                        $voucherDiscount = $discount;
                    } else {
                        $voucherDiscount = $voucher->discount_value;
                    }
                }

                $totalAmount = max(0, $subtotal + $shippingFee - $voucherDiscount);

                $order = Order::create([
                    'user_id'          => $user->id,
                    'order_code'       => $this->generateOrderCode(),
                    'shipping_name'    => $address->fullname,
                    'shipping_phone'   => $address->phone,
                    'shipping_address' => $address->address_detail . ', ' . $address->ward . ', ' . $address->district . ', ' . $address->province,
                    'subtotal'         => $subtotal,
                    'discount_amount'  => $voucherDiscount,
                    'shipping_fee'     => $shippingFee,
                    'total_amount'     => $totalAmount,
                    'status'           => 'pending',
                    'payment_status'   => 'unpaid',
                    'payment_method'   => 'vnpay',
                    'voucher_id'       => $voucher?->id,
                    'voucher_code'     => $voucher?->code,
                    'voucher_discount' => $voucherDiscount,
                    'note'             => $request->note,
                ]);

                foreach ($cartItems as $item) {
                    $effectivePrice = $this->resolvePrice($item, $lockedVariants);
                    $variant = $item->variant_id ? $lockedVariants->get($item->variant_id) : null;

                    if ($variant) {
                        if ($variant->quantity < $item->quantity) {
                            throw new \Exception("Sản phẩm {$item->product->name} (Biến thể ID: {$variant->id}) chỉ còn {$variant->quantity} trong kho.");
                        }
                        // Trừ tồn kho biến thể
                        $variant->decrement('quantity', $item->quantity);
                        // Trừ tồn kho tổng của product
                        Product::where('id', $item->product_id)
                            ->decrement('quantity', $item->quantity);
                    } else {
                        throw new \Exception("Vui lòng chọn phân loại sản phẩm cho {$item->product->name}.");
                    }

                    OrderItem::create([
                        'order_id'       => $order->id,
                        'product_id'     => $item->product_id,
                        'variant_id'     => $item->variant_id,
                        'product_name'   => $item->product->name,
                        'variant_name'   => 'Variant Name ' . $variant->id,
                        'variant_info'   => null,
                        'sku'            => $variant->sku,
                        'quantity'       => $item->quantity,
                        'price'          => $effectivePrice,
                    ]);
                }

                if ($voucher) {
                    VoucherUsage::create(['voucher_id' => $voucher->id, 'user_id' => $user->id, 'order_id' => $order->id]);
                    $voucher->increment('used_count');
                }

                OrderStatusHistory::create(['order_id' => $order->id, 'status' => 'pending', 'note' => 'Khởi tạo thanh toán VNPAY']);
                Cart::where('user_id', $user->id)->delete();

                return $order;
            });

            // --- 2. TẠO URL VNPAY ---
            $vnp_Url = config('vnpay.vnp_Url');
            $vnp_Returnurl = config('vnpay.vnp_Returnurl');
            $vnp_TmnCode = config('vnpay.vnp_TmnCode');
            $vnp_HashSecret = config('vnpay.vnp_HashSecret');

            $vnp_TxnRef = $result->order_code;
            $vnp_OrderInfo = "Thanh toan don hang " . $result->order_code;
            $vnp_OrderType = "billpayment";
            $vnp_Amount = $result->total_amount * 100;
            $vnp_Locale = 'vn';
            $vnp_IpAddr = $request->ip();

            $inputData = array(
                "vnp_Version" => "2.1.0",
                "vnp_TmnCode" => $vnp_TmnCode,
                "vnp_Amount" => $vnp_Amount,
                "vnp_Command" => "pay",
                "vnp_CreateDate" => date('YmdHis'),
                "vnp_CurrCode" => "VND",
                "vnp_IpAddr" => $vnp_IpAddr,
                "vnp_Locale" => $vnp_Locale,
                "vnp_OrderInfo" => $vnp_OrderInfo,
                "vnp_OrderType" => $vnp_OrderType,
                "vnp_ReturnUrl" => $vnp_Returnurl,
                "vnp_TxnRef" => $vnp_TxnRef,
            );

            ksort($inputData);
            $query = "";
            $i = 0;
            $hashdata = "";
            foreach ($inputData as $key => $value) {
                if ($i == 1) {
                    $hashdata .= '&' . urlencode($key) . "=" . urlencode($value);
                } else {
                    $hashdata .= urlencode($key) . "=" . urlencode($value);
                    $i = 1;
                }
                $query .= urlencode($key) . "=" . urlencode($value) . '&';
            }

            $vnp_Url = $vnp_Url . "?" . $query;
            if (isset($vnp_HashSecret)) {
                $vnpSecureHash = hash_hmac('sha512', $hashdata, $vnp_HashSecret);
                $vnp_Url .= 'vnp_SecureHash=' . $vnpSecureHash;
            }

            return response()->json([
                'status'  => 'success',
                'message' => 'Chuyển hướng đến cổng thanh toán',
                'payment_url' => $vnp_Url,
                'data'    => $result->only('id', 'order_code', 'total_amount')
            ], 200);

        } catch (\Exception $e) {
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], 422);
        }
    }

    // =========================================================================
    // GET /api/payment/vnpay-ipn — VNPAY Webhook (Dùng để update trạng thái DB)
    // =========================================================================
    public function vnpayIpn(\Illuminate\Http\Request $request)
    {
        $inputData = [];
        foreach ($request->all() as $key => $value) {
            if (substr($key, 0, 4) == 'vnp_') $inputData[$key] = $value;
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
                        $order->update(['payment_status' => 'paid']);
                        OrderStatusHistory::create(['order_id' => $order->id, 'to_status' => $order->status, 'note' => 'Thanh toán VNPAY thành công. Mã GD: '.$inputData['vnp_TransactionNo']]);
                    } else {
                        $order->update(['payment_status' => 'failed']);
                        OrderStatusHistory::create(['order_id' => $order->id, 'to_status' => $order->status, 'note' => 'Thanh toán VNPAY thất bại.']);
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
            if (substr($key, 0, 4) == 'vnp_') $inputData[$key] = $value;
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
                return response()->json(['status' => 'success', 'message' => 'Giao dịch thành công', 'data' => $request->all()]);
            }
            return response()->json(['status' => 'error', 'message' => 'Giao dịch lỗi', 'data' => $request->all()], 400);
        }
        return response()->json(['status' => 'error', 'message' => 'Chữ ký không hợp lệ'], 400);
    }

    private function resolvePrice($item, $lockedVariants): float
    {
        if ($item->variant_id) {
            $variant = $lockedVariants->get($item->variant_id);
            if ($variant) return (float) ($variant->sale_price ?? $variant->price);
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
        if ($vnp_IpAddr === '::1') $vnp_IpAddr = '127.0.0.1';

        $inputData = [
            'vnp_Version' => '2.1.0',
            'vnp_TmnCode' => $vnpTmnCode,
            'vnp_Amount' => (int)($order->total_amount * 100),
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
        $query = ""; $i = 0; $hashdata = "";

        foreach ($inputData as $key => $value) {
            if ($i == 1) {
                $hashdata .= '&' . urlencode($key) . "=" . urlencode($value);
            } else {
                $hashdata .= urlencode($key) . "=" . urlencode($value);
                $i = 1;
            }
            $query .= urlencode($key) . "=" . urlencode($value) . '&';
        }

        $vnpUrl .= "?" . $query;
        if (!empty($vnpHashSecret)) {
            $vnpSecureHash = hash_hmac('sha512', $hashdata, $vnpHashSecret);
            $vnpUrl .= 'vnp_SecureHash=' . $vnpSecureHash;
        }

        return $vnpUrl;
    }

    private function applyVoucher(string $code, float $subtotal, ?int $userId): array
    {
        $voucher = Voucher::where('code', strtoupper(trim($code)))->first();
        if (!$voucher || !$voucher->is_active) throw new \App\Exceptions\StockException("Voucher không tồn tại.");
        if (now()->lt($voucher->start_date) || now()->gt($voucher->end_date)) throw new \App\Exceptions\StockException("Voucher hết hạn.");
        if ($subtotal < $voucher->min_order_amount) throw new \App\Exceptions\StockException("Đơn chưa đạt tối thiểu.");
        if ($voucher->used_count >= $voucher->limit_number) throw new \App\Exceptions\StockException("Voucher hết lượt.");
        if ($userId && VoucherUsage::where('voucher_id', $voucher->id)->where('user_id', $userId)->exists()) throw new \App\Exceptions\StockException("Bạn đã dùng voucher này.");

        $discount = ($voucher->discount_type === 'percent') ? ($subtotal * $voucher->discount_value / 100) : $voucher->discount_value;
        if ($voucher->max_discount && $discount > $voucher->max_discount) $discount = $voucher->max_discount;
        return [$voucher, $discount];
    }
}

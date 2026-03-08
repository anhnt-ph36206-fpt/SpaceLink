<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Http\Requests\CheckoutRequest;
use App\Models\Cart;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\OrderStatusHistory;
use App\Models\ProductVariant;
use App\Models\UserAddress;
use App\Models\Voucher;
use App\Models\VoucherUsage;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class CheckoutController extends Controller
{
    // =========================================================================
    // POST /api/client/checkout — Đặt hàng
    // =========================================================================
    public function checkout(CheckoutRequest $request)
    {
        $user = auth('sanctum')->user();

        // ── 1. Lấy giỏ hàng của user (với eager load) ──────────────────────
        $cartItems = Cart::with(['product', 'variant'])
            ->where('user_id', $user->id)
            ->get();

        if ($cartItems->isEmpty()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Giỏ hàng của bạn đang trống.',
            ], 400);
        }

        // ── 2. Kiểm tra địa chỉ thuộc về user này ──────────────────────────
        $address = UserAddress::where('id', $request->shipping_address_id)
            ->where('user_id', $user->id)
            ->first();

        if (!$address) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Địa chỉ giao hàng không hợp lệ hoặc không thuộc về bạn.',
            ], 403);
        }

        try {
            $order = DB::transaction(function () use ($user, $cartItems, $address, $request) {

                // ── 3. PESSIMISTIC LOCK + kiểm tra tồn kho ─────────────────
                $variantIds = $cartItems->pluck('variant_id')->filter()->unique()->toArray();

                // lockForUpdate() ngăn race condition khi nhiều request đồng thời
                $lockedVariants = ProductVariant::with('attributes')
                    ->whereIn('id', $variantIds)
                    ->lockForUpdate()
                    ->get()
                    ->keyBy('id');

                foreach ($cartItems as $item) {
                    if (!$item->variant_id) continue;

                    $variant = $lockedVariants->get($item->variant_id);

                    if (!$variant || !$variant->is_active) {
                        throw new \App\Exceptions\StockException("Sản phẩm \"{$item->product->name}\" hiện không còn bán.");
                    }

                    if ($variant->quantity < $item->quantity) {
                        throw new \App\Exceptions\StockException(
                            "Sản phẩm \"{$item->product->name}\" chỉ còn {$variant->quantity} trong kho, không đủ số lượng yêu cầu ({$item->quantity})."
                        );
                    }
                }

                // ── 4. Tính subtotal từ giá DB (KHÔNG tin Frontend) ────────
                $subtotal = $cartItems->sum(function (Cart $item) use ($lockedVariants) {
                    $effectivePrice = $this->resolvePrice($item, $lockedVariants);
                    return $effectivePrice * $item->quantity;
                });

                // ── 5. Phí ship (đơn giản: flat rate, có thể tích hợp GHN sau) ──
                $shippingFee = $this->calculateShippingFee($subtotal);

                // ── 6. Xử lý Voucher ────────────────────────────────────────
                $voucher         = null;
                $discountAmount  = 0;
                $voucherDiscount = 0;

                if ($request->filled('voucher_code')) {
                    [$voucher, $voucherDiscount] = $this->applyVoucher(
                        $request->voucher_code,
                        $subtotal,
                        $user->id
                    );
                    $discountAmount = $voucherDiscount;
                }

                // ── 7. Tổng tiền cuối ───────────────────────────────────────
                $totalAmount = max(0, $subtotal + $shippingFee - $discountAmount);

                // ── 8. Tạo Order ────────────────────────────────────────────
                $order = Order::create([
                    'user_id'          => $user->id,
                    'order_code'       => $this->generateOrderCode(),
                    // Snapshot shipping từ UserAddress
                    'shipping_name'    => $address->fullname,
                    'shipping_phone'   => $address->phone,
                    'shipping_email'   => $user->email,
                    'shipping_province'=> $address->province,
                    'shipping_district'=> $address->district,
                    'shipping_ward'    => $address->ward,
                    'shipping_address' => $address->address_detail,
                    // Tài chính
                    'subtotal'         => $subtotal,
                    'discount_amount'  => $discountAmount,
                    'shipping_fee'     => $shippingFee,
                    'total_amount'     => $totalAmount,
                    // Trạng thái
                    'status'           => 'pending',
                    'payment_status'   => 'unpaid',
                    'payment_method'   => $request->payment_method,
                    // Voucher
                    'voucher_id'       => $voucher?->id,
                    'voucher_code'     => $voucher?->code,
                    'voucher_discount' => $voucherDiscount,
                    // Khác
                    'note'             => $request->note,
                ]);

                // ── 9. Tạo OrderItems + trừ tồn kho ────────────────────────
                foreach ($cartItems as $item) {
                    $effectivePrice = $this->resolvePrice($item, $lockedVariants);
                    $variant        = $item->variant_id ? $lockedVariants->get($item->variant_id) : null;

                    // Build variant_info snapshot để lưu trĩnh (không bị mất khi xóa variant về sau)
                    $variantInfo = null;
                    if ($variant) {
                        $variantInfo = [
                            'sku'   => $variant->sku,
                            'image' => $variant->image,
                            'attrs' => $variant->attributes?->map(fn($a) => [
                                'name'  => $a->name,
                                'value' => $a->pivot->value ?? null,
                            ])->toArray(),
                        ];
                    }

                    OrderItem::create([
                        'order_id'      => $order->id,
                        'product_id'    => $item->product_id,
                        'variant_id'    => $item->variant_id,
                        'product_name'  => $item->product->name,
                        'product_image' => $item->product->images->first()?->image_url ?? $variant?->image,
                        'product_sku'   => $variant?->sku ?? $item->product->sku,
                        'variant_info'  => $variantInfo ? json_encode($variantInfo) : null,
                        'price'         => $effectivePrice,
                        'quantity'      => $item->quantity,
                        'total'         => $effectivePrice * $item->quantity,
                    ]);

                    // Trừ tồn kho (chỉ khi có variant, variant-less dùng product.quantity)
                    if ($item->variant_id) {
                        ProductVariant::where('id', $item->variant_id)
                            ->decrement('quantity', $item->quantity);
                    }
                }

                // ── 10. Ghi nhận VoucherUsage + tăng used_count ─────────────
                if ($voucher) {
                    VoucherUsage::create([
                        'voucher_id' => $voucher->id,
                        'user_id'    => $user->id,
                        'order_id'   => $order->id,
                    ]);
                    $voucher->increment('used_count');
                }

                // ── 11. Tạo bản ghi lịch sử trạng thái đầu tiên ────────────
                OrderStatusHistory::create([
                    'order_id'    => $order->id,
                    'from_status' => null,
                    'to_status'   => 'pending',
                    'note'        => 'Đơn hàng được tạo.',
                    'changed_by'  => $user->id,
                ]);

                // ── 12. Xóa giỏ hàng của user ──────────────────────────────
                Cart::where('user_id', $user->id)->delete();

                return $order;
            });

            return response()->json([
                'status'  => 'success',
                'message' => 'Đặt hàng thành công!',
                'data'    => [
                    'order_id'   => $order->id,
                    'order_code' => $order->order_code,
                    'status'     => $order->status,
                    'total_amount' => $order->total_amount,
                    'payment_method' => $order->payment_method,
                ],
            ], 201);

        } catch (\App\Exceptions\StockException $e) {
            // 409 Conflict: lỗi tồn kho hoặc voucher không hợp lệ
            return response()->json([
                'status'  => 'error',
                'message' => $e->getMessage(),
            ], 409);
        } catch (\Exception $e) {
            // 500: lỗi hệ thống không xác định
            return response()->json([
                'status'  => 'error',
                'message' => 'Đã xảy ra lỗi hệ thống. Vui lòng thử lại sau.',
            ], 500);
        }
    }

    // =========================================================================
    // POST /api/client/checkout/vnpay — Sinh URL thanh toán VNPAY
    // =========================================================================
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
                        $variant->decrement('quantity', $item->quantity);
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
        $inputData = array();
        $returnData = array();
        
        foreach ($request->all() as $key => $value) {
            if (substr($key, 0, 4) == "vnp_") {
                $inputData[$key] = $value;
            }
        }

        $vnp_SecureHash = $inputData['vnp_SecureHash'] ?? '';
        unset($inputData['vnp_SecureHash']);
        unset($inputData['vnp_SecureHashType']);
        ksort($inputData);
        
        $i = 0;
        $hashData = "";
        foreach ($inputData as $key => $value) {
            if ($i == 1) {
                $hashData = $hashData . '&' . urlencode($key) . "=" . urlencode($value);
            } else {
                $hashData = $hashData . urlencode($key) . "=" . urlencode($value);
                $i = 1;
            }
        }

        $vnp_HashSecret = config('vnpay.vnp_HashSecret');
        $secureHash = hash_hmac('sha512', $hashData, $vnp_HashSecret);
        
        $vnpTranId = $inputData['vnp_TransactionNo'] ?? ''; 
        $vnp_Amount = ($inputData['vnp_Amount'] ?? 0) / 100;
        
        try {
            if ($secureHash == $vnp_SecureHash) {
                $orderCode = $inputData['vnp_TxnRef'];
                $order = Order::where('order_code', $orderCode)->first();

                if ($order != NULL) {
                    if ($order->total_amount == $vnp_Amount) {
                        if ($order->payment_status == 'unpaid') {
                            if ($inputData['vnp_ResponseCode'] == '00' && $inputData['vnp_TransactionStatus'] == '00') {
                                // Thanh toán thành công
                                $order->update(['payment_status' => 'paid']);
                                OrderStatusHistory::create([
                                    'order_id' => $order->id,
                                    'status' => $order->status,
                                    'note' => 'Đã thanh toán qua VNPAY thành công. Mã GD: ' . $vnpTranId
                                ]);
                                
                                // GỬI MAIL (Optional - nếu muốn IPN gửi Mail)
                                // if ($order->shipping_email) Mail::to($order->shipping_email)->send(new OrderPlacedMail($order));
                                
                                $returnData['RspCode'] = '00';
                                $returnData['Message'] = 'Confirm Success';
                            } else {
                                // Thanh toán thất bại
                                $order->update(['payment_status' => 'failed']);
                                OrderStatusHistory::create([
                                    'order_id' => $order->id,
                                    'status' => $order->status,
                                    'note' => 'Thanh toán VNPAY thất bại. Giao dịch bị hủy.'
                                ]);
                                
                                $returnData['RspCode'] = '00';
                                $returnData['Message'] = 'Payment Failed';
                            }
                        } else {
                            $returnData['RspCode'] = '02';
                            $returnData['Message'] = 'Order already confirmed';
                        }
                    } else {
                        $returnData['RspCode'] = '04';
                        $returnData['Message'] = 'Invalid amount';
                    }
                } else {
                    $returnData['RspCode'] = '01';
                    $returnData['Message'] = 'Order not found';
                }
            } else {
                $returnData['RspCode'] = '97';
                $returnData['Message'] = 'Invalid signature';
            }
        } catch (\Exception $e) {
            $returnData['RspCode'] = '99';
            $returnData['Message'] = 'Unknown error';
        }

        return response()->json($returnData);
    }

    // =========================================================================
    // GET /api/payment/vnpay-return — Gọi qua URL Frontend
    // =========================================================================
    public function vnpayReturn(\Illuminate\Http\Request $request)
    {
        // IPN đã lo việc cập nhật status, hàm này chỉ để check Hash và trả kết quả để Frontend hiển thị thông báo.
        $vnp_HashSecret = config('vnpay.vnp_HashSecret');
        $inputData = array();
        foreach ($request->all() as $key => $value) {
            if (substr($key, 0, 4) == "vnp_") {
                $inputData[$key] = $value;
            }
        }
        $vnp_SecureHash = $inputData['vnp_SecureHash'] ?? '';
        unset($inputData['vnp_SecureHash']);
        unset($inputData['vnp_SecureHashType']);
        ksort($inputData);
        $i = 0;
        $hashData = "";
        foreach ($inputData as $key => $value) {
            if ($i == 1) {
                $hashData = $hashData . '&' . urlencode($key) . "=" . urlencode($value);
            } else {
                $hashData = $hashData . urlencode($key) . "=" . urlencode($value);
                $i = 1;
            }
        }

        $secureHash = hash_hmac('sha512', $hashData, $vnp_HashSecret);

        if ($secureHash == $vnp_SecureHash) {
            if ($request->vnp_ResponseCode == '00') {
                return response()->json(['status' => 'success', 'message' => 'Giao dịch thành công', 'data' => $request->all()]);
            } else {
                return response()->json(['status' => 'error', 'message' => 'Giao dịch lỗi/Hủy bỏ', 'data' => $request->all()], 400);
            }
        } else {
            return response()->json(['status' => 'error', 'message' => 'Chữ ký không hợp lệ', 'data' => $request->all()], 400);
        }
    }

    // =========================================================================
    // PRIVATE HELPERS
    // =========================================================================

    /**
     * Lấy giá hiệu lực từ DB (variant > product, sale_price > price).
     */
    private function resolvePrice(Cart $item, $lockedVariants): float
    {
        if ($item->variant_id) {
            $variant = $lockedVariants->get($item->variant_id);
            if ($variant) {
                return (float) ($variant->sale_price ?? $variant->price);
            }
        }
        return (float) ($item->product->sale_price ?? $item->product->price);
    }

    /**
     * Tính phí ship đơn giản.
     * Miễn phí ship cho đơn >= 500.000 VNĐ, các đơn khác flat 30.000.
     * TODO: Tích hợp GHN / GHTK API khi cần.
     */
    private function calculateShippingFee(float $subtotal): float
    {
        return $subtotal >= 500000 ? 0 : 30000;
    }

    /**
     * Tạo mã đơn hàng duy nhất.
     * Format: SL-YYYYMMDD-XXXXXXXX (8 ký tự random hex uppercase)
     */
    private function generateOrderCode(): string
    {
        do {
            $code = 'SL-' . now()->format('Ymd') . '-' . strtoupper(Str::random(8));
        } while (Order::where('order_code', $code)->exists());

        return $code;
    }

    /**
     * Validate và áp dụng voucher.
     * Trả về [$voucher, $discountAmount].
     *
     * @throws \Exception nếu voucher không hợp lệ.
     */
    private function applyVoucher(string $code, float $subtotal, int $userId): array
    {
        $voucher = Voucher::where('code', strtoupper(trim($code)))->first();

        // Voucher tồn tại và đang active
        if (!$voucher || !$voucher->is_active) {
            throw new \App\Exceptions\StockException("Mã voucher \"{$code}\" không tồn tại hoặc đã bị vô hiệu.");
        }

        // Kiểm tra thời hạn
        $now = now();
        if ($now->lt($voucher->start_date) || $now->gt($voucher->end_date)) {
            throw new \App\Exceptions\StockException("Mã voucher \"{$code}\" đã hết hạn hoặc chưa đến ngày sử dụng.");
        }

        // Kiểm tra số lượt dùng còn lại
        if ($voucher->quantity !== null && $voucher->used_count >= $voucher->quantity) {
            throw new \App\Exceptions\StockException("Mã voucher \"{$code}\" đã hết lượt sử dụng.");
        }

        // Kiểm tra đơn tối thiểu
        if ($subtotal < $voucher->min_order_amount) {
            $minFormatted = number_format($voucher->min_order_amount, 0, ',', '.');
            throw new \App\Exceptions\StockException("Đơn hàng tối thiểu phải đạt {$minFormatted}₫ để dùng mã này.");
        }

        // Kiểm tra giới hạn sử dụng per-user
        if ($voucher->usage_limit_per_user > 0) {
            $usedByUser = VoucherUsage::where('voucher_id', $voucher->id)
                ->where('user_id', $userId)
                ->count();
            if ($usedByUser >= $voucher->usage_limit_per_user) {
                throw new \App\Exceptions\StockException("Bạn đã sử dụng mã voucher \"{$code}\" tối đa số lần cho phép.");
            }
        }

        // Tính số tiền giảm
        $discountAmount = 0;
        if ($voucher->discount_type === 'percent') {
            $discountAmount = $subtotal * ($voucher->discount_value / 100);
            // Áp dụng giới hạn giảm tối đa (nếu có)
            if ($voucher->max_discount !== null) {
                $discountAmount = min($discountAmount, (float) $voucher->max_discount);
            }
        } else {
            // fixed
            $discountAmount = min((float) $voucher->discount_value, $subtotal);
        }

        return [$voucher, round($discountAmount, 2)];
    }
}

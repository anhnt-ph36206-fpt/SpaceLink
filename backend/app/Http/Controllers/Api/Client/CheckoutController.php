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
use OpenApi\Attributes as OA;

class CheckoutController extends Controller
{
    // =========================================================================
    // POST /api/client/checkout — Đặt hàng
    // =========================================================================
    #[OA\Post(
        path: '/api/client/checkout',
        summary: 'Đặt hàng từ giỏ hàng hiện tại',
        tags: ['Client - Checkout'],
        security: [['sanctum' => []]],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['shipping_address_id', 'payment_method'],
                properties: [
                    new OA\Property(property: 'shipping_address_id', type: 'integer', description: 'ID địa chỉ giao hàng của user'),
                    new OA\Property(property: 'payment_method', type: 'string', enum: ['cod', 'vnpay', 'momo', 'bank_transfer']),
                    new OA\Property(property: 'voucher_code', type: 'string', nullable: true, description: 'Mã voucher (không bắt buộc)'),
                    new OA\Property(property: 'note', type: 'string', nullable: true, description: 'Ghi chú đơn hàng'),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 201, description: 'Đặt hàng thành công'),
            new OA\Response(response: 400, description: 'Giỏ hàng rỗng hoặc lỗi nghiệp vụ'),
            new OA\Response(response: 403, description: 'Địa chỉ không thuộc về user này'),
            new OA\Response(response: 409, description: 'Tồn kho không đủ'),
            new OA\Response(response: 422, description: 'Dữ liệu không hợp lệ'),
        ]
    )]
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

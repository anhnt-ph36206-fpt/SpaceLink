<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Http\Requests\AddToCartRequest;
use App\Http\Requests\UpdateCartRequest;
use App\Models\Cart;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CartController extends Controller
{
    // Thời gian giữ hàng: 30 phút
    private const RESERVATION_MINUTES = 30;

    // =========================================================================
    // HELPER: Xác định context (User đã login hay Guest qua Session)
    // =========================================================================
    private function getContext(Request $request): array
    {
        $user = auth('sanctum')->user();
        if ($user) {
            return ['user_id' => $user->id, 'session_id' => null];
        }
        $sessionId = $request->header('X-Session-ID') ?? $request->input('session_id');
        return ['user_id' => null, 'session_id' => $sessionId];
    }

    /**
     * Tính giá hiệu lực của 1 cart item dựa trên giá DB mới nhất (không dùng giá cứng trong cart).
     * Ưu tiên: variant.sale_price > variant.price > product.sale_price > product.price
     */
    private function getEffectivePrice(Cart $item): float
    {
        if ($item->variant) {
            return (float) ($item->variant->sale_price ?? $item->variant->price);
        }
        return (float) ($item->product->sale_price ?? $item->product->price);
    }

    // =========================================================================
    // 1. GET /api/client/cart — Lấy giỏ hàng hiện tại
    // =========================================================================
    public function index(Request $request)
    {
        $ctx = $this->getContext($request);

        if (!$ctx['user_id'] && !$ctx['session_id']) {
            return response()->json([
                'status'      => 'success',
                'data'        => [],
                'total_items' => 0,
                'total_price' => 0,
            ]);
        }

        $query = Cart::with([
            'product:id,name,slug,price,sale_price',
            'product.images',
            'variant:id,product_id,sku,price,sale_price,image,quantity',
            'variant.attributes.attributeGroup',
        ]);

        if ($ctx['user_id']) {
            $query->where('user_id', $ctx['user_id']);
        } else {
            $query->where('session_id', $ctx['session_id'])->whereNull('user_id');
        }

        $cartItems = $query->latest()->get();

        // Tính toán lại giá theo DB mới nhất
        $formattedItems = $cartItems->map(function (Cart $item) {
            $effectivePrice = $this->getEffectivePrice($item);

            $availableVariants = ProductVariant::where('product_id', $item->product_id)
                ->where('is_active', true)
                ->with('attributes.attributeGroup')
                ->get()
                ->map(function ($v) {
                    return [
                        'id' => $v->id,
                        'sku' => $v->sku,
                        'price' => (float) ($v->sale_price ?? $v->price),
                        'quantity' => $v->quantity,
                        'image' => $v->image,
                        'attributes' => $v->attributes->map(fn($a) => [
                            'id' => $a->id,
                            'group' => $a->attributeGroup?->name, // group name
                            'value' => $a->value,
                            'color_code' => $a->color_code
                        ])
                    ];
                });

            return [
                'cart_item_id'    => $item->id,
                'product_id'      => $item->product_id,
                'variant_id'      => $item->variant_id,
                'product_name'    => $item->product?->name,
                'product_slug'    => $item->product?->slug,
                'variant_sku'     => $item->variant?->sku,
                'variant_image'   => $item->variant?->image,
                'variant_attrs'   => $item->variant?->attributes->map(fn($a) => [
                    'id'   => $a->id,
                    'name' => $a->attributeGroup?->name,
                    'value' => $a->value,
                ]),
                'product_images'  => $item->product?->images,
                'effective_price' => $effectivePrice,
                'quantity'        => $item->quantity,
                'line_total'      => $effectivePrice * $item->quantity,
                // stock_available: với user item, tồn kho thực = DB quantity + phần đang hold trong giỏ này
                // (vì khi add to cart đã trừ DB quantity rồi, nên cộng lại để frontend biết max có thể đặt)
                // Guest item không trừ kho khi add, nên trả nguyên DB quantity
                'stock_available' => ($item->variant?->quantity ?? 0) + ($item->user_id ? $item->quantity : 0),
                'available_variants' => $availableVariants,
                'reserved_until'  => $item->reserved_until,
            ];
        });

        $totalPrice = $formattedItems->sum('line_total');
        $totalItems = $cartItems->sum('quantity');

        return response()->json([
            'status'      => 'success',
            'data'        => $formattedItems,
            'total_items' => $totalItems,
            'total_price' => $totalPrice,
        ]);
    }

    // =========================================================================
    // 2. POST /api/client/cart/add — Thêm sản phẩm vào giỏ
    // =========================================================================
    public function addToCart(AddToCartRequest $request)
    {
        $ctx = $this->getContext($request);

        if (!$ctx['user_id'] && !$ctx['session_id']) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Cần có User Token (Authorization) hoặc Session ID (Header X-Session-ID).',
            ], 400);
        }

        try {
            $result = DB::transaction(function () use ($request, $ctx) {
                // Backend guard: chặn thêm vào giỏ nếu user đang có đơn VNPAY chưa thanh toán
                if ($ctx['user_id']) {
                    $hasPendingVnpay = \App\Models\Order::where('user_id', $ctx['user_id'])
                        ->where('status', 'pending')
                        ->where('payment_method', 'vnpay')
                        ->where('payment_status', 'unpaid')
                        ->exists();

                    if ($hasPendingVnpay) {
                        throw new \Exception('Bạn đang có đơn hàng VNPAY chưa thanh toán. Vui lòng thanh toán hoặc hủy đơn đó trước.', 422);
                    }
                }

                // Lock variant để chống race condition
                $variant = ProductVariant::where('id', $request->variant_id)
                    ->where('is_active', true)
                    ->lockForUpdate()
                    ->first();

                if (!$variant) {
                    throw new \Exception('Biến thể sản phẩm không còn hoạt động hoặc không tồn tại.', 404);
                }

                // Kiểm tra tồn kho (sau khi đã lock row)
                if ($variant->quantity < $request->quantity) {
                    throw new \Exception("Sản phẩm chỉ còn {$variant->quantity} trong kho.", 409);
                }

                // Tìm cart item hiện tại
                $query = Cart::where('product_id', $variant->product_id)
                    ->where('variant_id', $request->variant_id);

                if ($ctx['user_id']) {
                    $query->where('user_id', $ctx['user_id']);
                } else {
                    $query->where('session_id', $ctx['session_id'])->whereNull('user_id');
                }

                $existingItem = $query->lockForUpdate()->first();
                $reservedUntil = $ctx['user_id'] ? now()->addMinutes(self::RESERVATION_MINUTES) : null;

                if ($existingItem) {
                    $newQty = $existingItem->quantity + $request->quantity;
                    if ($newQty > $variant->quantity) {
                        throw new \Exception("Số lượng vượt quá tồn kho (còn {$variant->quantity}).", 409);
                    }

                    // Tính số lượng tăng thêm (để trừ thêm vào tồn kho)
                    $addedQty = $newQty - $existingItem->quantity;

                    // Chỉ trừ tồn kho cho user đã đăng nhập
                    if ($ctx['user_id'] && $addedQty > 0) {
                        $variant->decrement('quantity', $addedQty);
                        // Trừ tồn kho product tổng
                        Product::where('id', $variant->product_id)->decrement('quantity', $addedQty);
                    }

                    $existingItem->update([
                        'quantity'       => $newQty,
                        'reserved_until' => $reservedUntil,
                    ]);
                    $existingItem->load(['product', 'variant']);
                    return ['action' => 'updated', 'item' => $existingItem];
                }

                // Chỉ trừ tồn kho cho user đã đăng nhập
                if ($ctx['user_id']) {
                    $variant->decrement('quantity', $request->quantity);
                    Product::where('id', $variant->product_id)->decrement('quantity', $request->quantity);
                }

                $newItem = Cart::create([
                    'user_id'        => $ctx['user_id'],
                    'session_id'     => $ctx['user_id'] ? null : $ctx['session_id'],
                    'product_id'     => $variant->product_id,
                    'variant_id'     => $request->variant_id,
                    'quantity'       => $request->quantity,
                    'reserved_until' => $reservedUntil,
                ]);

                $newItem->load(['product', 'variant']);
                return ['action' => 'created', 'item' => $newItem];
            });

            $message = $result['action'] === 'updated'
                ? 'Đã cập nhật số lượng trong giỏ hàng.'
                : 'Đã thêm sản phẩm vào giỏ hàng.';

            return response()->json([
                'status'  => 'success',
                'message' => $message,
                'data'    => $result['item'],
            ], $result['action'] === 'created' ? 201 : 200);

        } catch (\Exception $e) {
            $code = $e->getCode();
            $httpCode = in_array($code, [400, 404, 409, 422]) ? $code : 422;
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], $httpCode);
        }
    }

    // =========================================================================
    // 3. PUT /api/client/cart/update/{cart_item_id} — Cập nhật số lượng
    // =========================================================================
    public function updateQuantity(UpdateCartRequest $request, int $cart_item_id)
    {
        try {
            $result = DB::transaction(function () use ($request, $cart_item_id) {
                $cartItem = Cart::where('id', $cart_item_id)->lockForUpdate()->first();

                if (!$cartItem) {
                    throw new \Exception('Không tìm thấy sản phẩm trong giỏ.', 404);
                }

                if (!$this->ownsCartItem($request, $cartItem)) {
                    throw new \Exception('Không có quyền truy cập.', 403);
                }

                // Chặn thay đổi nếu variant đang thuộc đơn VNPAY chưa thanh toán
                if (!is_null($cartItem->user_id) && $cartItem->variant_id) {
                    $hasPendingVnpay = \App\Models\Order::where('user_id', $cartItem->user_id)
                        ->where('status', 'pending')
                        ->where('payment_method', 'vnpay')
                        ->where('payment_status', 'unpaid')
                        ->whereHas('items', fn ($q) => $q->where('variant_id', $cartItem->variant_id))
                        ->exists();

                    if ($hasPendingVnpay) {
                        throw new \Exception('Không thể thay đổi giỏ hàng khi đang có đơn VNPAY chờ thanh toán.', 422);
                    }
                }

                $ctx = $this->getContext($request);
                $isUserOwned = !is_null($cartItem->user_id);
                $newVariantId = $request->variant_id ?? $cartItem->variant_id;
                $newQuantity  = $request->quantity;

                // Lock variant để đọc stock mới nhất
                $variant = ProductVariant::where('id', $newVariantId)
                    ->where('product_id', $cartItem->product_id)
                    ->where('is_active', true)
                    ->lockForUpdate()
                    ->first();

                if (!$variant) {
                    throw new \Exception('Biến thể không hợp lệ hoặc đã bị vô hiệu hóa.', 400);
                }

                // Nếu là user item, tính lại tồn kho
                // Công thức: tồn kho hiện tại + qty cũ (đã hold) - qty mới
                if ($isUserOwned && $newVariantId == $cartItem->variant_id) {
                    $oldQty = $cartItem->quantity;
                    $diff = $newQuantity - $oldQty; // dương = cần giữ thêm, âm = hoàn lại một phần
                    $availableForUser = $variant->quantity + $oldQty; // thực tế còn có thể dùng

                    if ($newQuantity > $availableForUser) {
                        throw new \Exception("Sản phẩm chỉ còn {$availableForUser} trong kho.", 409);
                    }

                    // Áp dụng diff vào tồn kho
                    if ($diff > 0) {
                        $variant->decrement('quantity', $diff);
                        Product::where('id', $cartItem->product_id)->decrement('quantity', $diff);
                    } elseif ($diff < 0) {
                        $variant->increment('quantity', abs($diff));
                        Product::where('id', $cartItem->product_id)->increment('quantity', abs($diff));
                    }
                } else {
                    if ($variant->quantity < $newQuantity) {
                        throw new \Exception("Sản phẩm chỉ còn {$variant->quantity} trong kho.", 409);
                    }
                }

                // Nếu thay đổi variant_id → kiểm tra merge
                if ($newVariantId != $cartItem->variant_id) {
                    $query = Cart::where('product_id', $cartItem->product_id)
                        ->where('variant_id', $newVariantId)
                        ->where('id', '!=', $cartItem->id)
                        ->lockForUpdate();

                    if ($ctx['user_id']) {
                        $query->where('user_id', $ctx['user_id']);
                    } else {
                        $query->where('session_id', $ctx['session_id'])->whereNull('user_id');
                    }

                    $alreadyInCart = $query->first();

                    if ($alreadyInCart) {
                        // Hoàn lại tồn kho của item cũ (nếu là user)
                        if ($isUserOwned) {
                            $variant->increment('quantity', $cartItem->quantity);
                            Product::where('id', $cartItem->product_id)->increment('quantity', $cartItem->quantity);
                        }
                        $totalNewQty = min($alreadyInCart->quantity + $newQuantity, $variant->quantity);
                        $alreadyInCart->update([
                            'quantity'       => $totalNewQty,
                            'reserved_until' => $isUserOwned ? now()->addMinutes(self::RESERVATION_MINUTES) : null,
                        ]);
                        $cartItem->delete();
                        return ['merged' => true, 'item' => $alreadyInCart->load(['product', 'variant'])];
                    }
                }

                $cartItem->update([
                    'variant_id'     => $newVariantId,
                    'quantity'       => $newQuantity,
                    'reserved_until' => $isUserOwned ? now()->addMinutes(self::RESERVATION_MINUTES) : null,
                ]);
                return ['merged' => false, 'item' => $cartItem->fresh(['product', 'variant'])];
            });

            return response()->json([
                'status'  => 'success',
                'message' => $result['merged'] ? 'Đã gộp sản phẩm vào dòng hiện có.' : 'Đã cập nhật giỏ hàng.',
                'data'    => $result['item'],
                'merged'  => $result['merged'],
            ]);

        } catch (\Exception $e) {
            $code     = $e->getCode();
            $httpCode = in_array($code, [400, 403, 404, 409]) ? $code : 422;
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], $httpCode);
        }
    }

    // =========================================================================
    // 4. DELETE /api/client/cart/remove/{cart_item_id} — Xóa 1 item
    // =========================================================================
    public function remove(Request $request, int $cart_item_id)
    {
        try {
            $result = DB::transaction(function () use ($request, $cart_item_id) {
                $cartItem = Cart::lockForUpdate()->find($cart_item_id);

                if (!$cartItem) {
                    throw new \Exception('Không tìm thấy sản phẩm trong giỏ.', 404);
                }

                if (!$this->ownsCartItem($request, $cartItem)) {
                    throw new \Exception('Không có quyền xóa.', 403);
                }

                // Hoàn lại tồn kho CHỈ khi item thuộc user (đã trừ kho lúc add)
                // VÀ variant này KHÔNG thuộc đơn VNPAY đang chờ thanh toán.
                // Nếu có pending VNPAY order → SKIP hoàn kho ở đây;
                // cancel() sẽ hoàn kho khi user hủy đơn.
                if (!is_null($cartItem->user_id) && $cartItem->variant_id) {
                    $hasPendingVnpay = \App\Models\Order::where('user_id', $cartItem->user_id)
                        ->where('status', 'pending')
                        ->where('payment_method', 'vnpay')
                        ->where('payment_status', 'unpaid')
                        ->whereHas('items', fn ($q) => $q->where('variant_id', $cartItem->variant_id))
                        ->exists();

                    if (!$hasPendingVnpay) {
                        // Không có pending VNPAY → hoàn kho bình thường
                        $variant = ProductVariant::lockForUpdate()->find($cartItem->variant_id);
                        if ($variant) {
                            $variant->increment('quantity', $cartItem->quantity);
                        }
                        Product::where('id', $cartItem->product_id)->increment('quantity', $cartItem->quantity);
                    }
                    // Có pending VNPAY → không hoàn kho; cancel() sẽ xử lý
                }
                // Guest item: không hoàn kho vì chưa trừ kho lúc thêm vào giỏ

                $cartItem->delete();
                return true;
            });

            return response()->json(['status' => 'success', 'message' => 'Đã xóa sản phẩm khỏi giỏ hàng.']);
        } catch (\Exception $e) {
            $code     = $e->getCode();
            $httpCode = in_array($code, [403, 404]) ? $code : 500;
            return response()->json(['status' => 'error', 'message' => $e->getMessage()], $httpCode);
        }
    }

    // =========================================================================
    // 5. DELETE /api/client/cart/clear — Xóa toàn bộ giỏ hàng
    // =========================================================================
    public function clear(Request $request)
    {
        $ctx = $this->getContext($request);

        if (!$ctx['user_id'] && !$ctx['session_id']) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Cần có User Token hoặc Session ID.',
            ], 400);
        }

        $query = Cart::query();
        if ($ctx['user_id']) {
            $query->where('user_id', $ctx['user_id']);
        } else {
            $query->where('session_id', $ctx['session_id'])->whereNull('user_id');
        }

        // Hoàn lại tồn kho nếu là user
        if ($ctx['user_id']) {
            DB::transaction(function () use ($query) {
                $items = (clone $query)->with('variant')->get();
                foreach ($items as $item) {
                    if ($item->variant_id && $item->variant) {
                        $item->variant->increment('quantity', $item->quantity);
                    }
                    Product::where('id', $item->product_id)->increment('quantity', $item->quantity);
                }
                $query->delete();
            });
        } else {
            $deleted = $query->delete();
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Đã xóa toàn bộ giỏ hàng.',
        ]);
    }

    // =========================================================================
    // HELPER: Kiểm tra quyền sở hữu cart item
    // =========================================================================
    private function ownsCartItem(Request $request, Cart $cartItem): bool
    {
        $ctx = $this->getContext($request);

        // Case 1: User đã login, item thuộc chính user đó
        if ($ctx['user_id'] && $cartItem->user_id == $ctx['user_id']) {
            return true;
        }

        // Case 2: Guest (chưa login), item thuộc cùng session
        if (!$ctx['user_id'] && $ctx['session_id'] && $cartItem->session_id == $ctx['session_id']) {
            return true;
        }

        // Case 3: User đã login nhưng item là guest item có cùng session (chưa được merge)
        // Cho phép user xóa item của chính họ trước khi merge
        if ($ctx['user_id'] && is_null($cartItem->user_id) && $ctx['session_id'] && $cartItem->session_id == $ctx['session_id']) {
            return true;
        }

        return false;
    }

    // =========================================================================
    // 6. POST /api/client/cart/merge — Gộp giỏ hàng Guest → User sau khi login
    // =========================================================================
    public function merge(Request $request)
    {
        $sessionId = $request->input('session_id');

        if (!$sessionId) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Cần cung cấp session_id của giỏ hàng khách.',
            ], 400);
        }

        $user = auth('sanctum')->user();

        // Lấy toàn bộ cart items của guest session
        $guestItems = Cart::where('session_id', $sessionId)->whereNull('user_id')->get();

        if ($guestItems->isEmpty()) {
            return response()->json([
                'status'  => 'success',
                'message' => 'Không có sản phẩm nào từ giỏ hàng khách để gộp.',
            ]);
        }

        $merged    = 0;

        DB::transaction(function () use ($guestItems, $user, &$merged) {
            foreach ($guestItems as $guestItem) {
                $existingUserItem = Cart::where('user_id', $user->id)
                    ->where('product_id', $guestItem->product_id)
                    ->where('variant_id', $guestItem->variant_id)
                    ->lockForUpdate()
                    ->first();

                $variant = ProductVariant::lockForUpdate()->find($guestItem->variant_id);
                $maxStock = $variant ? $variant->quantity : PHP_INT_MAX;

                if ($existingUserItem) {
                    $newQty = min($existingUserItem->quantity + $guestItem->quantity, $maxStock + $existingUserItem->quantity);
                    $addedQty = $newQty - $existingUserItem->quantity;

                    // Trừ tồn kho cho phần gộp thêm
                    if ($addedQty > 0 && $variant) {
                        $variant->decrement('quantity', $addedQty);
                        Product::where('id', $guestItem->product_id)->decrement('quantity', $addedQty);
                    }

                    $existingUserItem->update([
                        'quantity'       => $newQty,
                        'reserved_until' => now()->addMinutes(self::RESERVATION_MINUTES),
                    ]);
                    $guestItem->delete();
                } else {
                    // Chuyển quyền sở hữu sang user, bắt đầu hold
                    $guestItem->update([
                        'user_id'        => $user->id,
                        'session_id'     => null,
                        'reserved_until' => now()->addMinutes(self::RESERVATION_MINUTES),
                    ]);

                    // Trừ tồn kho cho guest items được merge vào user
                    if ($variant) {
                        $variant->decrement('quantity', $guestItem->quantity);
                        Product::where('id', $guestItem->product_id)->decrement('quantity', $guestItem->quantity);
                    }
                    $merged++;
                }
            }
        });

        return response()->json([
            'status'  => 'success',
            'message' => 'Đã gộp giỏ hàng.',
            'merged'  => $merged,
        ]);
    }

    // =========================================================================
    // 7. POST /api/client/cart/release-expired — Giải phóng giỏ hàng hết hạn (internal/scheduler)
    // =========================================================================
    public function releaseExpiredReservations(): void
    {
        $expired = Cart::whereNotNull('user_id')
            ->whereNotNull('reserved_until')
            ->where('reserved_until', '<', now())
            ->with('variant')
            ->get();

        DB::transaction(function () use ($expired) {
            foreach ($expired as $item) {
                $variant = ProductVariant::lockForUpdate()->find($item->variant_id);
                if ($variant) {
                    $variant->increment('quantity', $item->quantity);
                }
                Product::where('id', $item->product_id)->increment('quantity', $item->quantity);
                $item->delete();
            }
        });
    }
}

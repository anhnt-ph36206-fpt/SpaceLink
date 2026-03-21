<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Http\Requests\AddToCartRequest;
use App\Http\Requests\UpdateCartRequest;
use App\Models\Cart;
use App\Models\ProductVariant;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CartController extends Controller
{
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
                'stock_available' => $item->variant?->quantity ?? 0,
                'available_variants' => $availableVariants,
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

                if ($existingItem) {
                    $newQty = $existingItem->quantity + $request->quantity;
                    if ($newQty > $variant->quantity) {
                        throw new \Exception("Số lượng vượt quá tồn kho (còn {$variant->quantity}).", 409);
                    }
                    $existingItem->update(['quantity' => $newQty]);
                    $existingItem->load(['product', 'variant']);
                    return ['action' => 'updated', 'item' => $existingItem];
                }

                $newItem = Cart::create([
                    'user_id'    => $ctx['user_id'],
                    'session_id' => $ctx['user_id'] ? null : $ctx['session_id'],
                    'product_id' => $variant->product_id,
                    'variant_id' => $request->variant_id,
                    'quantity'   => $request->quantity,
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

                if ($variant->quantity < $newQuantity) {
                    throw new \Exception("Sản phẩm chỉ còn {$variant->quantity} trong kho.", 409);
                }

                // Nếu thay đổi variant_id → kiểm tra merge
                if ($newVariantId != $cartItem->variant_id) {
                    $ctx   = $this->getContext($request);
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
                        $totalNewQty = min($alreadyInCart->quantity + $newQuantity, $variant->quantity);
                        $alreadyInCart->update(['quantity' => $totalNewQty]);
                        $cartItem->delete();
                        return ['merged' => true, 'item' => $alreadyInCart->load(['product', 'variant'])];
                    }
                }

                $cartItem->update(['variant_id' => $newVariantId, 'quantity' => $newQuantity]);
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
        $cartItem = Cart::find($cart_item_id);

        if (!$cartItem) {
            return response()->json(['status' => 'error', 'message' => 'Không tìm thấy sản phẩm trong giỏ.'], 404);
        }

        if (!$this->ownsCartItem($request, $cartItem)) {
            return response()->json(['status' => 'error', 'message' => 'Không có quyền xóa.'], 403);
        }

        $cartItem->delete();

        return response()->json(['status' => 'success', 'message' => 'Đã xóa sản phẩm khỏi giỏ hàng.']);
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

        $deleted = $query->delete();

        return response()->json([
            'status'  => 'success',
            'message' => "Đã xóa toàn bộ giỏ hàng ({$deleted} sản phẩm).",
        ]);
    }

    // =========================================================================
    // HELPER: Kiểm tra quyền sở hữu cart item
    // =========================================================================
    private function ownsCartItem(Request $request, Cart $cartItem): bool
    {
        $ctx = $this->getContext($request);
        if ($ctx['user_id'] && $cartItem->user_id == $ctx['user_id']) {
            return true;
        }
        if (!$ctx['user_id'] && $ctx['session_id'] && $cartItem->session_id == $ctx['session_id']) {
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
        $discarded = 0;

        foreach ($guestItems as $guestItem) {
            // Kiểm tra xem user đã có item này chưa
            $existingUserItem = Cart::where('user_id', $user->id)
                ->where('product_id', $guestItem->product_id)
                ->where('variant_id', $guestItem->variant_id)
                ->first();

            if ($existingUserItem) {
                // Cộng dồn số lượng — kiểm tra giới hạn tồn kho
                $variant = $guestItem->variant;
                $maxStock = $variant ? $variant->quantity : PHP_INT_MAX;
                $newQty   = min($existingUserItem->quantity + $guestItem->quantity, $maxStock);
                $existingUserItem->update(['quantity' => $newQty]);
                $guestItem->delete();
            } else {
                // Chuyển quyền sở hữu sang user
                $guestItem->update([
                    'user_id'    => $user->id,
                    'session_id' => null,
                ]);
                $merged++;
            }
        }

        return response()->json([
            'status'  => 'success',
            'message' => "Đã gộp giỏ hàng.",
            'merged'  => $merged,
        ]);
    }
}

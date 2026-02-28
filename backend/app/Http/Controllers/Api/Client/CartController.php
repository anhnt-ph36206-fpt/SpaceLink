<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Http\Requests\AddToCartRequest;
use App\Http\Requests\UpdateCartRequest;
use App\Models\Cart;
use App\Models\ProductVariant;
use Illuminate\Http\Request;
use OpenApi\Attributes as OA;

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
    #[OA\Get(
        path: '/api/client/cart',
        summary: 'Lấy danh sách giỏ hàng của user/session',
        tags: ['Client - Cart'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(
                name: 'X-Session-ID',
                in: 'header',
                description: 'Session ID cho khách vãng lai (nếu chưa login)',
                required: false,
                schema: new OA\Schema(type: 'string')
            )
        ],
        responses: [
            new OA\Response(
                response: 200,
                description: 'Thành công',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'status', type: 'string', example: 'success'),
                        new OA\Property(property: 'data', type: 'array', items: new OA\Items(type: 'object')),
                        new OA\Property(property: 'total_items', type: 'integer', example: 3),
                        new OA\Property(property: 'total_price', type: 'number', example: 599000),
                    ]
                )
            )
        ]
    )]
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
            'variant.attributes',
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
                    'name' => $a->name,
                    'value' => $a->pivot->value ?? null,
                ]),
                'product_images'  => $item->product?->images,
                'effective_price' => $effectivePrice,
                'quantity'        => $item->quantity,
                'line_total'      => $effectivePrice * $item->quantity,
                'stock_available' => $item->variant?->quantity ?? 0,
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
    #[OA\Post(
        path: '/api/client/cart/add',
        summary: 'Thêm sản phẩm vào giỏ hàng',
        tags: ['Client - Cart'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(
                name: 'X-Session-ID',
                in: 'header',
                description: 'Session ID cho khách vãng lai',
                required: false,
                schema: new OA\Schema(type: 'string')
            )
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['variant_id', 'quantity'],
                properties: [
                    new OA\Property(property: 'variant_id', type: 'integer', description: 'ID của biến thể sản phẩm'),
                    new OA\Property(property: 'quantity', type: 'integer', description: 'Số lượng muốn thêm', minimum: 1),
                    new OA\Property(property: 'session_id', type: 'string', description: 'Session ID (dự phòng nếu không gửi qua header)', nullable: true),
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Thêm / cộng dồn số lượng thành công'),
            new OA\Response(response: 400, description: 'Thiếu User ID hoặc Session ID'),
            new OA\Response(response: 422, description: 'Dữ liệu không hợp lệ'),
        ]
    )]
    public function addToCart(AddToCartRequest $request)
    {
        $ctx = $this->getContext($request);

        if (!$ctx['user_id'] && !$ctx['session_id']) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Cần có User Token (Authorization) hoặc Session ID (Header X-Session-ID).',
            ], 400);
        }

        // Kiểm tra biến thể còn active không
        $variant = ProductVariant::where('id', $request->variant_id)
            ->where('is_active', true)
            ->first();

        if (!$variant) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Biến thể sản phẩm không còn hoạt động hoặc không tồn tại.',
            ], 404);
        }

        // Kiểm tra tồn kho đơn giản khi thêm vào giỏ
        if ($variant->quantity < $request->quantity) {
            return response()->json([
                'status'  => 'error',
                'message' => "Sản phẩm chỉ còn {$variant->quantity} trong kho.",
            ], 409);
        }

        // Tìm xem item đã tồn tại trong giỏ chưa
        $query = Cart::where('product_id', $variant->product_id)
            ->where('variant_id', $request->variant_id);

        if ($ctx['user_id']) {
            $query->where('user_id', $ctx['user_id']);
        } else {
            $query->where('session_id', $ctx['session_id'])->whereNull('user_id');
        }

        $existingItem = $query->first();

        if ($existingItem) {
            // Cộng dồn số lượng
            $newQty = $existingItem->quantity + $request->quantity;
            if ($newQty > $variant->quantity) {
                return response()->json([
                    'status'  => 'error',
                    'message' => "Số lượng vượt quá tồn kho (còn {$variant->quantity}).",
                ], 409);
            }
            $existingItem->increment('quantity', $request->quantity);
            $existingItem->load(['product', 'variant']);
            return response()->json([
                'status'  => 'success',
                'message' => 'Đã cập nhật số lượng trong giỏ hàng.',
                'data'    => $existingItem,
            ]);
        }

        // Tạo mới cart item
        $newItem = Cart::create([
            'user_id'    => $ctx['user_id'],
            'session_id' => $ctx['user_id'] ? null : $ctx['session_id'],
            'product_id' => $variant->product_id,
            'variant_id' => $request->variant_id,
            'quantity'   => $request->quantity,
        ]);

        $newItem->load(['product', 'variant']);

        return response()->json([
            'status'  => 'success',
            'message' => 'Đã thêm sản phẩm vào giỏ hàng.',
            'data'    => $newItem,
        ], 201);
    }

    // =========================================================================
    // 3. PUT /api/client/cart/update/{cart_item_id} — Cập nhật số lượng
    // =========================================================================
    #[OA\Put(
        path: '/api/client/cart/update/{cart_item_id}',
        summary: 'Cập nhật số lượng sản phẩm trong giỏ',
        tags: ['Client - Cart'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'cart_item_id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'X-Session-ID', in: 'header', required: false, schema: new OA\Schema(type: 'string')),
        ],
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['quantity'],
                properties: [new OA\Property(property: 'quantity', type: 'integer', minimum: 1)]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Cập nhật thành công'),
            new OA\Response(response: 403, description: 'Không có quyền'),
            new OA\Response(response: 404, description: 'Không tìm thấy cart item'),
            new OA\Response(response: 409, description: 'Số lượng vượt tồn kho'),
        ]
    )]
    public function updateQuantity(UpdateCartRequest $request, int $cart_item_id)
    {
        $cartItem = Cart::find($cart_item_id);

        if (!$cartItem) {
            return response()->json(['status' => 'error', 'message' => 'Không tìm thấy sản phẩm trong giỏ.'], 404);
        }

        // Kiểm tra quyền sở hữu
        if (!$this->ownsCartItem($request, $cartItem)) {
            return response()->json(['status' => 'error', 'message' => 'Không có quyền truy cập.'], 403);
        }

        // Kiểm tra tồn kho trước khi cập nhật
        if ($cartItem->variant && $cartItem->variant->quantity < $request->quantity) {
            return response()->json([
                'status'  => 'error',
                'message' => "Sản phẩm chỉ còn {$cartItem->variant->quantity} trong kho.",
            ], 409);
        }

        $cartItem->update(['quantity' => $request->quantity]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Đã cập nhật số lượng.',
            'data'    => $cartItem->load(['product', 'variant']),
        ]);
    }

    // =========================================================================
    // 4. DELETE /api/client/cart/remove/{cart_item_id} — Xóa 1 item
    // =========================================================================
    #[OA\Delete(
        path: '/api/client/cart/remove/{cart_item_id}',
        summary: 'Xóa 1 sản phẩm khỏi giỏ hàng',
        tags: ['Client - Cart'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'cart_item_id', in: 'path', required: true, schema: new OA\Schema(type: 'integer')),
            new OA\Parameter(name: 'X-Session-ID', in: 'header', required: false, schema: new OA\Schema(type: 'string')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Đã xóa khỏi giỏ'),
            new OA\Response(response: 403, description: 'Không có quyền'),
            new OA\Response(response: 404, description: 'Không tìm thấy'),
        ]
    )]
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
    #[OA\Delete(
        path: '/api/client/cart/clear',
        summary: 'Xóa toàn bộ giỏ hàng',
        tags: ['Client - Cart'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(name: 'X-Session-ID', in: 'header', required: false, schema: new OA\Schema(type: 'string')),
        ],
        responses: [
            new OA\Response(response: 200, description: 'Đã xóa toàn bộ giỏ hàng'),
            new OA\Response(response: 400, description: 'Thiếu định danh user/session'),
        ]
    )]
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
}
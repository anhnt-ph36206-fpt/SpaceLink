<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cart;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use OpenApi\Attributes as OA;

class CartController extends Controller
{
    // 1. Lấy danh sách giỏ hàng
    #[OA\Get(
        path: '/api/cart',
        summary: 'Lấy danh sách giỏ hàng',
        tags: ['Cart'],
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
                description: 'Danh sách sản phẩm trong giỏ',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'status', type: 'string', example: 'success'),
                        new OA\Property(property: 'data', type: 'array', items: new OA\Items(type: 'object'))
                    ]
                )
            )
        ]
    )]
    public function index(Request $request)
    {
        // Lấy giỏ hàng dựa trên User ID (nếu login) HOẶC Session ID (nếu khách)
        $query = Cart::with(['product', 'variant', 'product.images']);

        if ($request->user()) {
            $query->where('user_id', $request->user()->id);
        } else {
            // Nếu là khách, bắt buộc phải có session_id gửi lên từ header hoặc query
            $sessionId = $request->header('X-Session-ID') ?? $request->session_id;
            if (!$sessionId) {
                return response()->json([]); // Trả về rỗng nếu không xác định được khách
            }
            $query->where('session_id', $sessionId)->whereNull('user_id');
        }

        $cartItems = $query->latest()->get();

        return response()->json([
            'status' => 'success',
            'data' => $cartItems
        ]);
    }

    // 2. Thêm vào giỏ hàng (Add to Cart)
    #[OA\Post(
        path: '/api/cart/add',
        summary: 'Thêm sản phẩm vào giỏ hàng',
        tags: ['Cart'],
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
        requestBody: new OA\RequestBody(
            required: true,
            content: new OA\JsonContent(
                required: ['product_id', 'quantity'],
                properties: [
                    new OA\Property(property: 'product_id', type: 'integer', description: 'ID sản phẩm'),
                    new OA\Property(property: 'quantity', type: 'integer', description: 'Số lượng'),
                    new OA\Property(property: 'variant_id', type: 'integer', description: 'ID biến thể (nếu có)', nullable: true),
                    new OA\Property(property: 'session_id', type: 'string', description: 'Session ID gửi trong body (dự phòng)', nullable: true)
                ]
            )
        ),
        responses: [
            new OA\Response(
                response: 200,
                description: 'Thêm vào giỏ thành công',
                content: new OA\JsonContent(
                    properties: [
                        new OA\Property(property: 'message', type: 'string', example: 'Đã thêm vào giỏ'),
                        new OA\Property(property: 'data', type: 'object')
                    ]
                )
            ),
            new OA\Response(response: 422, description: 'Lỗi validate dữ liệu'),
            new OA\Response(response: 400, description: 'Thiếu thông tin User/Session')
        ]
    )]
    public function addToCart(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'product_id' => 'required|exists:products,id',
            'quantity' => 'required|integer|min:1',
            'variant_id' => 'nullable|exists:product_variants,id',
            'session_id' => 'nullable|string' // Bắt buộc nếu chưa login
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $userId = $request->user() ? $request->user()->id : null;
        $sessionId = $request->header('X-Session-ID') ?? $request->session_id;

        if (!$userId && !$sessionId) {
            return response()->json(['message' => 'Cần User ID hoặc Session ID'], 400);
        }

        // Tìm xem sản phẩm này đã có trong giỏ chưa
        $existingItem = Cart::where('product_id', $request->product_id)
            ->where('variant_id', $request->variant_id)
            ->when($userId, function ($q) use ($userId) {
                return $q->where('user_id', $userId);
            })
            ->when(!$userId, function ($q) use ($sessionId) {
                return $q->where('session_id', $sessionId)->whereNull('user_id');
            })
            ->first();

        if ($existingItem) {
            // Nếu có rồi -> Cộng dồn số lượng
            $existingItem->increment('quantity', $request->quantity);
            return response()->json(['message' => 'Đã cập nhật số lượng', 'data' => $existingItem]);
        } else {
            // Chưa có -> Tạo mới
            $newItem = Cart::create([
                'user_id' => $userId,
                'session_id' => $userId ? null : $sessionId, // Nếu đã có user thì ko cần session
                'product_id' => $request->product_id,
                'variant_id' => $request->variant_id,
                'quantity' => $request->quantity
            ]);
            return response()->json(['message' => 'Đã thêm vào giỏ', 'data' => $newItem]);
        }
    }

    // 3. Cập nhật số lượng (+/-)
    #[OA\Put(
        path: '/api/cart/update/{id}',
        summary: 'Cập nhật số lượng sản phẩm trong giỏ',
        tags: ['Cart'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'ID của mục trong giỏ hàng (cart_items.id)',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
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
                required: ['quantity'],
                properties: [
                    new OA\Property(property: 'quantity', type: 'integer', description: 'Số lượng mới', minimum: 1)
                ]
            )
        ),
        responses: [
            new OA\Response(response: 200, description: 'Cập nhật thành công'),
            new OA\Response(response: 404, description: 'Không tìm thấy sản phẩm'),
            new OA\Response(response: 403, description: 'Không có quyền truy cập')
        ]
    )]
    public function updateQuantity(Request $request, $id)
    {
        $request->validate(['quantity' => 'required|integer|min:1']);

        $cartItem = Cart::find($id);

        if (!$cartItem) {
            return response()->json(['message' => 'Không tìm thấy sản phẩm'], 404);
        }

        // Check quyền sở hữu (User hoặc Session)
        $userId = $request->user() ? $request->user()->id : null;
        $sessionId = $request->header('X-Session-ID') ?? $request->session_id;

        if (($userId && $cartItem->user_id != $userId) || (!$userId && $cartItem->session_id != $sessionId)) {
            return response()->json(['message' => 'Không có quyền truy cập'], 403);
        }

        $cartItem->quantity = $request->quantity;
        $cartItem->save();

        return response()->json(['message' => 'Cập nhật thành công']);
    }

    // 4. Xóa khỏi giỏ
    #[OA\Delete(
        path: '/api/cart/remove/{id}',
        summary: 'Xóa sản phẩm khỏi giỏ hàng',
        tags: ['Cart'],
        security: [['sanctum' => []]],
        parameters: [
            new OA\Parameter(
                name: 'id',
                in: 'path',
                description: 'ID của mục trong giỏ hàng',
                required: true,
                schema: new OA\Schema(type: 'integer')
            ),
             new OA\Parameter(
                name: 'X-Session-ID',
                in: 'header',
                description: 'Session ID cho khách vãng lai',
                required: false,
                schema: new OA\Schema(type: 'string')
            )
        ],
        responses: [
            new OA\Response(response: 200, description: 'Đã xóa sản phẩm khỏi giỏ'),
            new OA\Response(response: 404, description: 'Không tìm thấy'),
            new OA\Response(response: 403, description: 'Không có quyền xóa')
        ]
    )]
    public function remove(Request $request, $id)
    {
        $cartItem = Cart::find($id);
        
        if (!$cartItem) {
            return response()->json(['message' => 'Không tìm thấy'], 404);
        }

        // Check quyền (như trên)
        $userId = $request->user() ? $request->user()->id : null;
        $sessionId = $request->header('X-Session-ID') ?? $request->session_id;

        if (($userId && $cartItem->user_id != $userId) || (!$userId && $cartItem->session_id != $sessionId)) {
            return response()->json(['message' => 'Không có quyền xóa'], 403);
        }

        $cartItem->delete();
        return response()->json(['message' => 'Đã xóa sản phẩm khỏi giỏ']);
    }
}
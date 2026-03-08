<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\Wishlist;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class WishlistController extends Controller
{
    /**
     * GET /api/client/wishlist
     * List user's wishlist
     */
    public function index(Request $request)
    {
        $wishlist = Wishlist::with(['product' => function($q) {
                $q->with(['category', 'brand', 'images']);
            }])
            ->where('user_id', $request->user()->id)
            ->latest()
            ->paginate(12);

        return response()->json([
            'status' => 'success',
            'data'   => $wishlist
        ]);
    }

    /**
     * POST /api/client/wishlist
     * Add a product to wishlist
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'product_id' => 'required|exists:products,id',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Sản phẩm không hợp lệ.',
                'errors'  => $validator->errors()
            ], 422);
        }

        $userId = $request->user()->id;
        $productId = $request->product_id;

        // Check if already in wishlist
        $exists = Wishlist::where('user_id', $userId)
            ->where('product_id', $productId)
            ->exists();

        if ($exists) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Sản phẩm này đã có trong danh sách yêu thích.'
            ], 400);
        }

        $wishlist = Wishlist::create([
            'user_id'    => $userId,
            'product_id' => $productId,
        ]);

        return response()->json([
            'status'  => 'success',
            'message' => 'Đã thêm vào danh sách yêu thích.',
            'data'    => $wishlist
        ], 201);
    }

    /**
     * DELETE /api/client/wishlist/{productId}
     * Remove a product from wishlist
     */
    public function destroy(Request $request, $productId)
    {
        $deleted = Wishlist::where('user_id', $request->user()->id)
            ->where('product_id', $productId)
            ->delete();

        if (!$deleted) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Sản phẩm không có trong danh sách yêu thích.'
            ], 404);
        }

        return response()->json([
            'status'  => 'success',
            'message' => 'Đã xóa khỏi danh sách yêu thích.'
        ]);
    }
}

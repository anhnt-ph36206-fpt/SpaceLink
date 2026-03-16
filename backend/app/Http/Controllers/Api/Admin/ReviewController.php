<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Review;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ReviewController extends Controller
{
    /**
     * GET /api/admin/reviews
     * List all reviews with filters
     */
    public function index(Request $request)
    {
        $query = Review::with(['user:id,fullname,email', 'product:id,name,sku', 'orderItem']);

        // Filters
        if ($request->filled('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        if ($request->filled('rating')) {
            $query->where('rating', $request->rating);
        }

        if ($request->has('is_hidden')) {
            $query->where('is_hidden', filter_var($request->is_hidden, FILTER_VALIDATE_BOOLEAN));
        }

        $reviews = $query->latest()->paginate(15);

        return response()->json([
            'status' => 'success',
            'data' => $reviews,
        ]);
    }

    /**
     * PATCH /api/admin/reviews/{id}/reply
     * Admin reply to a review
     */
    public function reply(Request $request, $id)
    {
        $validator = Validator::make($request->all(), [
            'admin_reply' => 'required|string|max:1000',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'message' => 'Dữ liệu phản hồi không hợp lệ.',
                'errors' => $validator->errors(),
            ], 400);
        }

        try {
            $review = Review::findOrFail($id);
            $review->update([
                'admin_reply' => $request->admin_reply,
                'replied_at' => now(),
            ]);

            return response()->json([
                'status' => 'success',
                'message' => 'Đã gửi phản hồi thành công.',
                'data' => $review,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Đã xảy ra lỗi khi lưu phản hồi.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * PATCH /api/admin/reviews/{id}/toggle-visibility
     * Hide or show a review
     */
    public function toggleVisibility($id)
    {
        try {
            $review = Review::findOrFail($id);
            $review->update([
                'is_hidden' => ! $review->is_hidden,
            ]);

            return response()->json([
                'status' => 'success',
                'message' => $review->is_hidden ? 'Đã ẩn đánh giá.' : 'Đã hiện đánh giá.',
                'data' => $review,
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Đã xảy ra lỗi khi cập nhật trạng thái hiển thị.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * DELETE /api/admin/reviews/{id}
     * Permanently delete a review
     */
    public function destroy($id)
    {
        try {
            $review = Review::findOrFail($id);
            $review->delete();

            return response()->json([
                'status' => 'success',
                'message' => 'Đã xóa đánh giá vĩnh viễn.',
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'status' => 'error',
                'message' => 'Đã xảy ra lỗi khi xóa đánh giá.',
                'error' => $e->getMessage(),
            ], 500);
        }
    }
}

<?php

namespace App\Http\Controllers\Api\Client;

use App\Http\Controllers\Controller;
use App\Models\Review;
use App\Models\OrderItem;
use App\Models\Product;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ReviewController extends Controller
{
    /**
     * POST /api/client/reviews
     * Submit a review for an order item
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'order_item_id' => 'required|exists:order_items,id',
            'rating'        => 'required|integer|min:1|max:5',
            'content'       => 'nullable|string|max:1000',
            'images'        => 'nullable|array',
            'images.*'      => 'nullable|string', // Assuming images are already uploaded or passed as URLs
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Dữ liệu không hợp lệ.',
                'errors'  => $validator->errors()
            ], 422);
        }

        try {
            $user = $request->user();
            $orderItem = OrderItem::with('order')->findOrFail($request->order_item_id);

            // 1. Kiểm tra đơn hàng thuộc về user
            if ($orderItem->order->user_id !== $user->id) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Bạn không có quyền đánh giá sản phẩm này.'
                ], 403);
            }

            // 2. Kiểm tra trạng thái đơn hàng (phải là completed hoặc delivered)
            if (!in_array($orderItem->order->status, ['delivered', 'completed'])) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Bạn chỉ có thể đánh giá sau khi nhận hàng thành công.'
                ], 400);
            }

            // 3. Kiểm tra đã đánh giá chưa
            if ($orderItem->is_reviewed) {
                return response()->json([
                    'status'  => 'error',
                    'message' => 'Sản phẩm này đã được đánh giá trước đó.'
                ], 400);
            }

            // 4. Tạo review (lưu cả variant_id từ order item)
            $review = Review::create([
                'user_id'            => $user->id,
                'product_id'         => $orderItem->product_id,
                'product_variant_id' => $orderItem->variant_id,
                'order_item_id'      => $orderItem->id,
                'rating'             => $request->rating,
                'content'            => $request->content,
                'images'             => $request->images,
            ]);

            // 5. Cập nhật is_reviewed của OrderItem
            $orderItem->update(['is_reviewed' => true]);

            return response()->json([
                'status'  => 'success',
                'message' => 'Cảm ơn bạn đã đánh giá sản phẩm!',
                'data'    => $review
            ], 201);

        } catch (\Exception $e) {
            return response()->json([
                'status'  => 'error',
                'message' => 'Đã xảy ra lỗi khi lưu đánh giá.',
                'error'   => $e->getMessage()
            ], 500);
        }
    }

    /**
     * GET /api/client/products/{productId}/reviews
     * Get reviews for a specific product
     */
    public function productReviews(Request $request, $productId)
    {
        $product = Product::findOrFail($productId);

        $variantId = $request->query('variant_id');
        $rating = $request->query('rating');

        $query = Review::with(['user:id,fullname', 'variant.attributes.attributeGroup', 'orderItem:id,variant_info'])
            ->where('product_id', $productId)
            ->where('is_hidden', false);

        if ($variantId) {
            $query->where('product_variant_id', $variantId);
        }
        
        if ($rating) {
            $query->where('rating', $rating);
        }

        $reviews = $query->latest()->paginate(10);

        $reviews->getCollection()->transform(function ($review) {
            $variantInfo = [];
            if ($review->variant && $review->variant->attributes) {
                foreach ($review->variant->attributes as $attr) {
                    $groupName = $attr->attributeGroup->name ?? '';
                    if ($groupName && $attr->value) {
                         $variantInfo[] = ['name' => $groupName, 'value' => $attr->value];
                    }
                }
            }
            
            if (!empty($variantInfo)) {
                $review->setAttribute('variant_info', ['attrs' => $variantInfo]);
            } else if ($review->orderItem && isset($review->orderItem->variant_info)) {
                 $review->setAttribute('variant_info', $review->orderItem->variant_info);
            }
            
            // Xóa relationships đã load để gọn Response nếu không cần
            unset($review->variant);
            unset($review->orderItem);
            
            return $review;
        });

        $baseQuery = Review::where('product_id', $productId)->where('is_hidden', false);

        $distribution = (clone $baseQuery)
            ->selectRaw('rating, count(*) as count')
            ->groupBy('rating')
            ->pluck('count', 'rating')
            ->toArray();

        $starDistribution = [];
        for ($i = 5; $i >= 1; $i--) {
            $starDistribution[$i] = $distribution[$i] ?? 0;
        }

        $stats = [
            'average_rating'    => (float) (clone $baseQuery)->avg('rating'),
            'total_reviews'     => (clone $baseQuery)->count(),
            'star_distribution' => $starDistribution,
        ];

        return response()->json([
            'status' => 'success',
            'data'   => $reviews,
            'stats'  => $stats,
        ]);
    }
}

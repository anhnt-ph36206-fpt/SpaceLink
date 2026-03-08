<?php

namespace App\Observers;

use App\Models\Review;

class ReviewObserver
{
    /**
     * Tự động tính lại tổng sao và số lượt đánh giá
     * Dành cho sản phẩm đang được Review
     */
    private function updateProductRating(Review $review)
    {
        $product = $review->product;
        // Chỉ tính điểm dựa trên các đánh giá không bị Admin ẩn (is_hidden = 0/false)
        $approvedReviews = $product->reviews()->where('is_hidden', false);

        $product->update([
            'rating_avg' => round($approvedReviews->avg('rating'), 1) ?? 0,
            'review_count' => $approvedReviews->count()
        ]);
    }

    public function created(Review $review): void
    {
        $this->updateProductRating($review);
    }

    public function updated(Review $review): void
    {
        $this->updateProductRating($review);
    }

    public function deleted(Review $review): void
    {
        $this->updateProductRating($review);
    }

    public function restored(Review $review): void
    {
        $this->updateProductRating($review);
    }

    public function forceDeleted(Review $review): void
    {
        $this->updateProductRating($review);
    }
}

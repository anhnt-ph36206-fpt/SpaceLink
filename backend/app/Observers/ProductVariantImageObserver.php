<?php

namespace App\Observers;

use App\Models\ProductVariantImage;

class ProductVariantImageObserver
{
    /**
     * Handle the ProductVariantImage "created" event.
     */
    public function created(ProductVariantImage $productVariantImage): void
    {
        //
    }

    /**
     * Handle the ProductVariantImage "updated" event.
     */
    public function updated(ProductVariantImage $productVariantImage): void
    {
        //
    }

    /**
     * Handle the ProductVariantImage "deleted" event.
     */
    public function deleted(ProductVariantImage $image): void
    {
        if ($image->image_url && \Illuminate\Support\Facades\Storage::disk('public')->exists($image->image_url)) {
            \Illuminate\Support\Facades\Storage::disk('public')->delete($image->image_url);
        }
    }

    /**
     * Handle the ProductVariantImage "restored" event.
     */
    public function restored(ProductVariantImage $productVariantImage): void
    {
        //
    }

    /**
     * Handle the ProductVariantImage "force deleted" event.
     */
    public function forceDeleted(ProductVariantImage $productVariantImage): void
    {
        //
    }
}

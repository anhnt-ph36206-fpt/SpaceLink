<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Cart extends Model
{
    protected $table = 'carts';

    protected $fillable = [
        'user_id',
        'session_id',
        'product_id',
        'variant_id',
        'quantity',
    ];

    /**
     * Relationships
     */

    // Cart belongs to user
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Cart belongs to product
    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    // Cart belongs to variant (nullable)
    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }

    /**
     * Lấy giá hiệu lực của item này từ DB mới nhất.
     * Ưu tiên: variant.sale_price > variant.price > product.sale_price > product.price
     * Gọi sau khi đã eager-load 'variant' và 'product'.
     */
    public function getEffectivePrice(): float
    {
        if ($this->variant) {
            return (float) ($this->variant->sale_price ?? $this->variant->price);
        }
        return (float) ($this->product->sale_price ?? $this->product->price);
    }
}
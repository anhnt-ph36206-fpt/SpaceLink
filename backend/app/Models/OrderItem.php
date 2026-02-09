<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderItem extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'order_id',
        'product_id',
        'variant_id',
        'product_name',
        'product_image',
        'product_sku',
        'variant_info',
        'price',
        'quantity',
        'total',
        'is_reviewed',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'total' => 'decimal:2',
        'variant_info' => 'array',
        'is_reviewed' => 'boolean',
    ];

    /**
     * Relationships
     */

    // OrderItem belongs to order
    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    // OrderItem belongs to product
    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    // OrderItem belongs to variant (nullable)
    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }

    // OrderItem has one review
    public function review()
    {
        return $this->hasOne(Review::class);
    }
}
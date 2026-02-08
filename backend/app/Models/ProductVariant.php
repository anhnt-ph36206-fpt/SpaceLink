<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductVariant extends Model
{
    protected $fillable = [
        'product_id',
        'sku',
        'price',
        'sale_price',
        'quantity',
        'image',
        'is_active',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'sale_price' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    /**
     * Relationships
     */

    // Variant belongs to product
    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    // Variant has many attributes (many-to-many)
    public function attributes()
    {
        return $this->belongsToMany(Attribute::class, 'product_variant_attributes', 'variant_id', 'attribute_id');
    }

    // Variant in cart items
    public function cartItems()
    {
        return $this->hasMany(Cart::class, 'variant_id');
    }

    // Variant in order items
    public function orderItems()
    {
        return $this->hasMany(OrderItem::class, 'variant_id');
    }
}
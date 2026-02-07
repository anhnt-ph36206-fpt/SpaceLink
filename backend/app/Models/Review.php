<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Review extends Model
{
    protected $fillable = [
        'user_id',
        'product_id',
        'order_item_id',
        'rating',
        'content',
        'images',
        'is_hidden',
        'admin_reply',
        'replied_at',
    ];

    protected $casts = [
        'images' => 'array',
        'is_hidden' => 'boolean',
        'replied_at' => 'datetime',
    ];

    /**
     * Relationships
     */

    // Review belongs to user
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Review belongs to product
    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    // Review belongs to order item
    public function orderItem()
    {
        return $this->belongsTo(OrderItem::class);
    }
}
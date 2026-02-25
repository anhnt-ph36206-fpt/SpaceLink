<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Cart extends Model
{
    protected $table = 'cart';

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
}

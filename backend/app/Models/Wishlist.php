<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Wishlist extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'user_id',
        'product_id',
    ];

    /**
     * Relationships
     */

    // Wishlist belongs to user
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Wishlist belongs to product
    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
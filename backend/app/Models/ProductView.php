<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductView extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'product_id',
        'user_id',
        'session_id',
        'ip_address',
        'viewed_at',
    ];

    protected $casts = [
        'viewed_at' => 'datetime',
    ];

    /**
     * Relationships
     */

    // View belongs to product
    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    // View belongs to user (nullable)
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
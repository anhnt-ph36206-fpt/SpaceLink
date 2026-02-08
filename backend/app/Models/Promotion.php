<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Promotion extends Model
{
    protected $fillable = [
        'name',
        'description',
        'start_date',
        'end_date',
        'is_active',
    ];

    protected $casts = [
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'is_active' => 'boolean',
    ];

    /**
     * Relationships
     */

    // Promotion has many products (many-to-many)
    public function products()
    {
        return $this->belongsToMany(Product::class, 'promotion_products')
            ->withPivot('discount_percent', 'discount_amount')
            ->withTimestamps();
    }
}
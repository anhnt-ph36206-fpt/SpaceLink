<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Voucher extends Model
{
    protected $fillable = [
        'code',
        'name',
        'description',
        'discount_type',
        'discount_value',
        'max_discount',
        'min_order_amount',
        'quantity',
        'used_count',
        'usage_limit_per_user',
        'start_date',
        'end_date',
        'is_active',
        'product_id',
        'category_id',
    ];

    protected $casts = [
        'discount_value' => 'decimal:2',
        'max_discount' => 'decimal:2',
        'min_order_amount' => 'decimal:2',
        'start_date' => 'datetime',
        'end_date' => 'datetime',
        'is_active' => 'boolean',
    ];

    /**
     * Relationships
     */

    // Voucher used in orders
    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    // Voucher usage history
    public function usages()
    {
        return $this->hasMany(VoucherUsage::class);
    }

    // Áp dụng riêng cho sản phẩm cụ thể (nullable)
    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    // Áp dụng riêng cho danh mục cụ thể (nullable)
    public function category()
    {
        return $this->belongsTo(Category::class);
    }
}
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Cart extends Model
{
    use HasFactory;

    protected $table = 'carts'; // Khai báo rõ tên bảng

    protected $fillable = [
        'user_id',
        'session_id',
        'product_id',
        'variant_id',
        'quantity'
    ];

    // Quan hệ với Sản phẩm
    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    // Quan hệ với Biến thể
    public function variant()
    {
        return $this->belongsTo(ProductVariant::class, 'variant_id');
    }
}
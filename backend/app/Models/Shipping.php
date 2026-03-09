<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Shipping extends Model
{
    protected $fillable = [
        'name',
        'code',
        'logo',
        'base_fee',
        'is_active',
    ];

    protected $casts = [
        'base_fee'  => 'decimal:2',
        'is_active' => 'boolean',
    ];

    // Scope: chỉ lấy đơn vị vận chuyển đang hoạt động
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}

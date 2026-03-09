<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductReturn extends Model
{
    protected $fillable = [
        'order_id',
        'user_id',
        'reason',
        'status',
        'reason_for_refusal',
        'refund_bank',
        'refund_account_name',
        'refund_account_number',
        'refund_amount',
        'transaction_code',
        'items',
    ];

    protected $casts = [
        'items'         => 'array',
        'refund_amount' => 'decimal:2',
    ];

    // Thuộc về đơn hàng
    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    // Thuộc về user yêu cầu hoàn trả
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Có nhiều bằng chứng (ảnh/video)
    public function evidences()
    {
        return $this->hasMany(ReturnEvidence::class, 'product_return_id');
    }
}

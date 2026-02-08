<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PaymentTransaction extends Model
{
    protected $fillable = [
        'order_id',
        'transaction_id',
        'payment_method',
        'amount',
        'status',
        'bank_code',
        'response_code',
        'response_message',
        'response_data',
        'paid_at',
    ];

    protected $casts = [
        'amount' => 'decimal:2',
        'response_data' => 'array',
        'paid_at' => 'datetime',
    ];

    /**
     * Relationships
     */

    // Transaction belongs to order
    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
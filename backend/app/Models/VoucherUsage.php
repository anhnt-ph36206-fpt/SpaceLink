<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class VoucherUsage extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'voucher_id',
        'user_id',
        'order_id',
        'used_at',
    ];

    protected $casts = [
        'used_at' => 'datetime',
    ];

    /**
     * Relationships
     */

    // Usage belongs to voucher
    public function voucher()
    {
        return $this->belongsTo(Voucher::class);
    }

    // Usage belongs to user
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Usage belongs to order
    public function order()
    {
        return $this->belongsTo(Order::class);
    }
}
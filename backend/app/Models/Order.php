<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Order extends Model
{
    protected $fillable = [
        'user_id',
        'order_code',
        'shipping_name',
        'shipping_phone',
        'shipping_email',
        'shipping_province',
        'shipping_district',
        'shipping_ward',
        'shipping_address',
        'subtotal',
        'discount_amount',
        'shipping_fee',
        'total_amount',
        'status',
        'payment_status',
        'payment_method',
        'voucher_id',
        'voucher_code',
        'voucher_discount',
        'note',
        'admin_note',
        'cancelled_reason',
        'cancelled_by',
        'cancelled_at',
        'confirmed_at',
        'shipped_at',
        'delivered_at',
        'completed_at',
        'shipping_partner',
        'tracking_code',
        'estimated_delivery',
    ];

    protected $casts = [
        'subtotal' => 'decimal:2',
        'discount_amount' => 'decimal:2',
        'shipping_fee' => 'decimal:2',
        'total_amount' => 'decimal:2',
        'voucher_discount' => 'decimal:2',
        'cancelled_at' => 'datetime',
        'confirmed_at' => 'datetime',
        'shipped_at' => 'datetime',
        'delivered_at' => 'datetime',
        'completed_at' => 'datetime',
        'estimated_delivery' => 'datetime',
    ];

    /**
     * Relationships
     */

    // Order belongs to user
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Order has many items
    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }

    // Order has many status history
    public function statusHistory()
    {
        return $this->hasMany(OrderStatusHistory::class);
    }

    // Order has many transactions
    public function transactions()
    {
        return $this->hasMany(PaymentTransaction::class);
    }

    // Order belongs to voucher
    public function voucher()
    {
        return $this->belongsTo(Voucher::class);
    }

    // Order cancelled by user
    public function cancelledBy()
    {
        return $this->belongsTo(User::class, 'cancelled_by');
    }

    // Order voucher usages
    public function voucherUsages()
    {
        return $this->hasMany(VoucherUsage::class);
    }
}
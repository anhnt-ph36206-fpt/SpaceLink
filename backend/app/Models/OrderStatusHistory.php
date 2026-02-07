<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderStatusHistory extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'order_id',
        'from_status',
        'to_status',
        'note',
        'changed_by',
    ];

    /**
     * Relationships
     */

    // History belongs to order
    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    // Changed by user
    public function changedBy()
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
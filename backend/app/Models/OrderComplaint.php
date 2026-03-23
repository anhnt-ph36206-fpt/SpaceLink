<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class OrderComplaint extends Model
{
    protected $fillable = [
        'order_id',
        'user_id',
        'type',
        'subject',
        'content',
        'status',
        'admin_reply',
    ];

    public function order()
    {
        return $this->belongsTo(Order::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

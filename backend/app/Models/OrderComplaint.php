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
        'images',
        'status',
        'admin_reply',
    ];

    protected $casts = [
        'images' => 'array',
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

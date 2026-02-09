<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserAddress extends Model
{
    protected $fillable = [
        'user_id',
        'fullname',
        'phone',
        'province',
        'district',
        'ward',
        'address_detail',
        'is_default',
        'address_type',
    ];

    protected $casts = [
        'is_default' => 'boolean',
    ];

    /**
     * Relationships
     */

    // Address belongs to user
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
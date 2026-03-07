<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class Banner extends Model
{
    protected $fillable = [
        'title',
        'image_url',
        'description',
        'link_url',
        'display_order',
        'start_date',
        'end_date',
        'is_active',
    ];

    protected $casts = [
        'is_active'     => 'boolean',
        'start_date'    => 'datetime',
        'end_date'      => 'datetime',
        'display_order' => 'integer',
    ];

    // Scope: chỉ lấy banner đang hiển thị (active + trong thời gian)
    public function scopeVisible($query)
    {
        $now = Carbon::now();

        return $query->where('is_active', true)
            ->where(function ($q) use ($now) {
                $q->whereNull('start_date')->orWhere('start_date', '<=', $now);
            })
            ->where(function ($q) use ($now) {
                $q->whereNull('end_date')->orWhere('end_date', '>=', $now);
            })
            ->orderBy('display_order');
    }
}

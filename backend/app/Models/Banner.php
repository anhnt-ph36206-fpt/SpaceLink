<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Storage;
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

    // Tự động thêm image_full_url vào JSON response
    protected $appends = ['image_full_url'];

    // Accessor: trả về URL đầy đủ của ảnh banner
    public function getImageFullUrlAttribute(): ?string
    {
        if (!$this->image_url) return null;

        // Nếu đã là URL đầy đủ (http/https) thì giữ nguyên
        if (str_starts_with($this->image_url, 'http')) {
            return $this->image_url;
        }

        // Detect động host từ request thực tế (ví dụ: http://localhost:8000)
        // Không phụ thuộc vào APP_URL trong .env
        $host = request()->getSchemeAndHttpHost();
        return $host . '/storage/' . $this->image_url;
    }

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


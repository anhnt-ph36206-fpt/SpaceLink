<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Scout\Searchable;

class News extends Model
{
    use SoftDeletes, Searchable;

    protected $fillable = [
        'author_id',
        'title',
        'slug',
        'thumbnail',
        'summary',
        'content',
        'view_count',
        'is_featured',
        'is_active',
        'meta_title',
        'meta_description',
        'published_at',
    ];

    protected $casts = [
        'is_featured' => 'boolean',
        'is_active' => 'boolean',
        'published_at' => 'datetime',
    ];

    /**
     * Relationships
     */

    // News belongs to author (user)
    public function author()
    {
        return $this->belongsTo(User::class, 'author_id');
    }

    /**
     * Accessor: full URL for thumbnail
     * Sử dụng host động từ request (giống Banner) để tránh phụ thuộc APP_URL
     */
    public function getThumbnailUrlAttribute(): ?string
    {
        if (!$this->thumbnail) return null;
        if (str_starts_with($this->thumbnail, 'http')) return $this->thumbnail;
        $host = request()->getSchemeAndHttpHost();
        return $host . '/storage/' . $this->thumbnail;
    }

    protected $appends = ['thumbnail_url'];

    /**
     * Scout: fields được tìm kiếm
     */
    public function toSearchableArray(): array
    {
        return [
            'id'        => $this->id,
            'title'     => $this->title,
            'summary'   => $this->summary,
            'is_active' => $this->is_active,
        ];
    }
}
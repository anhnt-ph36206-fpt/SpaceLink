<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class News extends Model
{
    use SoftDeletes;

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
}
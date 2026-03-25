<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Comment extends Model
{
    protected $fillable = [
        'user_id',
        'product_id',
        'parent_id',
        'content',
        'is_hidden',
        'status',
    ];

    protected $casts = [
        'is_hidden' => 'boolean',
    ];

    /**
     * Relationships
     */

    // Comment belongs to user
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Comment belongs to product
    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    // Self-reference: parent comment
    public function parent()
    {
        return $this->belongsTo(Comment::class, 'parent_id');
    }

    // Self-reference: replies
    public function replies()
    {
        return $this->hasMany(Comment::class, 'parent_id')
                    ->where('is_hidden', false)
                    ->where('status', 'approved')
                    ->with('user:id,name,avatar')
                    ->latest();
    }

    // Comment has many reports
    public function reports()
    {
        return $this->hasMany(CommentReport::class);
    }

    // ─── Scopes ───────────────────────────────────────────────────────────────

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved')->where('is_hidden', false);
    }

    public function scopeTopLevel($query)
    {
        return $query->whereNull('parent_id');
    }

    public function scopeForProduct($query, int $productId)
    {
        return $query->where('product_id', $productId);
    }
}
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CommentReport extends Model
{
    public $timestamps = false;

    protected $fillable = [
        'comment_id',
        'user_id',
        'reason',
        'description',
        'status',
        'resolved_by',
        'resolved_at',
    ];

    protected $casts = [
        'resolved_at' => 'datetime',
    ];

    /**
     * Relationships
     */

    // Report belongs to comment
    public function comment()
    {
        return $this->belongsTo(Comment::class);
    }

    // Report belongs to user (reporter)
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    // Resolved by user
    public function resolvedBy()
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}
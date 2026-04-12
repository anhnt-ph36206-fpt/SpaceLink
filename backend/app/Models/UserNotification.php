<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserNotification extends Model
{
    protected $table = 'notifications';

    protected $fillable = [
        'user_id',
        'type',
        'title',
        'content',
        'order_id',
        'is_read',
    ];

    protected $casts = [
        'is_read' => 'boolean',
    ];

    /**
     * Helper tĩnh để tạo thông báo nhanh cho user từ bất kỳ controller nào.
     */
    public static function notify(int $userId, string $type, string $title, string $content, ?int $orderId = null): self
    {
        return self::create([
            'user_id'  => $userId,
            'type'     => $type,
            'title'    => $title,
            'content'  => $content,
            'order_id' => $orderId,
            'is_read'  => false,
        ]);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}

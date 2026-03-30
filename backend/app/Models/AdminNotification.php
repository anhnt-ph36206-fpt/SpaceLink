<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AdminNotification extends Model
{
    protected $fillable = [
        'type',
        'title',
        'body',
        'order_id',
        'is_read',
    ];

    protected $casts = [
        'is_read' => 'boolean',
    ];

    /**
     * Helper tĩnh để tạo thông báo nhanh từ bất kỳ controller nào.
     */
    public static function notify(string $type, string $title, string $body, ?int $orderId = null): self
    {
        return self::create([
            'type'     => $type,
            'title'    => $title,
            'body'     => $body,
            'order_id' => $orderId,
            'is_read'  => false,
        ]);
    }
}

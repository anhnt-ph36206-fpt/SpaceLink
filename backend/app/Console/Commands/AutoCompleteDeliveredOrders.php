<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Models\OrderStatusHistory;
use App\Models\UserNotification;
use Illuminate\Console\Command;

/**
 * Tự động chuyển đơn từ "delivered" → "completed" sau 1 tiếng.
 *
 * Lý do: Nếu khách không bấm "Đã nhận hàng" sau 1 tiếng kể từ ngày giao,
 * hệ thống tự hoàn tất đơn thay họ (giống Shopee/Lazada).
 *
 * Schedule: chạy mỗi phút.
 */
class AutoCompleteDeliveredOrders extends Command
{
    protected $signature   = 'orders:auto-complete-delivered';
    protected $description = 'Tự động hoàn thành ("completed") các đơn đã giao hàng ("delivered") sau 1 tiếng.';

    /** Số giờ tự động hoàn tất kể từ delivered_at */
    private const HOURS_THRESHOLD = 1;

    public function handle(): void
    {
        $cutoff = now()->subHours(self::HOURS_THRESHOLD);

        // Lấy đơn: status=delivered VÀ delivered_at cách đây ít nhất 1 tiếng
        $orders = Order::where('status', 'delivered')
            ->whereNotNull('delivered_at')
            ->where('delivered_at', '<=', $cutoff)
            ->get();

        $count = 0;
        foreach ($orders as $order) {
            $updateData = [
                'status'       => 'completed',
                'completed_at' => now(),
            ];

            // Safety net: COD delivered nhưng chưa đánh dấu paid
            if ($order->payment_method === 'cod' && $order->payment_status !== 'paid') {
                $updateData['payment_status'] = 'paid';
            }

            $order->update($updateData);

            OrderStatusHistory::create([
                'order_id'   => $order->id,
                'from_status'=> 'delivered',
                'to_status'  => 'completed',
                'note'       => 'Hệ thống tự động hoàn thành sau ' . self::HOURS_THRESHOLD . ' tiếng giao hàng.',
                'changed_by' => null,
            ]);

            // Thông báo cho khách
            if ($order->user_id) {
                UserNotification::notify(
                    $order->user_id,
                    'order_completed',
                    '🎉 Đơn hàng đã hoàn tất',
                    "Đơn #{$order->order_code} đã được hệ thống tự động xác nhận hoàn tất sau " . self::HOURS_THRESHOLD . " tiếng giao hàng.",
                    $order->id
                );
            }

            $count++;
        }

        $this->info("Đã tự động hoàn thành {$count} đơn hàng.");
    }
}

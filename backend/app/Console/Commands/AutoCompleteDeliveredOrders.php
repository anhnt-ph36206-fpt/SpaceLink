<?php

namespace App\Console\Commands;

use App\Models\Order;
use App\Models\OrderStatusHistory;
use Illuminate\Console\Command;

/**
 * Tự động chuyển đơn từ "delivered" → "completed" sau 3 ngày.
 *
 * Lý do: Nếu khách không bấm "Đã nhận hàng" sau 3 ngày kể từ ngày giao,
 * hệ thống tự hoàn tất đơn thay họ (giống Shopee/Lazada).
 *
 * Schedule: chạy hàng ngày lúc 02:00 để tránh giờ cao điểm.
 */
class AutoCompleteDeliveredOrders extends Command
{
    protected $signature   = 'orders:auto-complete-delivered';
    protected $description = 'Tự động hoàn thành ("completed") các đơn đã giao hàng ("delivered") sau 3 ngày.';

    /** Số ngày tự động hoàn tất kể từ delivered_at */
    private const DAYS_THRESHOLD = 3;

    public function handle(): void
    {
        $cutoff = now()->subDays(self::DAYS_THRESHOLD);

        // Lấy đơn: status=delivered VÀ delivered_at cách đây ít nhất 3 ngày
        $orders = Order::where('status', 'delivered')
            ->whereNotNull('delivered_at')
            ->where('delivered_at', '<=', $cutoff)
            ->get();

        $count = 0;
        foreach ($orders as $order) {
            $order->update([
                'status'       => 'completed',
                'completed_at' => now(),
            ]);

            OrderStatusHistory::create([
                'order_id'   => $order->id,
                'from_status'=> 'delivered',
                'to_status'  => 'completed',
                'note'       => 'Hệ thống tự động hoàn thành sau ' . self::DAYS_THRESHOLD . ' ngày giao hàng.',
                'changed_by' => null,
            ]);

            $count++;
        }

        $this->info("Đã tự động hoàn thành {$count} đơn hàng.");
    }
}

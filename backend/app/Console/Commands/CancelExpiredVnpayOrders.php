<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class CancelExpiredVnpayOrders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'orders:cancel-expired-vnpay';

    protected $description = 'Tự động hủy các đơn hàng thanh toán VNPAY chưa được thanh toán sau 15 phút';

    public function handle()
    {
        $orders = \App\Models\Order::where('payment_method', 'vnpay')
            ->where('payment_status', 'unpaid')
            ->where('created_at', '<', now()->subMinutes(15))
            ->get();

        $count = 0;
        foreach ($orders as $order) {
            // Hoàn tồn kho
            foreach ($order->orderItems as $item) {
                if ($item->variant_id) {
                    \App\Models\ProductVariant::where('id', $item->variant_id)->increment('quantity', $item->quantity);
                }
            }

            // Xóa Vocher Usage nếu có
            if ($order->voucher_id) {
                \App\Models\VoucherUsage::where('voucher_id', $order->voucher_id)
                    ->where('user_id', $order->user_id)
                    ->delete();
                \App\Models\Voucher::where('id', $order->voucher_id)->decrement('used_count');
            }

            // Đổi trạng thái Huỷ
            $order->update([
                'status' => 'cancelled',
                'payment_status' => 'unpaid',
                'note' => ltrim($order->note.' [Hệ thống tự động hủy do giao dịch VNPAY quá hạn 15 phút]'),
            ]);

            // Ghi Log
            \App\Models\OrderStatusHistory::create([
                'order_id' => $order->id,
                'status' => 'cancelled',
                'note' => 'Hệ thống tự động hủy do giao dịch VNPAY quá hạn 15 phút',
            ]);

            $count++;
        }

        $this->info("Đã hủy thành công {$count} đơn hàng VNPAY quá hạn.");
    }
}

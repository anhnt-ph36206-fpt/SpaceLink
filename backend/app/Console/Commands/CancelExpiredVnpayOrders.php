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

    protected $description = 'Tự động hủy các đơn hàng thanh toán VNPAY chưa được thanh toán sau X phút (mặc định 3 phút, cấu hình qua VNPAY_ORDER_EXPIRE_MINUTES)';

    public function handle()
    {
        $expireMinutes = (int) env('VNPAY_ORDER_EXPIRE_MINUTES', 3);

        $orders = \App\Models\Order::with('items')
            ->where('payment_method', 'vnpay')
            ->where('status', 'pending')
            ->where('payment_status', 'unpaid')
            ->where('created_at', '<', now()->subMinutes($expireMinutes))
            ->get();

        if ($orders->isEmpty()) {
            $this->info('Không có đơn VNPAY quá hạn nào cần hủy.');
            return 0;
        }

        $count = 0;
        foreach ($orders as $order) {
            \Illuminate\Support\Facades\DB::transaction(function () use ($order, &$count, $expireMinutes) {
                // Lazy deduction: đơn pending CHƯA trừ kho → KHÔNG hoàn kho
                $variantIds = [];
                foreach ($order->items as $item) {
                    if ($item->variant_id) {
                        $variantIds[] = $item->variant_id;
                    }
                }

                // Xóa Voucher Usage nếu có
                if ($order->voucher_id) {
                    \App\Models\VoucherUsage::where('voucher_id', $order->voucher_id)
                        ->where('user_id', $order->user_id)
                        ->delete();
                    \App\Models\Voucher::where('id', $order->voucher_id)->decrement('used_count');
                }

                // Đổi trạng thái Hủỷ
                $order->update([
                    'status'           => 'cancelled',
                    'cancelled_reason' => "Hệ thống tự động hủy do giao dịch VNPAY quá hạn {$expireMinutes} phút.",
                    'cancelled_at'     => now(),
                ]);

                // Ghi Log
                \App\Models\OrderStatusHistory::create([
                    'order_id'    => $order->id,
                    'from_status' => 'pending',
                    'to_status'   => 'cancelled',
                    'note'        => "Hệ thống tự động hủy do giao dịch VNPAY quá hạn {$expireMinutes} phút.",
                ]);

                // Xóa cart items liên quan
                if (count($variantIds) > 0 && $order->user_id) {
                    \App\Models\Cart::where('user_id', $order->user_id)
                        ->whereIn('variant_id', $variantIds)
                        ->delete();
                }

                $count++;
            });
        }

        $this->info("Đã hủy thành công {$count} đơn hàng VNPAY quá hạn.");
        return 0;
    }
}

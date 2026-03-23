<?php

namespace App\Console\Commands;

use App\Models\Cart;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ReleaseExpiredCartReservations extends Command
{
    protected $signature = 'cart:release-expired';
    protected $description = 'Giải phóng giỏ hàng người dùng đã hết hạn giữ và hoàn lại tồn kho';

    public function handle(): int
    {
        // Lấy các cart item của user đã hết hạn giữ hàng
        $expired = Cart::whereNotNull('user_id')
            ->whereNotNull('reserved_until')
            ->where('reserved_until', '<', now())
            ->get();

        if ($expired->isEmpty()) {
            $this->info('Không có giỏ hàng hết hạn.');
            return self::SUCCESS;
        }

        $count = 0;

        DB::transaction(function () use ($expired, &$count) {
            foreach ($expired as $item) {
                try {
                    $variant = ProductVariant::lockForUpdate()->find($item->variant_id);
                    if ($variant) {
                        $variant->increment('quantity', $item->quantity);
                    }
                    Product::where('id', $item->product_id)->increment('quantity', $item->quantity);
                    $item->delete();
                    $count++;
                } catch (\Exception $e) {
                    Log::error("Lỗi khi giải phóng cart item #{$item->id}: " . $e->getMessage());
                }
            }
        });

        $this->info("Đã giải phóng {$count} giỏ hàng hết hạn và hoàn lại tồn kho.");
        return self::SUCCESS;
    }
}

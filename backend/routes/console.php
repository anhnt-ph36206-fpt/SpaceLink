<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

use Illuminate\Support\Facades\Schedule;
// Tự động hủy đơn hàng VNPAY quá hạn 15 phút
Schedule::command('orders:cancel-expired-vnpay')->everyMinute();

// Tự động hoàn thành đơn "delivered" sau 1 tiếng (chạy mỗi phút)
Schedule::command('orders:auto-complete-delivered')->everyMinute();

// Giải phóng giỏ hàng hết hạn, hoàn lại tồn kho mỗi 5 phút
Schedule::command('cart:release-expired')->everyFiveMinutes();

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Thời hạn thanh toán VNPAY: null = không trong chờ VNPAY, có giá trị = hết hạn tự hủy
            $table->timestamp('vnpay_expired_at')->nullable()->after('payment_status');
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn('vnpay_expired_at');
        });
    }
};

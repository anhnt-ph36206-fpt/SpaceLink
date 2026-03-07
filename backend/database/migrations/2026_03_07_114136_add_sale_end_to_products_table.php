<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // Hẹn giờ kết thúc flash sale (DATN có, SpaceLink thiếu)
            $table->dateTime('sale_end')->nullable()->after('sale_price')
                ->comment('Thời điểm hết hạn sale price, null = không giới hạn');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropColumn('sale_end');
        });
    }
};

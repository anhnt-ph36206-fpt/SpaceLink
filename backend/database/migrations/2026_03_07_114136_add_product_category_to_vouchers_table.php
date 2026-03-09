<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('vouchers', function (Blueprint $table) {
            // Voucher áp dụng riêng cho 1 sản phẩm (null = tất cả SP)
            $table->unsignedBigInteger('product_id')->nullable()->after('is_active')
                ->comment('Chỉ áp dụng cho SP này, null = tất cả');
            // Voucher áp dụng riêng cho 1 danh mục (null = tất cả danh mục)
            $table->unsignedBigInteger('category_id')->nullable()->after('product_id')
                ->comment('Chỉ áp dụng cho danh mục này, null = tất cả');

            $table->foreign('product_id')
                ->references('id')->on('products')->nullOnDelete();
            $table->foreign('category_id')
                ->references('id')->on('categories')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('vouchers', function (Blueprint $table) {
            $table->dropForeign(['product_id']);
            $table->dropForeign(['category_id']);
            $table->dropColumn(['product_id', 'category_id']);
        });
    }
};

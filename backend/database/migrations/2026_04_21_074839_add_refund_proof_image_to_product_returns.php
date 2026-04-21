<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('product_returns', function (Blueprint $table) {
            $table->string('refund_proof_image', 500)->nullable()->after('transaction_code')
                  ->comment('Ảnh bằng chứng chuyển khoản hoàn tiền (admin upload)');
        });
    }

    public function down(): void
    {
        Schema::table('product_returns', function (Blueprint $table) {
            $table->dropColumn('refund_proof_image');
        });
    }
};

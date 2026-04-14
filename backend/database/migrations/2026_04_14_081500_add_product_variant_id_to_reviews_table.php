<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->unsignedBigInteger('product_variant_id')->nullable()->after('order_item_id');
            $table->foreign('product_variant_id')
                  ->references('id')
                  ->on('product_variants')
                  ->nullOnDelete();
            $table->index('product_variant_id', 'idx_review_variant');
        });
    }

    public function down(): void
    {
        Schema::table('reviews', function (Blueprint $table) {
            $table->dropForeign(['product_variant_id']);
            $table->dropIndex('idx_review_variant');
            $table->dropColumn('product_variant_id');
        });
    }
};

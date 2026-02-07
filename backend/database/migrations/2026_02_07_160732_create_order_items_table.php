<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_items', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('order_id');
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('variant_id')->nullable();

            $table->string('product_name', 255);
            $table->string('product_image', 255)->nullable();
            $table->string('product_sku', 100)->nullable();
            $table->json('variant_info')->nullable();

            $table->decimal('price', 15, 2);
            $table->unsignedInteger('quantity');
            $table->decimal('total', 15, 2);

            $table->boolean('is_reviewed')->default(false);
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
            $table->foreign('product_id')->references('id')->on('products');
            $table->foreign('variant_id')->references('id')->on('product_variants')->nullOnDelete();
            $table->index('order_id', 'idx_order');
            $table->index('is_reviewed', 'idx_reviewed');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_items');
    }
};
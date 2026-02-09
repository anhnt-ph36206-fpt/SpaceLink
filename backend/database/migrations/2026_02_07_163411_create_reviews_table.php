<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('order_item_id');

            $table->unsignedTinyInteger('rating');
            $table->text('content')->nullable();
            $table->json('images')->nullable();
            $table->boolean('is_hidden')->default(false);
            $table->text('admin_reply')->nullable();
            $table->timestamp('replied_at')->nullable();

            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

            $table->unique('order_item_id', 'unique_review');
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
            $table->foreign('order_item_id')->references('id')->on('order_items')->cascadeOnDelete();

            $table->index('product_id', 'idx_product');
            $table->index('rating', 'idx_rating');
            $table->index('is_hidden', 'idx_hidden');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};
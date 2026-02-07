<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_images', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('product_id');
            $table->string('image_path', 255);
            $table->boolean('is_primary')->default(false);
            $table->integer('display_order')->default(0);
            $table->timestamp('created_at')->useCurrent();

            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
            $table->index('product_id', 'idx_product');
            $table->index('is_primary', 'idx_primary');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_images');
    }
};
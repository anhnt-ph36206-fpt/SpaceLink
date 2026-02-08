<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('comments', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('user_id');
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('parent_id')->nullable();

            $table->text('content');
            $table->boolean('is_hidden')->default(false);
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('approved');

            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
            $table->foreign('parent_id')->references('id')->on('comments')->cascadeOnDelete();

            $table->index('product_id', 'idx_product');
            $table->index('parent_id', 'idx_parent');
            $table->index('status', 'idx_status');
            $table->index('is_hidden', 'idx_hidden');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('comments');
    }
};
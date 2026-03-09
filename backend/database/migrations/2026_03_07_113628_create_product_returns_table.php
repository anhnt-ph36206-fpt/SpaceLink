<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_returns', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('order_id');
            $table->unsignedBigInteger('user_id');

            $table->string('reason', 255)->nullable();
            $table->enum('status', ['pending', 'approved', 'rejected', 'refunded'])->default('pending');

            // Lý do từ chối (admin fill khi reject)
            $table->string('reason_for_refusal', 255)->nullable();

            // Thông tin hoàn tiền
            $table->string('refund_bank', 255)->nullable();
            $table->string('refund_account_name', 255)->nullable();
            $table->string('refund_account_number', 255)->nullable();
            $table->decimal('refund_amount', 15, 2)->nullable();
            $table->string('transaction_code', 255)->nullable();

            // Danh sách SP trong đơn muốn trả (JSON array of order_item_ids)
            $table->json('items')->nullable();

            $table->timestamps();

            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();

            $table->index('order_id', 'idx_order');
            $table->index('user_id', 'idx_user');
            $table->index('status', 'idx_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_returns');
    }
};

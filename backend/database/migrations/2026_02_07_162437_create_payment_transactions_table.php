<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_transactions', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('order_id');
            $table->string('transaction_id', 255)->unique()->nullable();
            $table->string('payment_method', 50);
            $table->decimal('amount', 15, 2);
            $table->enum('status', ['pending', 'processing', 'success', 'failed', 'refunded', 'cancelled'])->default('pending');
            $table->string('bank_code', 50)->nullable();
            $table->string('response_code', 50)->nullable();
            $table->text('response_message')->nullable();
            $table->json('response_data')->nullable();
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

            $table->foreign('order_id')->references('id')->on('orders')->cascadeOnDelete();
            $table->index('transaction_id', 'idx_transaction');
            $table->index('status', 'idx_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payment_transactions');
    }
};
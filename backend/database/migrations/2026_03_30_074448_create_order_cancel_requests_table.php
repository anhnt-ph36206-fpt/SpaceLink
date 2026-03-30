<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('order_cancel_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('reason');
            $table->string('refund_bank')->nullable();
            $table->string('refund_account_name')->nullable();
            $table->string('refund_account_number')->nullable();
            // pending → approved (admin duyệt) / rejected (admin từ chối)
            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->string('transaction_code')->nullable()->comment('Mã GD hoàn tiền do admin điền');
            $table->text('admin_note')->nullable();
            $table->foreignId('processed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('processed_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('order_cancel_requests');
    }
};

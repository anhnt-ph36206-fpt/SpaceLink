<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('orders', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('order_code', 50)->unique();

            $table->string('shipping_name', 150);
            $table->string('shipping_phone', 15);
            $table->string('shipping_email', 255)->nullable();
            $table->string('shipping_province', 100);
            $table->string('shipping_district', 100);
            $table->string('shipping_ward', 100);
            $table->text('shipping_address');

            $table->decimal('subtotal', 15, 2);
            $table->decimal('discount_amount', 15, 2)->default(0.00);
            $table->decimal('shipping_fee', 15, 2)->default(0.00);
            $table->decimal('total_amount', 15, 2);

            $table->enum('status', ['pending', 'confirmed', 'processing', 'shipping', 'delivered', 'completed', 'cancelled', 'returned'])
                ->default('pending');
            $table->enum('payment_status', ['unpaid', 'paid', 'refunded', 'partial_refund'])
                ->default('unpaid');
            $table->enum('payment_method', ['cod', 'vnpay', 'momo', 'bank_transfer']);

            // voucher
            $table->unsignedBigInteger('voucher_id')->nullable();
            $table->string('voucher_code', 50)->nullable();
            $table->decimal('voucher_discount', 15, 2)->default(0.00);

            $table->text('note')->nullable();
            $table->text('admin_note')->nullable();

            $table->text('cancelled_reason')->nullable();
            $table->unsignedBigInteger('cancelled_by')->nullable();
            $table->timestamp('cancelled_at')->nullable();

            $table->timestamp('confirmed_at')->nullable();
            $table->timestamp('shipped_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('completed_at')->nullable();

            // shipping extra
            $table->string('shipping_partner', 100)->nullable();
            $table->string('tracking_code', 100)->nullable();
            $table->dateTime('estimated_delivery')->nullable();

            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

            $table->foreign('user_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('voucher_id')->references('id')->on('vouchers')->nullOnDelete();
            $table->foreign('cancelled_by')->references('id')->on('users')->nullOnDelete();

            $table->index('user_id', 'idx_user');
            $table->index('status', 'idx_status');
            $table->index('payment_status', 'idx_payment');
            $table->index('created_at', 'idx_created');
            $table->index('order_code', 'idx_code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('orders');
    }
};
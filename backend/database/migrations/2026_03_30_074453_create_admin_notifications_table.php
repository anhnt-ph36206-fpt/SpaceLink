<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('admin_notifications', function (Blueprint $table) {
            $table->id();
            $table->enum('type', [
                'new_order',
                'order_cancelled',
                'cancel_request',
                'return_request',
                'complaint',
            ]);
            $table->string('title');
            $table->string('body');
            $table->unsignedBigInteger('order_id')->nullable()->index();
            $table->boolean('is_read')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('admin_notifications');
    }
};

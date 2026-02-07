<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->onDelete('cascade');
            
            // Nếu người xem đã đăng nhập
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            
            // Nếu người xem là khách vãng lai
            $table->string('session_id')->nullable();
            $table->string('ip_address', 45)->nullable();
            
            $table->timestamp('viewed_at')->useCurrent();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_views');
    }
};
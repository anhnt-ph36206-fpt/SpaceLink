<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('carts', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('session_id', 255)->nullable();
            $table->unsignedBigInteger('product_id');
            // Lưu ý: Lúc nãy mình đặt tên bảng là 'product_variants' nên ở đây tham chiếu tới nó
            $table->unsignedBigInteger('variant_id')->nullable(); 
            $table->unsignedInteger('quantity')->default(1);
            
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

            // --- KHÓA NGOẠI ---
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('product_id')->references('id')->on('products')->cascadeOnDelete();
            $table->foreign('variant_id')->references('id')->on('product_variants')->nullOnDelete();

            // --- INDEX & UNIQUE ---
            // Đảm bảo 1 User không thể thêm trùng 1 sản phẩm (cùng biến thể) 2 lần -> phải update quantity
            $table->unique(['user_id', 'product_id', 'variant_id'], 'unique_cart_user');
            
            // Tương tự với Guest (Session)
            $table->unique(['session_id', 'product_id', 'variant_id'], 'unique_cart_session');
            
            // Index session_id để query cho nhanh
            $table->index('session_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('carts');
    }
};
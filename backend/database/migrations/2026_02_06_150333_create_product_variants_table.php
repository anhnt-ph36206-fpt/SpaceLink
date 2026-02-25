<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Tạo bảng biến thể
        Schema::create('product_variants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('product_id')->constrained('products')->onDelete('cascade');

            // SKU riêng cho từng biến thể (VD: IP15-XANH-256)
            $table->string('sku', 100)->nullable()->unique();

            // Giá riêng (VD: Màu vàng đắt hơn màu đen)
            $table->decimal('price', 15, 2);
            $table->decimal('sale_price', 15, 2)->nullable();

            // Tồn kho riêng từng biến thể
            $table->unsignedInteger('quantity')->default(0);

            // Ảnh riêng của biến thể (nếu chọn màu đỏ hiện ảnh đỏ)
            $table->string('image')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // 2. Tạo bảng trung gian (Pivot) Variant - Attribute
        // Bảng này nên nằm ở đây vì nó phụ thuộc vào product_variants vừa tạo ở trên
        Schema::create('product_variant_attributes', function (Blueprint $table) {
            // Khóa ngoại trỏ về biến thể vừa tạo
            $table->foreignId('variant_id')->constrained('product_variants')->onDelete('cascade');

            // Khóa ngoại trỏ về bảng attributes (Color, Size...)
            // CẢNH BÁO: Bảng 'attributes' phải tồn tại trước!
            $table->foreignId('attribute_id')->constrained('attributes')->onDelete('cascade');

            // Khóa chính phức hợp (để 1 biến thể không bị trùng thuộc tính)
            $table->primary(['variant_id', 'attribute_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_variant_attributes');
        Schema::dropIfExists('product_variants');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
{
    Schema::create('products', function (Blueprint $table) {
        $table->id();
        $table->foreignId('category_id')->constrained('categories')->onDelete('cascade');
        $table->foreignId('brand_id')->nullable()->constrained('brands')->nullOnDelete();
        $table->string('name');
        $table->string('slug')->unique();
        $table->string('sku', 100)->nullable()->unique();

        // --- BỔ SUNG DÒNG NÀY ---
        $table->string('thumbnail')->nullable(); // Ảnh đại diện sản phẩm
        // ------------------------

        $table->text('description')->nullable();
        $table->longText('content')->nullable();
        $table->decimal('price', 15, 2);
        $table->decimal('sale_price', 15, 2)->nullable();
        $table->unsignedInteger('quantity')->default(0);
        $table->unsignedInteger('sold_count')->default(0);
        $table->unsignedInteger('view_count')->default(0);
        $table->boolean('is_featured')->default(false);
        $table->boolean('is_active')->default(true);
        $table->string('meta_title')->nullable();
        $table->text('meta_description')->nullable();
        $table->timestamps();
        $table->softDeletes();
    });
}

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
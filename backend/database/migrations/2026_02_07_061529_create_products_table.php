<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('category_id');
            $table->unsignedBigInteger('brand_id')->nullable();

            $table->string('name', 255);
            $table->string('slug', 255)->unique();
            $table->string('sku', 100)->unique()->nullable();

            $table->text('description')->nullable();
            $table->longText('content')->nullable();

            $table->decimal('price', 15, 2);
            $table->decimal('sale_price', 15, 2)->nullable();

            $table->unsignedInteger('quantity')->default(0);
            $table->unsignedInteger('sold_count')->default(0);
            $table->unsignedInteger('view_count')->default(0);

            $table->boolean('is_featured')->default(false);
            $table->boolean('is_active')->default(true);

            $table->string('meta_title', 255)->nullable();
            $table->text('meta_description')->nullable();

            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
            $table->softDeletes();

            $table->foreign('category_id')->references('id')->on('categories');
            $table->foreign('brand_id')->references('id')->on('brands')->nullOnDelete();

            $table->index('category_id', 'idx_category');
            $table->index('brand_id', 'idx_brand');
            $table->index('price', 'idx_price');
            $table->index('sold_count', 'idx_sold');
            $table->index('view_count', 'idx_view');
            $table->index('is_featured', 'idx_featured');
            $table->index('is_active', 'idx_active');

            $table->fullText(['name', 'description'], 'ft_search');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
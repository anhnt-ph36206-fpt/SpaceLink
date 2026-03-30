<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // FULLTEXT index cho MySQL Scout database driver
            // Cho phép tìm kiếm nhanh theo tên và mô tả sản phẩm
            $table->fullText(['name', 'description'], 'products_name_description_fulltext');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropFullText('products_name_description_fulltext');
        });
    }
};

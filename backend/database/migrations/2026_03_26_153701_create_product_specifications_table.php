<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('product_specifications', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('product_id');
            $table->unsignedBigInteger('spec_group_id');
            $table->string('name', 150)->comment('Tên thông số, VD: Công nghệ màn hình');
            $table->string('value', 500)->comment('Giá trị, VD: AMOLED, 6.7 inch');
            $table->integer('display_order')->default(0);
            $table->timestamps();

            $table->foreign('product_id')
                  ->references('id')->on('products')
                  ->cascadeOnDelete();

            $table->foreign('spec_group_id')
                  ->references('id')->on('spec_groups')
                  ->cascadeOnDelete();

            $table->index(['product_id', 'spec_group_id'], 'idx_product_spec_group');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_specifications');
    }
};

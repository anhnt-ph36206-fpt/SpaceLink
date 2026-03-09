<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('banners', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('title', 255);
            $table->string('image_url', 255);
            $table->text('description')->nullable();
            $table->string('link_url', 255)->nullable();
            $table->integer('display_order')->default(0);
            $table->timestamp('start_date')->nullable();
            $table->timestamp('end_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('is_active', 'idx_active');
            $table->index(['start_date', 'end_date'], 'idx_dates');
            $table->index('display_order', 'idx_order');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('banners');
    }
};

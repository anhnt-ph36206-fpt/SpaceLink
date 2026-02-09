<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->string('name', 255);
            $table->string('slug', 255)->unique();
            $table->string('image', 255)->nullable();
            $table->string('icon', 100)->nullable();
            $table->text('description')->nullable();
            $table->integer('display_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();
            $table->softDeletes();

            $table->foreign('parent_id')->references('id')->on('categories')->nullOnDelete();
            $table->index('parent_id', 'idx_parent');
            $table->index('slug', 'idx_slug');
            $table->index('is_active', 'idx_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};
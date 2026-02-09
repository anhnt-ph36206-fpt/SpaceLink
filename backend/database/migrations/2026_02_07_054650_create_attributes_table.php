<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('attributes', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('attribute_group_id');
            $table->string('value', 100);
            $table->string('color_code', 7)->nullable();
            $table->integer('display_order')->default(0);
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

            $table->foreign('attribute_group_id')->references('id')->on('attribute_groups')->cascadeOnDelete();
            $table->index('attribute_group_id', 'idx_group');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('attributes');
    }
};
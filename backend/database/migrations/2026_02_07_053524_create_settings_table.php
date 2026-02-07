<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('settings', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('key_name', 100)->unique();
            $table->text('value')->nullable();
            $table->enum('type', ['string', 'number', 'boolean', 'json', 'html'])->default('string');
            $table->string('group_name', 50)->default('general');
            $table->string('description', 255)->nullable();
            $table->boolean('is_public')->default(false);
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

            $table->index('group_name', 'idx_group');
            $table->index('is_public', 'idx_public');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('settings');
    }
};
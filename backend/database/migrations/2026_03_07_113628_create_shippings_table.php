<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('shippings', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('name', 255);          // Giao hàng nhanh, GHTK...
            $table->string('code', 50)->nullable(); // GHN, GHTK, VTP
            $table->string('logo', 255)->nullable();
            $table->decimal('base_fee', 15, 2)->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index('is_active', 'idx_active');
            $table->index('code', 'idx_code');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('shippings');
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
public function up(): void
{
    Schema::create('attribute_groups', function (Blueprint $table) {
        $table->id();
        $table->string('name', 100);
        $table->string('display_name', 100);
        
        // --- THÊM DÒNG NÀY ---
        $table->string('type')->default('text'); 
        // ---------------------

        $table->integer('display_order')->default(0);
        $table->timestamps();
    });
}

    public function down(): void
    {
        Schema::dropIfExists('attribute_groups');
    }
};
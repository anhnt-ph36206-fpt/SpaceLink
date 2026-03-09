<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('return_evidences', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('product_return_id');

            $table->string('file_path', 255);
            $table->string('file_type', 100)->nullable(); // image/jpeg, image/png, video/mp4

            $table->timestamp('created_at')->useCurrent();

            $table->foreign('product_return_id')
                ->references('id')
                ->on('product_returns')
                ->cascadeOnDelete();

            $table->index('product_return_id', 'idx_return');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('return_evidences');
    }
};

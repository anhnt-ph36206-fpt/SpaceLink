<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('contacts', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->string('name', 150);
            $table->string('email', 255);
            $table->string('phone', 15)->nullable();
            $table->string('subject', 255)->nullable();
            $table->text('message');
            $table->enum('status', ['unread', 'read', 'replied', 'spam'])->default('unread');
            $table->text('reply_content')->nullable();
            $table->unsignedBigInteger('replied_by')->nullable();
            $table->timestamp('replied_at')->nullable();
            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent()->useCurrentOnUpdate();

            $table->foreign('replied_by')->references('id')->on('users')->nullOnDelete();
            $table->index('status', 'idx_status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('contacts');
    }
};
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('shipping_district', 100)->nullable()->change();
        });

        Schema::table('user_addresses', function (Blueprint $table) {
            $table->string('district', 100)->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->string('shipping_district', 100)->nullable(false)->change();
        });

        Schema::table('user_addresses', function (Blueprint $table) {
            $table->string('district', 100)->nullable(false)->change();
        });
    }
};

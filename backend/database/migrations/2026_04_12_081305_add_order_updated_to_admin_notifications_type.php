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
        \Illuminate\Support\Facades\DB::statement("ALTER TABLE admin_notifications MODIFY COLUMN `type` ENUM(
            'new_order',
            'order_cancelled',
            'cancel_request',
            'return_request',
            'complaint',
            'stock_issue_vnpay',
            'order_completed',
            'order_updated'
        ) NOT NULL");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        \Illuminate\Support\Facades\DB::statement("ALTER TABLE admin_notifications MODIFY COLUMN `type` ENUM(
            'new_order',
            'order_cancelled',
            'cancel_request',
            'return_request',
            'complaint',
            'stock_issue_vnpay',
            'order_completed'
        ) NOT NULL");
    }
};

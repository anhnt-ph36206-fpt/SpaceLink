<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE admin_notifications MODIFY COLUMN `type` ENUM(
            'new_order',
            'order_cancelled',
            'cancel_request',
            'return_request',
            'complaint',
            'stock_issue_vnpay'
        ) NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE admin_notifications MODIFY COLUMN `type` ENUM(
            'new_order',
            'order_cancelled',
            'cancel_request',
            'return_request',
            'complaint'
        ) NOT NULL");
    }
};

<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Thêm 'new_question' vào enum type
        DB::statement("ALTER TABLE admin_notifications MODIFY COLUMN type ENUM(
            'new_order',
            'order_cancelled',
            'cancel_request',
            'return_request',
            'complaint',
            'new_question'
        ) NOT NULL");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE admin_notifications MODIFY COLUMN type ENUM(
            'new_order',
            'order_cancelled',
            'cancel_request',
            'return_request',
            'complaint'
        ) NOT NULL");
    }
};

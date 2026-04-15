<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Thêm 'new_question' vào enum type (giữ lại tất cả type đang có trong DB)
        DB::statement("ALTER TABLE admin_notifications MODIFY COLUMN type ENUM(
            'new_order',
            'order_cancelled',
            'cancel_request',
            'return_request',
            'complaint',
            'order_completed',
            'stock_issue_vnpay',
            'order_updated',
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
            'complaint',
            'order_completed',
            'stock_issue_vnpay',
            'order_updated'
        ) NOT NULL");
    }
};

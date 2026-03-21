<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Thêm CHECK constraint ở tầng DB để đảm bảo tồn kho không bao giờ về âm.
 * Đây là lớp bảo vệ cuối cùng sau lockForUpdate() + WHERE quantity >= qty.
 *
 * MySQL 8.0.16+ hỗ trợ CHECK constraint thực sự.
 * Với MySQL cũ hơn, constraint vẫn được tạo nhưng không enforce (graceful degradation).
 */
return new class extends Migration
{
    public function up(): void
    {
        // 1. Fix tồn kho âm hiện có (nếu có) trước khi thêm constraint
        DB::statement('UPDATE product_variants SET quantity = 0 WHERE quantity < 0');
        DB::statement('UPDATE products SET quantity = 0 WHERE quantity < 0');

        // 2. Thêm CHECK constraint cho product_variants
        try {
            DB::statement('ALTER TABLE product_variants ADD CONSTRAINT chk_variant_qty_non_negative CHECK (quantity >= 0)');
        } catch (\Exception $e) {
            // Bỏ qua nếu constraint đã tồn tại
        }

        // 3. Thêm CHECK constraint cho products
        try {
            DB::statement('ALTER TABLE products ADD CONSTRAINT chk_product_qty_non_negative CHECK (quantity >= 0)');
        } catch (\Exception $e) {
            // Bỏ qua nếu constraint đã tồn tại
        }
    }

    public function down(): void
    {
        try {
            DB::statement('ALTER TABLE product_variants DROP CONSTRAINT chk_variant_qty_non_negative');
        } catch (\Exception $e) {}

        try {
            DB::statement('ALTER TABLE products DROP CONSTRAINT chk_product_qty_non_negative');
        } catch (\Exception $e) {}
    }
};

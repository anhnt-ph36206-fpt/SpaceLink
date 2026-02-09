<?php

namespace Database\Seeders;

use App\Models\Voucher;
use Illuminate\Database\Seeder;

class VoucherSeeder extends Seeder
{
    /**
     * Dữ liệu mềm: vài voucher mẫu để test API áp mã (doc 22).
     */
    public function run(): void
    {
        $now = now();

        Voucher::firstOrCreate(
            ['code' => 'GIAM50K'],
            [
                'name'                  => 'Giảm 50.000đ',
                'description'           => 'Áp dụng cho đơn từ 300.000đ',
                'discount_type'         => 'fixed',
                'discount_value'        => 50000,
                'max_discount'          => null,
                'min_order_amount'      => 300000,
                'quantity'              => 100,
                'used_count'            => 0,
                'usage_limit_per_user'  => 2,
                'start_date'            => $now->copy()->subDay(),
                'end_date'              => $now->copy()->addMonth(),
                'is_active'             => true,
            ]
        );

        Voucher::firstOrCreate(
            ['code' => 'PERCENT10'],
            [
                'name'                  => 'Giảm 10%',
                'description'           => 'Tối đa 100.000đ, đơn từ 500.000đ',
                'discount_type'         => 'percent',
                'discount_value'        => 10,
                'max_discount'          => 100000,
                'min_order_amount'      => 500000,
                'quantity'              => 50,
                'used_count'            => 0,
                'usage_limit_per_user'  => 1,
                'start_date'            => $now->copy()->subDay(),
                'end_date'              => $now->copy()->addWeeks(2),
                'is_active'             => true,
            ]
        );
    }
}
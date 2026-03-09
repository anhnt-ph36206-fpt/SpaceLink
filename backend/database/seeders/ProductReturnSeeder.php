<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class ProductReturnSeeder extends Seeder
{
    public function run(): void
    {
        // Seeder trống — returns phụ thuộc orders đã có thật
        // Dùng khi test: tạo manual qua API hoặc Tinker
        // Ví dụ dùng Tinker:
        // App\Models\ProductReturn::create([
        //     'order_id' => 1,
        //     'user_id'  => 1,
        //     'reason'   => 'Sản phẩm bị lỗi',
        //     'status'   => 'pending',
        //     'items'    => json_encode([1, 2]),
        // ]);
    }
}

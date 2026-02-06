<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        // Xóa dữ liệu cũ để tránh trùng lặp
        DB::table('roles')->delete();

        // Tạo các Role cơ bản
        // Lưu ý: Cần đảm bảo có ID = 3 cho User thường
        DB::table('roles')->insert([
            [
                'id' => 1,
                'name' => 'admin',
                'display_name' => 'Administrator',
                'description' => 'Quản trị viên cao cấp',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 2,
                'name' => 'staff',
                'display_name' => 'Staff',
                'description' => 'Nhân viên',
                'created_at' => now(),
                'updated_at' => now(),
            ],
            [
                'id' => 3, // <--- ĐÂY LÀ ROLE MẶC ĐỊNH
                'name' => 'user',
                'display_name' => 'Customer',
                'description' => 'Khách hàng',
                'created_at' => now(),
                'updated_at' => now(),
            ]
        ]);
    }
}

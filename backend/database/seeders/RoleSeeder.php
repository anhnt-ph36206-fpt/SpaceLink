<?php
namespace Database\Seeders;

use App\Models\Role;
use Illuminate\Database\Seeder;

class RoleSeeder extends Seeder
{
    /**
     * Dữ liệu cứng: 3 role cố định (doc 22).
     * Code có thể check: $user->role->name === 'admin'.
     */
    public function run(): void
    {
        $roles = [
            ['name' => 'admin', 'display_name' => 'Quản Trị Viên', 'description' => 'Toàn quyền quản lý, truy cập'],
            ['name' => 'staff', 'display_name' => 'Nhân viên', 'description' => 'Quản lý sản phẩm, đơn hàng'],
            ['name' => 'customer', 'display_name' => 'Khách hàng', 'description' => 'Người mua hàng'],
        ];

        foreach ($roles as $role) {
            Role::firstOrCreate(
                ['name' => $role['name']],
                $role
            );
        }
    }
}

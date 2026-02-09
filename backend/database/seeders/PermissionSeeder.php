<?php
namespace Database\Seeders;

use App\Models\Permission;
use App\Models\Role;
use Illuminate\Database\Seeder;

class PermissionSeeder extends Seeder
{
    /**
     * Dữ liệu cứng: danh sách permission + gán cho roles (doc 22).
     */
    public function run(): void
    {
        $permissions = [
            ['name' => 'users.view', 'display_name' => 'Xem users', 'group_name' => 'users'],
            ['name' => 'users.create', 'display_name' => 'Tạo user', 'group_name' => 'users'],
            ['name' => 'users.update', 'display_name' => 'Sửa user', 'group_name' => 'users'],
            ['name' => 'users.delete', 'display_name' => 'Xoá user', 'group_name' => 'users'],
            ['name' => 'products.view', 'display_name' => 'Xem sản phẩm', 'group_name' => 'products'],
            ['name' => 'products.create', 'display_name' => 'Tạo sản phẩm', 'group_name' => 'products'],
            ['name' => 'products.update', 'display_name' => 'Sửa sản phẩm', 'group_name' => 'products'],
            ['name' => 'products.delete', 'display_name' => 'Xoá sản phẩm', 'group_name' => 'products'],
            ['name' => 'orders.view', 'display_name' => 'Xem đơn hàng', 'group_name' => 'orders'],
            ['name' => 'orders.update', 'display_name' => 'Cập nhật đơn', 'group_name' => 'orders'],
            ['name' => 'categories.manage', 'display_name' => 'Quản lý danh mục', 'group_name' => 'catalog'],
            ['name' => 'brands.manage', 'display_name' => 'Quản lý thương hiệu', 'group_name' => 'catalog'],
            ['name' => 'settings.manage', 'display_name' => 'Quản lý cài đặt', 'group_name' => 'settings'],
        ];

        $permissionIds = [];
        foreach ($permissions as $p) {
            $perm                      = Permission::firstOrCreate(['name' => $p['name']], $p);
            $permissionIds[$p['name']] = $perm->id;
        }

        $admin    = Role::where('name', 'admin')->first();
        $staff    = Role::where('name', 'staff')->first();
        $customer = Role::where('name', 'customer')->first();

        if ($admin) {
            $admin->permissions()->sync(Permission::pluck('id'));
        }
        if ($staff) {
            $staff->permissions()->sync(Permission::whereIn('group_name', ['products', 'orders', 'catalog'])->pluck('id'));
        }
        if ($customer) {
            $customer->permissions()->sync([]);
        }
    }
}

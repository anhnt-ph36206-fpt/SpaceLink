<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Category;
use App\Models\Brand;
use App\Models\Product;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Đảm bảo có Danh mục và Thương hiệu để gán cho sản phẩm
        $catPhone = Category::firstOrCreate(['slug' => 'dien-thoai'], ['name' => 'Điện thoại', 'is_active' => 1]);
        $catLaptop = Category::firstOrCreate(['slug' => 'laptop'], ['name' => 'Laptop', 'is_active' => 1]);

        // User::factory()->create([
        //     'name' => 'Test User',
        //     'email' => 'test@example.com',
        // ]);

        $this->call([
            // RoleSeeder::class,
            // PermissionSeeder::class,
            // UserSeeder::class,
            // UserAddressSeeder::class,
            CategorySeeder::class,
            BrandSeeder::class,
            AttributeGroupSeeder::class,
            AttributeSeeder::class,
            ProductSeeder::class,
            ProductVariantSeeder::class,
            SettingSeeder::class,
            VoucherSeeder::class,
        ]);
    }
}
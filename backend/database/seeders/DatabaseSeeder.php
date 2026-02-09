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
        // User::factory(10)->create();

        // User::factory()->create([
        //     'name' => 'Test User',
        //     'email' => 'test@example.com',
        // ]);

        $this->call([
            // RoleSeeder::class,
            // PermissionSeeder::class,
            // UserSeeder::class,
            // UserAddressSeeder::class,
            // CategorySeeder::class,
            // BrandSeeder::class,
            // ProductSeeder::class,
            // AttributeGroupSeeder::class,
            // AttributeSeeder::class,
            SettingSeeder::class,
            VoucherSeeder::class,
        ]);
    }
}

<?php

namespace Database\Seeders;

use App\Models\Brand;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class BrandSeeder extends Seeder
{
    /**
     * Dữ liệu mềm: thương hiệu mẫu cho API (doc 22).
     */
    public function run(): void
    {
        $items = [
            ['name' => 'Apple',   'description' => 'Apple Inc.',   'display_order' => 1],
            ['name' => 'Samsung', 'description' => 'Samsung Electronics', 'display_order' => 2],
            ['name' => 'Sony',    'description' => 'Sony Corporation', 'display_order' => 3],
            ['name' => 'Xiaomi',  'description' => 'Xiaomi Corporation', 'display_order' => 4],
            ['name' => 'Dell',    'description' => 'Dell Technologies', 'display_order' => 5],
            ['name'=> 'ASUS', 'description'=> 'ASUS Corporation', 'display_order' => 6],
        ];

        foreach ($items as $item) {
            $slug = Str::slug($item['name']);
            Brand::firstOrCreate(
                ['slug' => $slug],
                [
                    'name'          => $item['name'],
                    'slug'          => $slug,
                    'description'   => $item['description'],
                    'display_order' => $item['display_order'],
                    'is_active'     => true,
                ]
            );
        }
    }
}
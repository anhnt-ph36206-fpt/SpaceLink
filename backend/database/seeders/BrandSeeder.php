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
            ['name' => 'Apple',   'logo' => 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg',              'description' => 'Apple Inc.',            'display_order' => 1],
            ['name' => 'Samsung', 'logo' => 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a7/Samsung_logo.svg/1280px-Samsung_logo.svg.png?_=20250918062140', 'description' => 'Samsung Electronics', 'display_order' => 2],
            ['name' => 'Sony',    'logo' => 'https://upload.wikimedia.org/wikipedia/commons/c/ca/Sony_logo.svg',                      'description' => 'Sony Corporation',      'display_order' => 3],
            ['name' => 'Xiaomi',  'logo' => 'https://upload.wikimedia.org/wikipedia/commons/2/29/Xiaomi_logo.svg',                    'description' => 'Xiaomi Corporation',    'display_order' => 4],
            ['name' => 'Dell',    'logo' => 'https://upload.wikimedia.org/wikipedia/commons/8/82/Dell_Logo.png',                      'description' => 'Dell Technologies',     'display_order' => 5],
            ['name' => 'ASUS',    'logo' => 'https://upload.wikimedia.org/wikipedia/commons/2/2e/ASUS_Logo.svg',                      'description' => 'ASUS Corporation',      'display_order' => 6],
            ['name' => 'OPPO',    'logo' => 'https://upload.wikimedia.org/wikipedia/commons/8/8c/OPPO_LOGO_2019.svg',                  'description' => 'OPPO Electronics',      'display_order' => 7],
            ['name' => 'Lenovo',  'logo' => 'https://upload.wikimedia.org/wikipedia/commons/b/b8/Lenovo_logo_2015.svg',                'description' => 'Lenovo Group',          'display_order' => 8],
            ['name' => 'Garmin',  'logo' => 'https://upload.wikimedia.org/wikipedia/commons/3/36/Garmin_logo.svg',                    'description' => 'Garmin Ltd.',           'display_order' => 9],
            ['name' => 'Huawei',  'logo' => 'https://upload.wikimedia.org/wikipedia/commons/e/e8/Huawei_Logo.svg',                    'description' => 'Huawei Technologies',   'display_order' => 10],
        ];
        

        foreach ($items as $item) {
            $slug = Str::slug($item['name']);
            Brand::firstOrCreate(
                ['slug' => $slug],
                [
                    'name'          => $item['name'],
                    'slug'          => $slug,
                    'logo'          => $item['logo'],
                    'description'   => $item['description'],
                    'display_order' => $item['display_order'],
                    'is_active'     => true,
                ]
            );
        }
    }
}
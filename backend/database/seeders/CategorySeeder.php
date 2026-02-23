<?php

namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    /**
     * Dữ liệu mẫu: danh mục cha + danh mục con (2 cấp).
     * Cấu trúc: parent_id = null (gốc), parent_id = <id cha> (con)
     */
    public function run(): void
    {
        // ====================================================================
        // Định nghĩa cây danh mục: mỗi item có thể có 'children'
        // ====================================================================
        $tree = [
            [
                'name'          => 'Điện thoại',
                'description'   => 'Smartphone, điện thoại di động các hãng',
                'display_order' => 1,
                'children'      => [
                    ['name' => 'iPhone',        'description' => 'Điện thoại Apple iPhone',         'display_order' => 1],
                    ['name' => 'Samsung',        'description' => 'Điện thoại Samsung Galaxy',       'display_order' => 2],
                    ['name' => 'Xiaomi',         'description' => 'Điện thoại Xiaomi, Redmi, POCO',  'display_order' => 3],
                    ['name' => 'OPPO',           'description' => 'Điện thoại OPPO, Reno, Find X',   'display_order' => 4],
                    ['name' => 'Điện thoại khác', 'description' => 'Các thương hiệu khác',           'display_order' => 5],
                ],
            ],
            [
                'name'          => 'Laptop',
                'description'   => 'Máy tính xách tay, ultrabook, gaming laptop',
                'display_order' => 2,
                'children'      => [
                    ['name' => 'Laptop Gaming',     'description' => 'Laptop chuyên game, đồ hoạ',   'display_order' => 1],
                    ['name' => 'Laptop Văn phòng',  'description' => 'Laptop mỏng nhẹ, làm việc',   'display_order' => 2],
                    ['name' => 'MacBook',           'description' => 'Dòng MacBook của Apple',       'display_order' => 3],
                ],
            ],
            [
                'name'          => 'Tablet',
                'description'   => 'Máy tính bảng Android, iOS',
                'display_order' => 3,
                'children'      => [
                    ['name' => 'iPad',            'description' => 'iPad Pro, Air, Mini của Apple', 'display_order' => 1],
                    ['name' => 'Samsung Tab',     'description' => 'Samsung Galaxy Tab',            'display_order' => 2],
                    ['name' => 'Tablet khác',     'description' => 'Lenovo, Xiaomi Pad...',         'display_order' => 3],
                ],
            ],
            [
                'name'          => 'Phụ kiện',
                'description'   => 'Phụ kiện điện thoại, laptop, máy tính bảng',
                'display_order' => 4,
                'children'      => [
                    ['name' => 'Tai nghe',         'description' => 'Tai nghe có dây, không dây, AirPods', 'display_order' => 1],
                    ['name' => 'Ốp lưng & Bảo vệ','description' => 'Ốp lưng, miếng dán màn hình',         'display_order' => 2],
                    ['name' => 'Sạc & Cáp',        'description' => 'Cục sạc, cáp sạc, sạc dự phòng',     'display_order' => 3],
                    ['name' => 'Bàn phím & Chuột', 'description' => 'Bàn phím, chuột không dây',           'display_order' => 4],
                ],
            ],
            [
                'name'          => 'Đồng hồ thông minh',
                'description'   => 'Smartwatch, đồng hồ thể thao',
                'display_order' => 5,
                'children'      => [
                    ['name' => 'Apple Watch',    'description' => 'Các dòng Apple Watch',          'display_order' => 1],
                    ['name' => 'Samsung Watch',  'description' => 'Galaxy Watch, Galaxy Fit',      'display_order' => 2],
                    ['name' => 'Smartwatch khác','description' => 'Garmin, Xiaomi Band, Huawei...' , 'display_order' => 3],
                ],
            ],
        ];

        // ====================================================================
        // Chèn dữ liệu vào DB: cha trước, con sau (để có parent_id)
        // ====================================================================
        foreach ($tree as $parentData) {
            $children = $parentData['children'] ?? [];
            unset($parentData['children']); // Tách ra, không lưu trực tiếp vào DB

            $slug = Str::slug($parentData['name']);

            // firstOrCreate: tránh lỗi duplicate khi chạy seeder nhiều lần
            $parent = Category::firstOrCreate(
                ['slug' => $slug],
                [
                    'parent_id'     => null,
                    'name'          => $parentData['name'],
                    'slug'          => $slug,
                    'description'   => $parentData['description'],
                    'display_order' => $parentData['display_order'],
                    'is_active'     => true,
                ]
            );

            // Chèn các danh mục con với parent_id = $parent->id
            foreach ($children as $childData) {
                $childSlug = Str::slug($childData['name']);

                Category::firstOrCreate(
                    ['slug' => $childSlug],
                    [
                        'parent_id'     => $parent->id,
                        'name'          => $childData['name'],
                        'slug'          => $childSlug,
                        'description'   => $childData['description'],
                        'display_order' => $childData['display_order'],
                        'is_active'     => true,
                    ]
                );
            }
        }
    }
}
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
        // Thêm trường 'image' và 'icon' với url placeholder để test UI đồ họa.
        // ====================================================================
        $tree = [
            [
                'name'          => 'Điện thoại',
                'description'   => 'Smartphone, điện thoại di động các hãng',
                'image'         => 'https://placehold.co/600x400/1E90FF/white?text=Dien+thoai',
                'icon'          => 'https://placehold.co/100x100/1E90FF/white?text=D',
                'display_order' => 1,
                'children'      => [
                    ['name' => 'iPhone',          'description' => 'Điện thoại Apple iPhone',         'image' => 'https://placehold.co/600x400/EEE/31343C?text=iPhone',  'icon' => null, 'display_order' => 1],
                    ['name' => 'Samsung',         'description' => 'Điện thoại Samsung Galaxy',       'image' => 'https://placehold.co/600x400/EEE/31343C?text=Samsung', 'icon' => null, 'display_order' => 2],
                    ['name' => 'Xiaomi',          'description' => 'Điện thoại Xiaomi, Redmi, POCO',  'image' => 'https://placehold.co/600x400/EEE/31343C?text=Xiaomi',  'icon' => null, 'display_order' => 3],
                    ['name' => 'OPPO',            'description' => 'Điện thoại OPPO, Reno, Find X',   'image' => 'https://placehold.co/600x400/EEE/31343C?text=OPPO',    'icon' => null, 'display_order' => 4],
                    ['name' => 'Điện thoại khác', 'description' => 'Các thương hiệu khác',            'image' => 'https://placehold.co/600x400/EEE/31343C?text=Khac',    'icon' => null, 'display_order' => 5],
                ],
            ],
            [
                'name'          => 'Laptop',
                'description'   => 'Máy tính xách tay, ultrabook, gaming laptop',
                'image'         => 'https://placehold.co/600x400/28a745/white?text=Laptop',
                'icon'          => 'https://placehold.co/100x100/28a745/white?text=L',
                'display_order' => 2,
                'children'      => [
                    ['name' => 'Laptop Gaming',     'description' => 'Laptop chuyên game, đồ hoạ',  'image' => 'https://placehold.co/600x400/EEE/31343C?text=Gaming',   'icon' => null, 'display_order' => 1],
                    ['name' => 'Laptop Văn phòng',  'description' => 'Laptop mỏng nhẹ, làm việc',   'image' => 'https://placehold.co/600x400/EEE/31343C?text=Office',   'icon' => null, 'display_order' => 2],
                    ['name' => 'MacBook',           'description' => 'Dòng MacBook của Apple',      'image' => 'https://placehold.co/600x400/EEE/31343C?text=MacBook',  'icon' => null, 'display_order' => 3],
                ],
            ],
            [
                'name'          => 'Tablet',
                'description'   => 'Máy tính bảng Android, iOS',
                'image'         => 'https://placehold.co/600x400/FFC107/31343C?text=Tablet',
                'icon'          => 'https://placehold.co/100x100/FFC107/31343C?text=T',
                'display_order' => 3,
                'children'      => [
                    ['name' => 'iPad',            'description' => 'iPad Pro, Air, Mini của Apple', 'image' => 'https://placehold.co/600x400/EEE/31343C?text=iPad',    'icon' => null, 'display_order' => 1],
                    ['name' => 'Samsung Tab',     'description' => 'Samsung Galaxy Tab',            'image' => 'https://placehold.co/600x400/EEE/31343C?text=Galaxy',  'icon' => null, 'display_order' => 2],
                    ['name' => 'Tablet khác',     'description' => 'Lenovo, Xiaomi Pad...',         'image' => 'https://placehold.co/600x400/EEE/31343C?text=Khac',    'icon' => null, 'display_order' => 3],
                ],
            ],
            [
                'name'          => 'Phụ kiện',
                'description'   => 'Phụ kiện điện thoại, laptop, máy tính bảng',
                'image'         => 'https://placehold.co/600x400/6C757D/white?text=Phu+kien',
                'icon'          => 'https://placehold.co/100x100/6C757D/white?text=P',
                'display_order' => 4,
                'children'      => [
                    ['name' => 'Tai nghe',         'description' => 'Tai nghe có dây, không dây',       'image' => 'https://placehold.co/600x400/EEE/31343C?text=Tai+nghe', 'icon' => null, 'display_order' => 1],
                    ['name' => 'Ốp lưng & Bảo vệ','description' => 'Ốp lưng, miếng dán màn hình',       'image' => 'https://placehold.co/600x400/EEE/31343C?text=Op+lung',  'icon' => null, 'display_order' => 2],
                    ['name' => 'Sạc & Cáp',        'description' => 'Cục sạc, cáp sạc, sạc dự phòng',   'image' => 'https://placehold.co/600x400/EEE/31343C?text=Sac+cap',  'icon' => null, 'display_order' => 3],
                    ['name' => 'Bàn phím & Chuột', 'description' => 'Bàn phím, chuột không dây',         'image' => 'https://placehold.co/600x400/EEE/31343C?text=Keyboard', 'icon' => null, 'display_order' => 4],
                ],
            ],
            [
                'name'          => 'Đồng hồ thông minh',
                'description'   => 'Smartwatch, đồng hồ thể thao',
                'image'         => 'https://placehold.co/600x400/dc3545/white?text=Smartwatch',
                'icon'          => 'https://placehold.co/100x100/dc3545/white?text=W',
                'display_order' => 5,
                'children'      => [
                    ['name' => 'Apple Watch',    'description' => 'Các dòng Apple Watch',          'image' => 'https://placehold.co/600x400/EEE/31343C?text=Apple+Watch', 'icon' => null, 'display_order' => 1],
                    ['name' => 'Samsung Watch',  'description' => 'Galaxy Watch, Galaxy Fit',      'image' => 'https://placehold.co/600x400/EEE/31343C?text=Galaxy+Watch','icon' => null, 'display_order' => 2],
                    ['name' => 'Smartwatch khác','description' => 'Garmin, Xiaomi Band, Huawei...' , 'image' => 'https://placehold.co/600x400/EEE/31343C?text=Khac',        'icon' => null, 'display_order' => 3],
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
                    'image'         => $parentData['image'] ?? null,
                    'icon'          => $parentData['icon'] ?? null,
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
                        'image'         => $childData['image'] ?? null,
                        'icon'          => $childData['icon'] ?? null,
                        'description'   => $childData['description'],
                        'display_order' => $childData['display_order'],
                        'is_active'     => true,
                    ]
                );
            }
        }
    }
}
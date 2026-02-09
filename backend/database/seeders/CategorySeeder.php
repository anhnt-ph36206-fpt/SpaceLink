<?php
namespace Database\Seeders;

use App\Models\Category;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class CategorySeeder extends Seeder
{
    /**
     * Dữ liệu mềm: danh mục mẫu cho API (doc 22).
     */
    public function run(): void
    {
        $items = [
            ['name' => 'Điện thoại', 'description' => 'Smartphone, điện thoại di động', 'display_order' => 1],
            ['name' => 'Laptop', 'description' => 'Máy tính xách tay', 'display_order' => 2],
            ['name' => 'Tablet', 'description' => 'Máy tính bảng', 'display_order' => 3],
            ['name' => 'Phụ kiện', 'description' => 'Tai nghe, sạc, ốp lưng', 'display_order' => 4],
            ['name' => 'Đồng hồ', 'description' => 'Đồng hồ thông minh, đồng hồ đeo tay', 'display_order' => 5],
            ['name' => 'Tai nghe', 'description' => 'Tai nghe không dây, có dây', 'display_order' => 6],
        ];

        foreach ($items as $item) {
            $slug = Str::slug($item['name']);
            Category::firstOrCreate(
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
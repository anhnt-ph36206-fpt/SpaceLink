<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ProductSeeder extends Seeder
{
    /**
     * Dữ liệu mềm: sản phẩm mẫu + ảnh (doc 22). Đa dạng category/brand cho API.
     */
    public function run(): void
    {
        $categories = Category::all()->keyBy('id');
        $brands     = Brand::all()->keyBy('id');
        if ($categories->isEmpty() || $brands->isEmpty()) {
            $this->command->warn('Chạy CategorySeeder và BrandSeeder trước.');
            return;
        }

        $catIds = $categories->pluck('id')->toArray();

        $products = [
            ['name' => 'iPhone 15 Pro Max',     'price' => 34990000, 'sale_price' => 32990000, 'category' => 'Điện thoại', 'brand' => 'Apple',  'featured' => true],
            ['name' => 'Samsung Galaxy S24',   'price' => 24990000, 'sale_price' => null,     'category' => 'Điện thoại', 'brand' => 'Samsung', 'featured' => true],
            ['name' => 'MacBook Air M2',       'price' => 29990000, 'sale_price' => 27990000, 'category' => 'Laptop',    'brand' => 'Apple',  'featured' => true],
            ['name' => 'Dell XPS 15',          'price' => 45990000, 'sale_price' => null,     'category' => 'Laptop',    'brand' => 'Dell',   'featured' => false],
            ['name' => 'Tai nghe Sony WH-1000XM5', 'price' => 8990000, 'sale_price' => 7990000, 'category' => 'Tai nghe', 'brand' => 'Sony', 'featured' => false],
            ['name' => 'Tai nghe Xiaomi Buds 4',  'price' => 1290000, 'sale_price' => null,   'category' => 'Tai nghe', 'brand' => 'Xiaomi', 'featured' => false],
            ['name' => 'Ốp lưng iPhone 15',    'price' => 350000,   'sale_price' => 299000,   'category' => 'Phụ kiện', 'brand' => null,     'featured' => false],
            ['name' => 'Đồng hồ thông minh Galaxy Watch 6', 'price' => 7990000, 'sale_price' => 6990000, 'category' => 'Đồng hồ', 'brand' => 'Samsung', 'featured' => false],
        ];

        foreach ($products as $i => $p) {
            $cat = $categories->firstWhere('name', $p['category']);
            $brand = $p['brand'] ? $brands->firstWhere('name', $p['brand']) : null;
            $slug = Str::slug($p['name']) . '-' . ($i + 1);

            $product = Product::firstOrCreate(
                ['slug' => $slug],
                [
                    'category_id'     => $cat?->id ?? $catIds[array_rand($catIds)],
                    'brand_id'        => $brand?->id,
                    'name'            => $p['name'],
                    'slug'            => $slug,
                    'sku'             => 'SKU-' . strtoupper(Str::random(6)),
                    'description'     => 'Mô tả mẫu cho ' . $p['name'] . '. Sản phẩm chất lượng cao.',
                    'content'         => null,
                    'price'           => $p['price'],
                    'sale_price'      => $p['sale_price'],
                    'quantity'        => rand(10, 100),
                    'sold_count'      => 0,
                    'view_count'      => 0,
                    'is_featured'     => $p['featured'],
                    'is_active'       => true,
                ]
            );

            if ($product->wasRecentlyCreated && $product->images()->count() === 0) {
                ProductImage::create([
                    'product_id'    => $product->id,
                    'image_path'    => 'products/' . $product->id . '-1.jpg',
                    'is_primary'    => true,
                    'display_order' => 1,
                ]);
            }
        }
    }
}
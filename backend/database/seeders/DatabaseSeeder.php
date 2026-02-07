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

        $brandApple = Brand::firstOrCreate(['slug' => 'apple'], ['name' => 'Apple', 'is_active' => 1]);
        $brandSamsung = Brand::firstOrCreate(['slug' => 'samsung'], ['name' => 'Samsung', 'is_active' => 1]);

        // 2. Danh sách 10 sản phẩm mẫu thực tế
        $sampleProducts = [
            ['name' => 'iPhone 15 Pro Max', 'brand' => $brandApple, 'cat' => $catPhone, 'price' => 29990000],
            ['name' => 'Samsung Galaxy S24 Ultra', 'brand' => $brandSamsung, 'cat' => $catPhone, 'price' => 26500000],
            ['name' => 'MacBook Pro M3 14 inch', 'brand' => $brandApple, 'cat' => $catLaptop, 'price' => 39990000],
            ['name' => 'iPhone 14 Plus', 'brand' => $brandApple, 'cat' => $catPhone, 'price' => 19500000],
            ['name' => 'Samsung Galaxy Z Fold 5', 'brand' => $brandSamsung, 'cat' => $catPhone, 'price' => 32000000],
            ['name' => 'MacBook Air M2', 'brand' => $brandApple, 'cat' => $catLaptop, 'price' => 24500000],
            ['name' => 'Samsung Galaxy Tab S9', 'brand' => $brandSamsung, 'cat' => $catLaptop, 'price' => 15000000],
            ['name' => 'iPhone 13 128GB', 'brand' => $brandApple, 'cat' => $catPhone, 'price' => 13500000],
            ['name' => 'Samsung Galaxy A54', 'brand' => $brandSamsung, 'cat' => $catPhone, 'price' => 8500000],
            ['name' => 'iPhone 15 Pink 128GB', 'brand' => $brandApple, 'cat' => $catPhone, 'price' => 19990000],
        ];

        foreach ($sampleProducts as $index => $item) {
            Product::create([
                'category_id'      => $item['cat']->id,
                'brand_id'         => $item['brand']->id,
                'name'             => $item['name'],
                'slug'             => Str::slug($item['name']) . '-' . rand(100, 999),
                'sku'              => 'SL-' . strtoupper(Str::random(8)),
                'thumbnail'        => 'https://picsum.photos/seed/' . $index . '/400/400', // Ảnh mẫu ngẫu nhiên
                'description'      => 'Mô tả ngắn gọn cho sản phẩm ' . $item['name'],
                'content'          => 'Đây là nội dung chi tiết của sản phẩm ' . $item['name'] . '. Sản phẩm chính hãng tại SpaceLink.',
                'price'            => $item['price'],
                'sale_price'       => $item['price'] * 0.9, // Giảm giá 10% cho tất cả sản phẩm mẫu
                'quantity'         => rand(10, 100),
                'sold_count'       => rand(0, 50),
                'view_count'       => rand(100, 1000),
                'is_featured'      => ($index < 3) ? true : false, // 3 sản phẩm đầu là hàng nổi bật
                'is_active'        => true,
                'meta_title'       => $item['name'] . ' giá tốt nhất tại SpaceLink',
                'meta_description' => 'Mua ' . $item['name'] . ' chính hãng, trả góp 0% tại hệ thống cửa hàng SpaceLink.',
            ]);
        }

        $this->command->info('Đã bơm thành công 10 sản phẩm mẫu vào database!');
    }
}
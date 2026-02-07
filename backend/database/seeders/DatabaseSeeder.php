<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Category;
use App\Models\Brand;
use App\Models\AttributeGroup;
use App\Models\Attribute;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // 1. Tạo Danh mục & Thương hiệu
        $catPhone = Category::create(['name' => 'Điện thoại', 'slug' => 'dien-thoai']);
        $brandApple = Brand::create(['name' => 'Apple', 'slug' => 'apple']);

        // 2. Tạo Nhóm Thuộc tính (Màu sắc & Bộ nhớ)
        $groupColor = AttributeGroup::create(['name' => 'color', 'display_name' => 'Màu sắc', 'type' => 'color']);
        $groupRam = AttributeGroup::create(['name' => 'storage', 'display_name' => 'Dung lượng', 'type' => 'text']);

        // 3. Tạo Giá trị Thuộc tính
        $attrBlack = Attribute::create(['attribute_group_id' => $groupColor->id, 'value' => 'Titan Đen', 'color_code' => '#000000']);
        $attrWhite = Attribute::create(['attribute_group_id' => $groupColor->id, 'value' => 'Titan Trắng', 'color_code' => '#F0F0F0']);
        $attr256 = Attribute::create(['attribute_group_id' => $groupRam->id, 'value' => '256GB']);

        // 4. TẠO SẢN PHẨM IPHONE 15 PRO MAX
        $product = Product::create([
            'category_id' => $catPhone->id,
            'brand_id' => $brandApple->id,
            'name' => 'iPhone 15 Pro Max',
            'slug' => 'iphone-15-pro-max',
            'sku' => 'IP15PM',
            'thumbnail' => 'https://via.placeholder.com/300x300.png?text=iPhone+Thumb',
            'price' => 29000000,
            'content' => 'Nội dung chi tiết sản phẩm...',
            'is_active' => true,
        ]);

        // 4.1 Tạo ảnh phụ (Gallery)
        ProductImage::create(['product_id' => $product->id, 'image_path' => 'https://via.placeholder.com/600?text=View1', 'display_order' => 1]);
        ProductImage::create(['product_id' => $product->id, 'image_path' => 'https://via.placeholder.com/600?text=View2', 'display_order' => 2]);

        // 4.2 TẠO BIẾN THỂ (Màu Đen - 256GB)
        $variant1 = ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'IP15-BLK-256',
            'price' => 29500000,
            'quantity' => 10,
            'image' => 'https://via.placeholder.com/300?text=Black',
        ]);
        // Gắn thuộc tính: Đen + 256GB
        $variant1->attributes()->attach([$attrBlack->id, $attr256->id]);

        // 4.3 TẠO BIẾN THỂ (Màu Trắng - 256GB)
        $variant2 = ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'IP15-WHT-256',
            'price' => 29500000,
            'quantity' => 5,
            'image' => 'https://via.placeholder.com/300?text=White',
        ]);
        $variant2->attributes()->attach([$attrWhite->id, $attr256->id]);
    }
}
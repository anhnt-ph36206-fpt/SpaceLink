<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Attribute;
use App\Models\AttributeGroup;
use Illuminate\Support\Str;

class ProductVariantSeeder extends Seeder
{
    /**
     * Tạo biến thể cho sản phẩm (Màu + Size)
     */
    public function run(): void
    {
        $products = Product::all();
        $colorGroup = AttributeGroup::where('name', 'color')->first();
        $sizeGroup  = AttributeGroup::where('name', 'size')->first();

        if (!$colorGroup || !$sizeGroup) {
            $this->command->warn('Cần chạy AttributeGroupSeeder trước.');
            return;
        }

        // Lấy danh sách ID thuộc tính màu và size
        $colorIds = Attribute::where('attribute_group_id', $colorGroup->id)->pluck('id')->toArray();
        $sizeIds  = Attribute::where('attribute_group_id', $sizeGroup->id)->pluck('id')->toArray();

        // Với mỗi sản phẩm, tạo ngẫu nhiên 2-4 biến thể
        foreach ($products as $product) {
            // Chỉ tạo biến thể cho các sản phẩm chưa có biến thể
            if ($product->variants()->count() > 0) {
                continue;
            }

            $numVariants = rand(2, 4);

            for ($i = 0; $i < $numVariants; $i++) {
                // Random Attributes
                $randomColorId = $colorIds[array_rand($colorIds)];
                $randomSizeId = $sizeIds[array_rand($sizeIds)];
                
                // Tạo Variant
                $variant = ProductVariant::create([
                    'product_id' => $product->id,
                    'sku'        => $product->sku . '-V' . ($i + 1),
                    'price'      => $product->price + rand(0, 500000), // Giá biến thể có thể chênh lệch
                    'sale_price' => $product->sale_price ? $product->sale_price + rand(0, 500000) : null,
                    'quantity'   => rand(5, 50),
                    'image'      => null, // Có thể update ảnh sau
                    'is_active'  => true,
                ]);

                // Gán thuộc tính (pivot table)
                // attach() nhận vào array ids
                $variant->attributes()->attach([$randomColorId, $randomSizeId]);
            }
        }
    }
}

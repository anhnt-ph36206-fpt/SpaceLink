<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Attribute;
use App\Models\AttributeGroup;

class ProductVariantSeeder extends Seeder
{
    /**
     * Tạo biến thể thông minh cho sản phẩm (Màu sắc + Phiên bản RAM/ROM).
     * Phân loại tự động theo Hãng (Apple, Samsung...) và Danh mục (Điện thoại, Laptop...).
     */
    public function run(): void
    {
        $products = Product::with(['brand', 'category'])->get();
        $colorGroup = AttributeGroup::where('name', 'color')->first();
        $versionGroup  = AttributeGroup::where('name', 'version')->first();

        if (!$colorGroup || !$versionGroup) {
            $this->command->warn('Cần chạy AttributeGroupSeeder và AttributeSeeder trước.');
            return;
        }

        // 1. Kéo toàn bộ từ điển Thuộc tính ra và map theo tên
        $colors = Attribute::where('attribute_group_id', $colorGroup->id)->get()->keyBy('value');
        $versions = Attribute::where('attribute_group_id', $versionGroup->id)->get()->keyBy('value');

        // 2. Phân nhóm thông minh theo MÀU SẮC
        $appleColors = array_filter([
            $colors['Titan Đen']->id ?? null, $colors['Titan Trắng']->id ?? null, 
            $colors['Titan Tự nhiên']->id ?? null, $colors['Space Grey']->id ?? null, 
            $colors['Silver']->id ?? null, $colors['Starlight']->id ?? null, $colors['Midnight']->id ?? null
        ]);
        $samsungColors = array_filter([
            $colors['Đen Classic']->id ?? null, $colors['Trắng Classic']->id ?? null, 
            $colors['Xanh Sky Blue']->id ?? null, $colors['Tím Cobalt']->id ?? null
        ]);
        $defaultColors = array_filter([
            $colors['Đen Classic']->id ?? null, $colors['Trắng Classic']->id ?? null
        ]);

        // 3. Phân nhóm thông minh theo PHIÊN BẢN (RAM/ROM)
        $phoneVersions = array_filter([
            $versions['8GB | 128GB']->id ?? null, $versions['8GB | 256GB']->id ?? null, 
            $versions['12GB | 256GB']->id ?? null, $versions['12GB | 512GB']->id ?? null
        ]);
        $tabletVersions = array_filter([
            $versions['8GB | 128GB']->id ?? null, $versions['8GB | 256GB']->id ?? null
        ]);
        $laptopVersions = array_filter([
            $versions['16GB | 512GB']->id ?? null, $versions['16GB | 1TB']->id ?? null, 
            $versions['24GB | 1TB']->id ?? null, $versions['36GB | 1TB']->id ?? null, 
            $versions['10CPU - 10GPU | 16GB - 512GB']->id ?? null, 
            $versions['10CPU - 10GPU | 24GB - 1TB']->id ?? null
        ]);

        // Nếu DB trắng trơn thuộc tính
        if (empty($defaultColors)) return;

        // Bắt đầu rải biến thể cho từng sản phẩm
        foreach ($products as $product) {
            if ($product->variants()->count() > 0) continue;

            $brandName = $product->brand?->name ?? '';
            $catName = $product->category?->name ?? '';

            // -- XÁC ĐỊNH MẢNG MÀU ÁP DỤNG --
            $poolColors = $defaultColors;
            if ($brandName === 'Apple') {
                $poolColors = empty($appleColors) ? $defaultColors : $appleColors;
            } elseif ($brandName === 'Samsung') {
                $poolColors = empty($samsungColors) ? $defaultColors : $samsungColors;
            }

            // -- XÁC ĐỊNH MẢNG PHIÊN BẢN ÁP DỤNG --
            $poolVersions = [];
            if (str_contains($catName, 'Laptop') || str_contains($catName, 'MacBook')) {
                $poolVersions = $laptopVersions;
            } elseif (str_contains($catName, 'iPad') || str_contains($catName, 'Tab')) {
                $poolVersions = $tabletVersions;
            } elseif (in_array($catName, ['iPhone', 'Samsung', 'Xiaomi', 'Điện thoại'])) {
                $poolVersions = $phoneVersions;
            }
            // Phụ kiện, Tai nghe, Đồng hồ... sẽ không có Phiên bản (mảng rỗng)
            
            // Giới hạn số biến thể tạo ra để không bị duplicate vô hạn vòng lặp
            $maxCombos = count($poolColors) * (empty($poolVersions) ? 1 : count($poolVersions));
            $numVariants = min(rand(2, 4), $maxCombos);

            $usedCombos = [];
            $createdCount = 0;
            $failSafe = 0; // Tránh treo vòng lặp infinite

            while ($createdCount < $numVariants && $failSafe < 50) {
                $failSafe++;
                
                $colorId = $poolColors[array_rand($poolColors)];
                $versionId = empty($poolVersions) ? null : $poolVersions[array_rand($poolVersions)];

                // Tránh trùng lặp Cấu hình + Màu sắc trên cùng 1 sản phẩm
                $comboKey = $colorId . '-' . ($versionId ?? 'none');
                if (in_array($comboKey, $usedCombos)) continue;

                $usedCombos[] = $comboKey;

                // Tạo Variant
                $variant = ProductVariant::create([
                    'product_id' => $product->id,
                    'sku'        => $product->sku . '-V' . ($createdCount + 1),
                    'price'      => $product->price + rand(0, 5) * 500000, 
                    'sale_price' => $product->sale_price ? $product->sale_price + rand(0, 5) * 500000 : null,
                    'quantity'   => rand(5, 50),
                    'image'      => null,
                    'is_active'  => true,
                ]);

                // Gán thuộc tính (Màu sắc bắt buộc, Phiên bản chỉ khi có)
                $attachIds = [$colorId];
                if ($versionId) {
                    $attachIds[] = $versionId;
                }
                $variant->attributes()->attach($attachIds);

                $createdCount++;
            }
        }
    }
}

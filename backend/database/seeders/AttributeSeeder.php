<?php

namespace Database\Seeders;

use App\Models\Attribute;
use App\Models\AttributeGroup;
use Illuminate\Database\Seeder;

class AttributeSeeder extends Seeder
{
    public function run(): void
    {
        $colorGroup    = AttributeGroup::where('name', 'color')->first();
        $sizeGroup     = AttributeGroup::where('name', 'size')->first();
        $materialGroup = AttributeGroup::where('name', 'material')->first();

        if (!$colorGroup || !$sizeGroup) {
            $this->command->warn('Cần chạy AttributeGroupSeeder trước.');
            return;
        }

        // --- Màu sắc ---
        $colors = [
            ['value' => 'Đen',        'color_code' => '#000000'],
            ['value' => 'Trắng',      'color_code' => '#FFFFFF'],
            ['value' => 'Đỏ',         'color_code' => '#FF0000'],
            ['value' => 'Xanh dương', 'color_code' => '#1E90FF'],
            ['value' => 'Xanh lá',    'color_code' => '#28a745'],
            ['value' => 'Vàng',       'color_code' => '#FFC107'],
            ['value' => 'Hồng',       'color_code' => '#FF69B4'],
            ['value' => 'Xám',        'color_code' => '#6C757D'],
            ['value' => 'Nâu',        'color_code' => '#8B4513'],
            ['value' => 'Cam',        'color_code' => '#FF6B35'],
        ];
        foreach ($colors as $i => $c) {
            Attribute::firstOrCreate(
                ['attribute_group_id' => $colorGroup->id, 'value' => $c['value']],
                ['color_code' => $c['color_code'], 'display_order' => $i + 1]
            );
        }

        // --- Kích thước ---
        $sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL'];
        foreach ($sizes as $i => $s) {
            Attribute::firstOrCreate(
                ['attribute_group_id' => $sizeGroup->id, 'value' => $s],
                ['display_order' => $i + 1]
            );
        }

        // --- Chất liệu (nếu group tồn tại) ---
        if ($materialGroup) {
            $materials = ['Cotton', 'Polyester', 'Linen', 'Denim', 'Wool', 'Silk'];
            foreach ($materials as $i => $m) {
                Attribute::firstOrCreate(
                    ['attribute_group_id' => $materialGroup->id, 'value' => $m],
                    ['display_order' => $i + 1]
                );
            }
        }
    }
}
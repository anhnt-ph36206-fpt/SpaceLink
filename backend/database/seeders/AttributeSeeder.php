<?php

namespace Database\Seeders;

use App\Models\Attribute;
use App\Models\AttributeGroup;
use Illuminate\Database\Seeder;

class AttributeSeeder extends Seeder
{
    public function run(): void
    {
        $colorGroup   = AttributeGroup::where('name', 'color')->first();
        $versionGroup = AttributeGroup::where('name', 'version')->first();

        if (!$colorGroup || !$versionGroup) {
            $this->command->warn('Cần chạy AttributeGroupSeeder trước.');
            return;
        }

        // --- Màu sắc (dành cho đồ công nghệ) ---
        $colors = [
            ['value' => 'Titan Đen',    'color_code' => '#2b2d30'],
            ['value' => 'Titan Trắng',  'color_code' => '#f2f1ed'],
            ['value' => 'Titan Tự nhiên', 'color_code' => '#b5b3b0'],
            ['value' => 'Đen Classic',  'color_code' => '#000000'],
            ['value' => 'Trắng Classic','color_code' => '#ffffff'],
            ['value' => 'Xanh Sky Blue','color_code' => '#93b6cf'],
            ['value' => 'Tím Cobalt',   'color_code' => '#7b7294'],
            ['value' => 'Space Grey',   'color_code' => '#5e5e60'],
            ['value' => 'Silver',       'color_code' => '#e0e0e0'],
            ['value' => 'Starlight',    'color_code' => '#f8f4e6'],
            ['value' => 'Midnight',     'color_code' => '#272d3b'],
        ];
        
        foreach ($colors as $i => $c) {
            Attribute::firstOrCreate(
                ['attribute_group_id' => $colorGroup->id, 'value' => $c['value']],
                ['color_code' => $c['color_code'], 'display_order' => $i + 1]
            );
        }

        // --- Phiên bản (RAM + ROM) ---
        $versions = [
            '8GB | 128GB',
            '8GB | 256GB',
            '12GB | 256GB',
            '12GB | 512GB',
            '16GB | 512GB',
            '16GB | 1TB',
            '24GB | 1TB',
            '36GB | 1TB',
            '10CPU - 10GPU | 16GB - 512GB',
            '10CPU - 10GPU | 24GB - 1TB',
        ];
        
        foreach ($versions as $i => $v) {
            Attribute::firstOrCreate(
                ['attribute_group_id' => $versionGroup->id, 'value' => $v],
                ['display_order' => $i + 1]
            );
        }
    }
}
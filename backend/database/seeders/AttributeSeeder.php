<?php

namespace Database\Seeders;

use App\Models\Attribute;
use App\Models\AttributeGroup;
use Illuminate\Database\Seeder;

class AttributeSeeder extends Seeder
{
    /**
     * Dữ liệu cứng/mẫu: giá trị Màu + Size (doc 22).
     */
    public function run(): void
    {
        $colorGroup = AttributeGroup::where('name', 'color')->first();
        $sizeGroup  = AttributeGroup::where('name', 'size')->first();

        if (!$colorGroup || !$sizeGroup) {
            $this->command->warn('Chạy AttributeGroupSeeder trước.');
            return;
        }

        $colors = [
            ['value' => 'Đen',   'color_code' => '#000000'],
            ['value' => 'Trắng', 'color_code' => '#FFFFFF'],
            ['value' => 'Đỏ',   'color_code' => '#FF0000'],
            ['value' => 'Xanh dương', 'color_code' => '#0000FF'],
            ['value' => 'Xanh lá', 'color_code' => '#00FF00'],
        ];
        foreach ($colors as $i => $c) {
            Attribute::firstOrCreate(
                [
                    'attribute_group_id' => $colorGroup->id,
                    'value' => $c['value'],
                ],
                [
                    'color_code'    => $c['color_code'],
                    'display_order' => $i + 1,
                ]
            );
        }

        $sizes = ['S', 'M', 'L', 'XL'];
        foreach ($sizes as $i => $s) {
            Attribute::firstOrCreate(
                [
                    'attribute_group_id' => $sizeGroup->id,
                    'value' => $s,
                ],
                ['display_order' => $i + 1]
            );
        }
    }
}
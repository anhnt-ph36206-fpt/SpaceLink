<?php

namespace Database\Seeders;

use App\Models\AttributeGroup;
use Illuminate\Database\Seeder;

class AttributeGroupSeeder extends Seeder
{
    public function run(): void
    {
        $groups = [
            ['name' => 'color',    'display_name' => 'Màu sắc',   'display_order' => 1],
            ['name' => 'size',     'display_name' => 'Kích thước', 'display_order' => 2],
            ['name' => 'material', 'display_name' => 'Chất liệu',  'display_order' => 3],
        ];

        foreach ($groups as $group) {
            AttributeGroup::firstOrCreate(
                ['name' => $group['name']],
                [
                    'display_name'  => $group['display_name'],
                    'display_order' => $group['display_order'],
                ]
            );
        }
    }
}
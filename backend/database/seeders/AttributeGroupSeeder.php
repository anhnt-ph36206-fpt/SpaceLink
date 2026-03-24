<?php

namespace Database\Seeders;

use App\Models\AttributeGroup;
use Illuminate\Database\Seeder;

class AttributeGroupSeeder extends Seeder
{
    public function run(): void
    {
        $groups = [
            ['name' => 'color',   'display_name' => 'Màu sắc',   'display_order' => 1],
            ['name' => 'version', 'display_name' => 'Phiên bản', 'display_order' => 2],
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
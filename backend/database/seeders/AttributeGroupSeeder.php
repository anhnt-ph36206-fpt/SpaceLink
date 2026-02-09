<?php

namespace Database\Seeders;

use App\Models\AttributeGroup;
use Illuminate\Database\Seeder;

class AttributeGroupSeeder extends Seeder
{
    /**
     * Dữ liệu cứng (ưu tiên): nhóm thuộc tính Màu sắc, Kích thước (doc 22).
     */
    public function run(): void
    {
        AttributeGroup::firstOrCreate(
            ['name' => 'color'],
            ['display_name' => 'Màu sắc', 'display_order' => 1]
        );
        AttributeGroup::firstOrCreate(
            ['name' => 'size'],
            ['display_name' => 'Kích thước', 'display_order' => 2]
        );
    }
}
<?php

namespace Database\Seeders;

use App\Models\Setting;
use Illuminate\Database\Seeder;

class SettingSeeder extends Seeder
{
    /**
     * Key cứng, value mềm (doc 22). Dùng firstOrCreate theo key_name.
     */
    public function run(): void
    {
        $items = [
            ['key_name' => 'site_name',         'value' => 'SpaceLink',    'type' => 'string',  'group_name' => 'general', 'description' => 'Tên website',           'is_public' => true],
            ['key_name' => 'site_description',  'value' => 'Cửa hàng công nghệ', 'type' => 'string',  'group_name' => 'general', 'description' => 'Mô tả website',    'is_public' => true],
            ['key_name' => 'contact_email',     'value' => 'contact@spacelink.test', 'type' => 'string',  'group_name' => 'contact', 'description' => 'Email liên hệ', 'is_public' => true],
            ['key_name' => 'contact_phone',     'value' => '1900 1234',    'type' => 'string',  'group_name' => 'contact', 'description' => 'Số điện thoại',      'is_public' => true],
            ['key_name' => 'logo_url',          'value' => '/images/logo.png', 'type' => 'string',  'group_name' => 'general', 'description' => 'URL logo',          'is_public' => true],
            ['key_name' => 'maintenance_mode',  'value' => '0',           'type' => 'boolean', 'group_name' => 'system',  'description' => 'Bật chế độ bảo trì', 'is_public' => false],
            ['key_name' => 'items_per_page',    'value' => '12',          'type' => 'number',  'group_name' => 'general', 'description' => 'Số item mỗi trang',  'is_public' => false],
        ];

        foreach ($items as $item) {
            Setting::firstOrCreate(
                ['key_name' => $item['key_name']],
                $item
            );
        }
    }
}
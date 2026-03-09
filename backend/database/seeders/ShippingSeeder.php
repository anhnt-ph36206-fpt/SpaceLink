<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Shipping;

class ShippingSeeder extends Seeder
{
    public function run(): void
    {
        $shippings = [
            [
                'name'      => 'Giao hàng nhanh',
                'code'      => 'GHN',
                'logo'      => 'shippings/ghn.png',
                'base_fee'  => 25000,
                'is_active' => true,
            ],
            [
                'name'      => 'Giao hàng tiết kiệm',
                'code'      => 'GHTK',
                'logo'      => 'shippings/ghtk.png',
                'base_fee'  => 18000,
                'is_active' => true,
            ],
            [
                'name'      => 'Viettel Post',
                'code'      => 'VTP',
                'logo'      => 'shippings/vtp.png',
                'base_fee'  => 20000,
                'is_active' => true,
            ],
        ];

        foreach ($shippings as $shipping) {
            Shipping::create($shipping);
        }
    }
}

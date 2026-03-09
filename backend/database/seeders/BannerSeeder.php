<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Banner;
use Carbon\Carbon;

class BannerSeeder extends Seeder
{
    public function run(): void
    {
        $banners = [
            [
                'title'         => 'Summer Sale 2026',
                'image_url'     => 'banners/summer-sale.jpg',
                'description'   => 'Giảm đến 50% toàn bộ sản phẩm mùa hè',
                'link_url'      => '/products?sale=true',
                'display_order' => 1,
                'start_date'    => Carbon::now(),
                'end_date'      => Carbon::now()->addMonths(2),
                'is_active'     => true,
            ],
            [
                'title'         => 'New Arrivals',
                'image_url'     => 'banners/new-arrivals.jpg',
                'description'   => 'Bộ sưu tập mới nhất vừa về',
                'link_url'      => '/products?sort=newest',
                'display_order' => 2,
                'start_date'    => null,
                'end_date'      => null,
                'is_active'     => true,
            ],
            [
                'title'         => 'Free Shipping',
                'image_url'     => 'banners/free-ship.jpg',
                'description'   => 'Miễn phí vận chuyển cho đơn từ 500k',
                'link_url'      => null,
                'display_order' => 3,
                'start_date'    => null,
                'end_date'      => null,
                'is_active'     => true,
            ],
        ];

        foreach ($banners as $banner) {
            Banner::create($banner);
        }
    }
}

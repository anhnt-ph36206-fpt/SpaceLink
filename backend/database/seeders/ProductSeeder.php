<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class ProductSeeder extends Seeder
{
    /**
     * Dữ liệu mẫu mở rộng: ~10 sản phẩm/category để demo search, filter, phân trang.
     * Ảnh mẫu dùng placeholder — thay bằng ảnh thật qua CRUD sau.
     */
    public function run(): void
    {
        $categories = Category::all()->keyBy('name');
        $brands     = Brand::all()->keyBy('name');

        if ($categories->isEmpty() || $brands->isEmpty()) {
            $this->command->warn('Chạy CategorySeeder và BrandSeeder trước.');
            return;
        }

        // ==============================================================
        // CẤU TRÚC: ['name', 'price', 'sale_price', 'category', 'brand', 'featured', 'description']
        // ==============================================================
        $products = [

            // ── ĐIỆN THOẠI - APPLE (iPhone) ───────────────────────────────
            ['name' => 'iPhone 16 Pro Max 256GB',       'price' => 39990000, 'sale_price' => 37990000, 'category' => 'iPhone',  'brand' => 'Apple',   'featured' => true,  'desc' => 'iPhone 16 Pro Max 256GB, chip A18 Pro, camera 48MP, màn hình Super Retina XDR 6.9 inch.'],
            ['name' => 'iPhone 16 Pro 128GB',           'price' => 34990000, 'sale_price' => 32990000, 'category' => 'iPhone',  'brand' => 'Apple',   'featured' => true,  'desc' => 'iPhone 16 Pro 128GB, chip A18 Pro, Dynamic Island, camera ProRAW.'],
            ['name' => 'iPhone 16 256GB',               'price' => 27990000, 'sale_price' => 25990000, 'category' => 'iPhone',  'brand' => 'Apple',   'featured' => true,  'desc' => 'iPhone 16 256GB, chip A18, Camera Control, pin 27h.'],
            ['name' => 'iPhone 15 Pro Max 256GB',       'price' => 34990000, 'sale_price' => 30990000, 'category' => 'iPhone',  'brand' => 'Apple',   'featured' => false, 'desc' => 'iPhone 15 Pro Max 256GB, titanium, USB-C, Action Button.'],
            ['name' => 'iPhone 15 128GB',               'price' => 22990000, 'sale_price' => 19990000, 'category' => 'iPhone',  'brand' => 'Apple',   'featured' => false, 'desc' => 'iPhone 15 128GB, Dynamic Island, USB-C, chip A16 Bionic.'],
            ['name' => 'iPhone 14 128GB',               'price' => 18990000, 'sale_price' => 15990000, 'category' => 'iPhone',  'brand' => 'Apple',   'featured' => false, 'desc' => 'iPhone 14 128GB, chip A15 Bionic, camera 12MP Dual.'],
            ['name' => 'iPhone 13 128GB',               'price' => 15990000, 'sale_price' => 12990000, 'category' => 'iPhone',  'brand' => 'Apple',   'featured' => false, 'desc' => 'iPhone 13 128GB, chip A15, màn hình Super Retina XDR 6.1 inch.'],
            ['name' => 'iPhone SE 2022 64GB',           'price' => 11990000, 'sale_price' => 9990000,  'category' => 'iPhone',  'brand' => 'Apple',   'featured' => false, 'desc' => 'iPhone SE 2022 64GB, chip A15 Bionic, thiết kế nhỏ gọn, Touch ID.'],
            ['name' => 'iPhone 16 Plus 128GB',          'price' => 30990000, 'sale_price' => null,     'category' => 'iPhone',  'brand' => 'Apple',   'featured' => false, 'desc' => 'iPhone 16 Plus 128GB, màn hình 6.7 inch, pin 27h, chip A18.'],
            ['name' => 'iPhone 15 Plus 256GB',          'price' => 25990000, 'sale_price' => 22990000, 'category' => 'iPhone',  'brand' => 'Apple',   'featured' => false, 'desc' => 'iPhone 15 Plus 256GB, màn hình lớn 6.7 inch, USB-C.'],

            // ── ĐIỆN THOẠI - SAMSUNG ──────────────────────────────────────
            ['name' => 'Samsung Galaxy S25 Ultra 256GB',  'price' => 41990000, 'sale_price' => 39990000, 'category' => 'Samsung', 'brand' => 'Samsung', 'featured' => true,  'desc' => 'Samsung Galaxy S25 Ultra, chip Snapdragon 8 Elite, S Pen, camera 200MP, AI Galaxy.'],
            ['name' => 'Samsung Galaxy S25+ 256GB',       'price' => 31990000, 'sale_price' => 29990000, 'category' => 'Samsung', 'brand' => 'Samsung', 'featured' => true,  'desc' => 'Samsung Galaxy S25+ 256GB, màn hình ProVision 6.7", chip Snapdragon 8 Elite.'],
            ['name' => 'Samsung Galaxy S24 FE 128GB',     'price' => 17990000, 'sale_price' => 15990000, 'category' => 'Samsung', 'brand' => 'Samsung', 'featured' => false, 'desc' => 'Samsung Galaxy S24 FE, hiệu năng cao, chip Exynos 2500, camera 50MP.'],
            ['name' => 'Samsung Galaxy A55 5G 128GB',     'price' => 10990000, 'sale_price' => 9490000,  'category' => 'Samsung', 'brand' => 'Samsung', 'featured' => false, 'desc' => 'Samsung Galaxy A55 5G, màn hình AMOLED 120Hz, camera 50MP, ip67.'],
            ['name' => 'Samsung Galaxy A35 5G 128GB',     'price' => 8490000,  'sale_price' => null,     'category' => 'Samsung', 'brand' => 'Samsung', 'featured' => false, 'desc' => 'Samsung Galaxy A35 5G, camera 50MP, pin 5000mAh, sạc 25W.'],
            ['name' => 'Samsung Galaxy Z Fold6 256GB',    'price' => 49990000, 'sale_price' => 46990000, 'category' => 'Samsung', 'brand' => 'Samsung', 'featured' => true,  'desc' => 'Samsung Galaxy Z Fold6 256GB, màn hình gập 7.6", chip Snapdragon 8 Gen 3.'],
            ['name' => 'Samsung Galaxy Z Flip6 256GB',    'price' => 26990000, 'sale_price' => 24990000, 'category' => 'Samsung', 'brand' => 'Samsung', 'featured' => false, 'desc' => 'Samsung Galaxy Z Flip6, thiết kế flip sang trọng, FlexCam.'],
            ['name' => 'Samsung Galaxy S23 128GB',        'price' => 19990000, 'sale_price' => 15990000, 'category' => 'Samsung', 'brand' => 'Samsung', 'featured' => false, 'desc' => 'Samsung Galaxy S23 128GB, chip Snapdragon 8 Gen 2, camera 50MP.'],
            ['name' => 'Samsung Galaxy A15 128GB',        'price' => 5490000,  'sale_price' => null,     'category' => 'Samsung', 'brand' => 'Samsung', 'featured' => false, 'desc' => 'Samsung Galaxy A15, pin 5000mAh, màn hình Super AMOLED 6.5 inch.'],
            ['name' => 'Samsung Galaxy M55 5G 128GB',     'price' => 9990000,  'sale_price' => 8990000,  'category' => 'Samsung', 'brand' => 'Samsung', 'featured' => false, 'desc' => 'Samsung Galaxy M55 5G, camera 50MP OIS, sạc nhanh 45W.'],

            // ── ĐIỆN THOẠI - XIAOMI ───────────────────────────────────────
            ['name' => 'Xiaomi 14 Ultra 512GB',          'price' => 35990000, 'sale_price' => 33990000, 'category' => 'Xiaomi',  'brand' => 'Xiaomi',  'featured' => true,  'desc' => 'Xiaomi 14 Ultra, camera Leica Summilux, Snapdragon 8 Gen 3, sạc 90W.'],
            ['name' => 'Xiaomi 14T Pro 256GB',           'price' => 19990000, 'sale_price' => 17990000, 'category' => 'Xiaomi',  'brand' => 'Xiaomi',  'featured' => true,  'desc' => 'Xiaomi 14T Pro, Snapdragon 8 Gen 3, màn hình AMOLED 144Hz, sạc 120W.'],
            ['name' => 'Redmi Note 13 Pro+ 5G 256GB',   'price' => 9990000,  'sale_price' => 8490000,  'category' => 'Xiaomi',  'brand' => 'Xiaomi',  'featured' => false, 'desc' => 'Redmi Note 13 Pro+ 5G, camera 200MP, màn hình AMOLED 120Hz, IP68.'],
            ['name' => 'Redmi Note 13 128GB',            'price' => 5990000,  'sale_price' => null,     'category' => 'Xiaomi',  'brand' => 'Xiaomi',  'featured' => false, 'desc' => 'Redmi Note 13 128GB, màn hình AMOLED 120Hz, camera 108MP.'],
            ['name' => 'Xiaomi POCO X6 Pro 256GB',       'price' => 10990000, 'sale_price' => 9490000,  'category' => 'Xiaomi',  'brand' => 'Xiaomi',  'featured' => false, 'desc' => 'POCO X6 Pro, Dimensity 8300-Ultra, màn hình Flow AMOLED 144Hz.'],
            ['name' => 'Xiaomi POCO F6 256GB',           'price' => 12990000, 'sale_price' => 11490000, 'category' => 'Xiaomi',  'brand' => 'Xiaomi',  'featured' => false, 'desc' => 'POCO F6, Snapdragon 8s Gen 3, sạc nhanh 90W, màn hình AMOLED.'],
            ['name' => 'Xiaomi Redmi 13C 128GB',         'price' => 3490000,  'sale_price' => null,     'category' => 'Xiaomi',  'brand' => 'Xiaomi',  'featured' => false, 'desc' => 'Redmi 13C, pin 5000mAh, camera 50MP, giá rẻ sinh viên.'],
            ['name' => 'Xiaomi 13T 256GB',               'price' => 14990000, 'sale_price' => 12990000, 'category' => 'Xiaomi',  'brand' => 'Xiaomi',  'featured' => false, 'desc' => 'Xiaomi 13T, camera Leica, màn hình AMOLED 144Hz, Dimensity 8200-Ultra.'],
            ['name' => 'Redmi Note 12 Turbo 256GB',      'price' => 7990000,  'sale_price' => 6490000,  'category' => 'Xiaomi',  'brand' => 'Xiaomi',  'featured' => false, 'desc' => 'Redmi Note 12 Turbo, Snapdragon 7s Gen 2, màn hình OLED 120Hz.'],
            ['name' => 'Xiaomi POCO M6 Pro 256GB',       'price' => 6990000,  'sale_price' => null,     'category' => 'Xiaomi',  'brand' => 'Xiaomi',  'featured' => false, 'desc' => 'POCO M6 Pro, Helio G99-Ultra, camera 64MP, pin 5000mAh.'],

            // ── LAPTOP - MACBOOK (Apple) ───────────────────────────────────
            ['name' => 'MacBook Air 15 M3 256GB',        'price' => 36990000, 'sale_price' => 34990000, 'category' => 'MacBook', 'brand' => 'Apple',   'featured' => true,  'desc' => 'MacBook Air 15 M3, màn hình Liquid Retina 15.3", 8GB RAM, chip M3.'],
            ['name' => 'MacBook Air 13 M3 256GB',        'price' => 28990000, 'sale_price' => 26990000, 'category' => 'MacBook', 'brand' => 'Apple',   'featured' => true,  'desc' => 'MacBook Air 13 M3, thiết kế mỏng nhẹ, hiệu năng vượt trội, 18h pin.'],
            ['name' => 'MacBook Pro 14 M4 512GB',        'price' => 54990000, 'sale_price' => 51990000, 'category' => 'MacBook', 'brand' => 'Apple',   'featured' => true,  'desc' => 'MacBook Pro 14 M4, Liquid Retina XDR, ProMotion 120Hz, chip M4 Pro.'],
            ['name' => 'MacBook Pro 16 M4 Pro 512GB',    'price' => 74990000, 'sale_price' => null,     'category' => 'MacBook', 'brand' => 'Apple',   'featured' => false, 'desc' => 'MacBook Pro 16 M4 Pro, màn hình 16.2", 24GB RAM, SSD 512GB.'],
            ['name' => 'MacBook Air 13 M2 256GB',        'price' => 24990000, 'sale_price' => 21990000, 'category' => 'MacBook', 'brand' => 'Apple',   'featured' => false, 'desc' => 'MacBook Air M2, thiết kế mới hoàn toàn, MagSafe, cổng USB-C.'],
            ['name' => 'MacBook Pro 14 M3 Pro 512GB',    'price' => 52990000, 'sale_price' => 49990000, 'category' => 'MacBook', 'brand' => 'Apple',   'featured' => false, 'desc' => 'MacBook Pro 14 M3 Pro, 18GB RAM, màn hình miniLED 120Hz.'],

            // ── LAPTOP GAMING ──────────────────────────────────────────────
            ['name' => 'ASUS ROG Strix G16 RTX 4070',   'price' => 52990000, 'sale_price' => 49990000, 'category' => 'Laptop Gaming', 'brand' => 'ASUS', 'featured' => true,  'desc' => 'ASUS ROG Strix G16, RTX 4070 8GB, i9-14900HX, 32GB RAM, 1TB SSD.'],
            ['name' => 'ASUS TUF Gaming A15 RTX 4060',  'price' => 29990000, 'sale_price' => 27990000, 'category' => 'Laptop Gaming', 'brand' => 'ASUS', 'featured' => true,  'desc' => 'ASUS TUF Gaming A15, RTX 4060 8GB, Ryzen 9 8945H, 16GB RAM.'],
            ['name' => 'ASUS ROG Zephyrus G14 RTX 4060','price' => 44990000, 'sale_price' => 41990000, 'category' => 'Laptop Gaming', 'brand' => 'ASUS', 'featured' => false, 'desc' => 'ASUS ROG Zephyrus G14, RTX 4060, Ryzen 9 8945HS, màn hình OLED 120Hz.'],
            ['name' => 'Dell Alienware m18 RTX 4090',   'price' => 119990000,'sale_price' => null,     'category' => 'Laptop Gaming', 'brand' => 'Dell', 'featured' => false, 'desc' => 'Dell Alienware m18, RTX 4090 16GB, i9-14900HX, 32GB RAM, màn hình 18 inch.'],
            ['name' => 'Dell G15 5530 RTX 4060',        'price' => 27990000, 'sale_price' => 25990000, 'category' => 'Laptop Gaming', 'brand' => 'Dell', 'featured' => false, 'desc' => 'Dell G15 5530, RTX 4060 8GB, i7-13650HX, 16GB RAM, 512GB SSD.'],

            // ── LAPTOP VĂN PHÒNG ──────────────────────────────────────────
            ['name' => 'Dell XPS 15 9530 OLED i7',      'price' => 49990000, 'sale_price' => 46990000, 'category' => 'Laptop Văn phòng', 'brand' => 'Dell', 'featured' => true,  'desc' => 'Dell XPS 15, màn hình OLED Touch 3.5K, i7-13700H, 32GB RAM, 1TB SSD.'],
            ['name' => 'Dell XPS 13 9340 Ultra 5',      'price' => 35990000, 'sale_price' => 33990000, 'category' => 'Laptop Văn phòng', 'brand' => 'Dell', 'featured' => false, 'desc' => 'Dell XPS 13 Plus, thiết kế siêu mỏng, Intel Core Ultra 5, FHD+ OLED.'],
            ['name' => 'ASUS Zenbook 14X OLED i7',      'price' => 31990000, 'sale_price' => 29490000, 'category' => 'Laptop Văn phòng', 'brand' => 'ASUS', 'featured' => false, 'desc' => 'ASUS Zenbook 14X, màn hình OLED 2.8K 90Hz, i7-13700H, 16GB/512GB.'],
            ['name' => 'ASUS Vivobook 15 i5 Gen 13',    'price' => 15990000, 'sale_price' => null,     'category' => 'Laptop Văn phòng', 'brand' => 'ASUS', 'featured' => false, 'desc' => 'ASUS Vivobook 15, Intel Core i5-1335U, 8GB RAM, SSD 512GB, giá tốt.'],

            // ── TABLET - IPAD ──────────────────────────────────────────────
            ['name' => 'iPad Pro M4 11 inch 256GB WiFi','price' => 28990000, 'sale_price' => 27490000, 'category' => 'iPad', 'brand' => 'Apple', 'featured' => true,  'desc' => 'iPad Pro M4, màn hình Ultra Retina XDR OLED, chip M4, thiết kế siêu mỏng.'],
            ['name' => 'iPad Air M2 11 inch 128GB WiFi','price' => 18990000, 'sale_price' => null,     'category' => 'iPad', 'brand' => 'Apple', 'featured' => true,  'desc' => 'iPad Air M2 11 inch, chip M2, màn hình Liquid Retina, hỗ trợ Apple Pencil Pro.'],
            ['name' => 'iPad Mini 7 128GB WiFi',        'price' => 15990000, 'sale_price' => 14490000, 'category' => 'iPad', 'brand' => 'Apple', 'featured' => false, 'desc' => 'iPad Mini 7, màn hình 8.3 inch, chip A17 Pro, nhỏ gọn tiện lợi.'],
            ['name' => 'iPad 10 64GB WiFi',             'price' => 10990000, 'sale_price' => 9490000,  'category' => 'iPad', 'brand' => 'Apple', 'featured' => false, 'desc' => 'iPad Gen 10, thiết kế mới hoàn toàn, chip A14 Bionic, USB-C, 5G.'],

            // ── TABLET - SAMSUNG TAB ───────────────────────────────────────
            ['name' => 'Samsung Galaxy Tab S9 Ultra 12GB/256GB', 'price' => 32990000, 'sale_price' => 29990000, 'category' => 'Samsung Tab', 'brand' => 'Samsung', 'featured' => true,  'desc' => 'Samsung Galaxy Tab S9 Ultra, màn hình Dynamic AMOLED 14.6", S Pen included.'],
            ['name' => 'Samsung Galaxy Tab S9 FE 128GB WiFi',    'price' => 11990000, 'sale_price' => 10490000, 'category' => 'Samsung Tab', 'brand' => 'Samsung', 'featured' => false, 'desc' => 'Samsung Galaxy Tab S9 FE, màn hình TFT 10.9", IP68, S Pen support.'],
            ['name' => 'Samsung Galaxy Tab A9 Plus 64GB',        'price' => 7490000,  'sale_price' => null,     'category' => 'Samsung Tab', 'brand' => 'Samsung', 'featured' => false, 'desc' => 'Samsung Galaxy Tab A9+, màn hình 11 inch, Snapdragon 695, 4 loa Dolby Atmos.'],

            // ── PHỤ KIỆN - TAI NGHE ───────────────────────────────────────
            ['name' => 'AirPods Pro 2 (USB-C)',          'price' => 7490000,  'sale_price' => 6990000,  'category' => 'Tai nghe', 'brand' => 'Apple',   'featured' => true,  'desc' => 'AirPods Pro 2, chống ồn ANC thế hệ 2, Adaptive Audio, chip H2, IP54.'],
            ['name' => 'AirPods 4 ANC',                  'price' => 5990000,  'sale_price' => null,     'category' => 'Tai nghe', 'brand' => 'Apple',   'featured' => false, 'desc' => 'AirPods 4 ANC, chống ồn chủ động, Transparency Mode, chip H2.'],
            ['name' => 'Sony WH-1000XM5',                'price' => 8990000,  'sale_price' => 7490000,  'category' => 'Tai nghe', 'brand' => 'Sony',    'featured' => true,  'desc' => 'Sony WH-1000XM5, chống ồn ANC hàng đầu, pin 30h, kết nối Multipoint.'],
            ['name' => 'Sony WF-1000XM5',                'price' => 6990000,  'sale_price' => 5990000,  'category' => 'Tai nghe', 'brand' => 'Sony',    'featured' => false, 'desc' => 'Sony WF-1000XM5, TWS nhỏ gọn, ANC industry-leading, LDAC.'],
            ['name' => 'Samsung Galaxy Buds3 Pro',       'price' => 5490000,  'sale_price' => 4990000,  'category' => 'Tai nghe', 'brand' => 'Samsung', 'featured' => false, 'desc' => 'Samsung Galaxy Buds3 Pro, ANC Intelligent, thiết kế gọng mở, IP57.'],
            ['name' => 'Xiaomi Redmi Buds 6 Active',     'price' => 790000,   'sale_price' => null,     'category' => 'Tai nghe', 'brand' => 'Xiaomi',  'featured' => false, 'desc' => 'Xiaomi Redmi Buds 6 Active, pin 7.5h, chống ồn AI, giá tốt.'],
            ['name' => 'Xiaomi Redmi Buds 5 Pro',        'price' => 1990000,  'sale_price' => 1490000,  'category' => 'Tai nghe', 'brand' => 'Xiaomi',  'featured' => false, 'desc' => 'Xiaomi Redmi Buds 5 Pro, ANC 52dB, LDAC, pin 10h.'],

            // ── PHỤ KIỆN - ỐP LƯNG & BẢO VỆ ──────────────────────────────
            ['name' => 'Ốp lưng iPhone 16 Pro MagSafe Apple',   'price' => 1290000,  'sale_price' => null,    'category' => 'Ốp lưng & Bảo vệ', 'brand' => 'Apple',   'featured' => false, 'desc' => 'Ốp lưng chính hãng Apple iPhone 16 Pro, hỗ trợ MagSafe, chất liệu silicon cao cấp.'],
            ['name' => 'Ốp lưng Samsung S25 Ultra Spigen',      'price' => 490000,   'sale_price' => 390000,  'category' => 'Ốp lưng & Bảo vệ', 'brand' => null,      'featured' => false, 'desc' => 'Ốp lưng Spigen Tough Armor cho Samsung Galaxy S25 Ultra, chống sốc chuẩn MIL-STD.'],
            ['name' => 'Kính cường lực iPhone 16 Pro Max',      'price' => 290000,   'sale_price' => 199000,  'category' => 'Ốp lưng & Bảo vệ', 'brand' => null,      'featured' => false, 'desc' => 'Kính cường lực Sapphire iPhone 16 Pro Max, chống vân tay, độ trong 99.9%.'],

            // ── PHỤ KIỆN - SẠC & CÁP ─────────────────────────────────────
            ['name' => 'Sạc Apple 20W USB-C',           'price' => 590000,   'sale_price' => null,     'category' => 'Sạc & Cáp', 'brand' => 'Apple',   'featured' => false, 'desc' => 'Adapter sạc nhanh Apple 20W USB-C, tương thích iPhone 8 trở lên và iPad.'],
            ['name' => 'Cáp Apple USB-C to Lightning 1m','price' => 490000,  'sale_price' => null,     'category' => 'Sạc & Cáp', 'brand' => 'Apple',   'featured' => false, 'desc' => 'Cáp Apple USB-C to Lightning 1m chính hãng, hỗ trợ sạc nhanh Power Delivery.'],
            ['name' => 'Samsung 25W Travel Adapter',    'price' => 390000,   'sale_price' => 290000,   'category' => 'Sạc & Cáp', 'brand' => 'Samsung', 'featured' => false, 'desc' => 'Củ sạc nhanh Samsung 25W Super Fast Charging, tương thích USB-C PD.'],
            ['name' => 'Cáp Xiaomi USB-C 6A 120W 1m',  'price' => 290000,   'sale_price' => null,     'category' => 'Sạc & Cáp', 'brand' => 'Xiaomi',  'featured' => false, 'desc' => 'Cáp sạc nhanh Xiaomi 6A 120W, Silicon mềm dẻo, đầu kẽm mạ vàng.'],

            // ── ĐỒNG HỒ - APPLE WATCH ─────────────────────────────────────
            ['name' => 'Apple Watch Series 10 44mm Nhôm','price' => 11990000, 'sale_price' => 10990000, 'category' => 'Apple Watch', 'brand' => 'Apple',   'featured' => true,  'desc' => 'Apple Watch Series 10, 44mm viền nhôm, chip S10, màn hình mỏng nhất từ trước đến nay.'],
            ['name' => 'Apple Watch Ultra 2 49mm Titan', 'price' => 25990000, 'sale_price' => null,     'category' => 'Apple Watch', 'brand' => 'Apple',   'featured' => true,  'desc' => 'Apple Watch Ultra 2 Titanium, pin 60h, chip S9, GPS đa băng tần, chuẩn MIL-STD.'],
            ['name' => 'Apple Watch SE 2 40mm Nhôm',    'price' => 6990000,  'sale_price' => 5990000,  'category' => 'Apple Watch', 'brand' => 'Apple',   'featured' => false, 'desc' => 'Apple Watch SE 2 40mm, phát hiện tai nạn xe, theo dõi sức khoẻ, chip S8.'],

            // ── ĐỒNG HỒ - SAMSUNG WATCH ───────────────────────────────────
            ['name' => 'Samsung Galaxy Watch 7 44mm',   'price' => 8990000,  'sale_price' => 7490000,  'category' => 'Samsung Watch', 'brand' => 'Samsung', 'featured' => true,  'desc' => 'Samsung Galaxy Watch 7 44mm, BioActive Sensor, pin dài, Wear OS.'],
            ['name' => 'Samsung Galaxy Watch Ultra 47mm','price' => 16990000, 'sale_price' => null,     'category' => 'Samsung Watch', 'brand' => 'Samsung', 'featured' => false, 'desc' => 'Samsung Galaxy Watch Ultra, thiết kế hướng tới người chơi thể thao, pin 3 ngày.'],
            ['name' => 'Samsung Galaxy Watch FE 40mm',  'price' => 4990000,  'sale_price' => 4490000,  'category' => 'Samsung Watch', 'brand' => 'Samsung', 'featured' => false, 'desc' => 'Samsung Galaxy Watch FE, theo dõi sức khoẻ toàn diện, giá tốt mới vào nghề.'],
            ['name' => 'Xiaomi Redmi Watch 5 Active',   'price' => 1290000,  'sale_price' => null,     'category' => 'Smartwatch khác', 'brand' => 'Xiaomi', 'featured' => false, 'desc' => 'Xiaomi Redmi Watch 5 Active, pin 18 ngày, màn hình LCD 1.96", GPS.'],
        ];

        foreach ($products as $i => $p) {
            $cat   = $categories->firstWhere('name', $p['category']);
            $brand = $p['brand'] ? $brands->firstWhere('name', $p['brand']) : null;

            if (!$cat) {
                $this->command->warn("Category '{$p['category']}' không tồn tại — bỏ qua '{$p['name']}'");
                continue;
            }

            $slug = Str::slug($p['name']);

            $product = Product::firstOrCreate(
                ['slug' => $slug],
                [
                    'category_id' => $cat->id,
                    'brand_id'    => $brand?->id,
                    'name'        => $p['name'],
                    'slug'        => $slug,
                    'sku'         => 'SKU-' . strtoupper(Str::random(7)),
                    'description' => $p['desc'],
                    'content'     => null,
                    'price'       => $p['price'],
                    'sale_price'  => $p['sale_price'],
                    'quantity'    => rand(5, 100),
                    'sold_count'  => rand(0, 300),
                    'view_count'  => rand(0, 1000),
                    'is_featured' => $p['featured'],
                    'is_active'   => true,
                ]
            );

            // Thêm ảnh placeholder (chỉ thêm nếu chưa có)
            if ($product->wasRecentlyCreated && $product->images()->count() === 0) {
                ProductImage::create([
                    'product_id'    => $product->id,
                    'image_path'    => 'products/placeholder.jpg', // thay bằng ảnh thật qua CRUD
                    'is_primary'    => true,
                    'display_order' => 1,
                ]);
            }
        }

        // $this->command->info('ProductSeeder: ' . count($products) . ' sản phẩm đã được seed.');
    }
}
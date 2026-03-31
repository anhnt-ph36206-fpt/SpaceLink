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
     * Dữ liệu mềm: sản phẩm mẫu + ảnh (doc 22). Đa dạng category/brand cho API.
     */
    public function run(): void
    {
        $categories = Category::all()->keyBy('id');
        $brands     = Brand::all()->keyBy('id');
        if ($categories->isEmpty() || $brands->isEmpty()) {
            $this->command->warn('Chạy CategorySeeder và BrandSeeder trước.');
            return;
        }

        $catIds = $categories->pluck('id')->toArray();

        $products = [
            // ============================= APPLE =============================
            ['name' => 'iPhone 15 Pro Max 256GB', 'price' => 34990000, 'sale_price' => 32990000, 'category' => 'iPhone',      'brand' => 'Apple', 'featured' => true],
            ['name' => 'iPhone 15 Plus 128GB',    'price' => 25990000, 'sale_price' => 24490000, 'category' => 'iPhone',      'brand' => 'Apple', 'featured' => false],
            ['name' => 'MacBook Air M2 8GB/256GB','price' => 29990000, 'sale_price' => 27990000, 'category' => 'MacBook',     'brand' => 'Apple', 'featured' => true],
            ['name' => 'iPad Pro M4 11-inch',     'price' => 28990000, 'sale_price' => null,     'category' => 'iPad',        'brand' => 'Apple', 'featured' => true],
            ['name' => 'Apple Watch Series 9',    'price' => 10490000, 'sale_price' => 9990000,  'category' => 'Apple Watch', 'brand' => 'Apple', 'featured' => false],
            ['name' => 'AirPods Pro Gen 2',       'price' => 6190000,  'sale_price' => 5890000,  'category' => 'Tai nghe',    'brand' => 'Apple', 'featured' => false],

            // ============================ SAMSUNG ============================
            ['name' => 'Samsung Galaxy S24 Ultra','price' => 33990000, 'sale_price' => 31990000, 'category' => 'Samsung',       'brand' => 'Samsung', 'featured' => true],
            ['name' => 'Samsung Galaxy Z Fold5',  'price' => 40990000, 'sale_price' => 38990000, 'category' => 'Samsung',       'brand' => 'Samsung', 'featured' => false],
            ['name' => 'Galaxy Tab S9 Ultra',     'price' => 32990000, 'sale_price' => null,     'category' => 'Samsung Tab',   'brand' => 'Samsung', 'featured' => true],
            ['name' => 'Galaxy Watch 6 Classic',  'price' => 8990000,  'sale_price' => 7990000,  'category' => 'Samsung Watch', 'brand' => 'Samsung', 'featured' => false],
            ['name' => 'Galaxy Buds2 Pro',        'price' => 4990000,  'sale_price' => 3990000,  'category' => 'Tai nghe',      'brand' => 'Samsung', 'featured' => false],

            // ============================= XIAOMI ============================
            ['name' => 'Xiaomi 14 Pro 5G',        'price' => 22990000, 'sale_price' => 21990000, 'category' => 'Xiaomi',          'brand' => 'Xiaomi', 'featured' => true],
            ['name' => 'Redmi Note 13 Pro',       'price' => 8490000,  'sale_price' => 7990000,  'category' => 'Xiaomi',          'brand' => 'Xiaomi', 'featured' => false],
            ['name' => 'Xiaomi Pad 6',            'price' => 9490000,  'sale_price' => null,     'category' => 'Tablet khác',     'brand' => 'Xiaomi', 'featured' => false],
            ['name' => 'Xiaomi Smart Band 8',     'price' => 990000,   'sale_price' => 890000,   'category' => 'Smartwatch khác', 'brand' => 'Xiaomi', 'featured' => false],
            ['name' => 'Xiaomi Buds 4 Pro',       'price' => 3990000,  'sale_price' => null,     'category' => 'Tai nghe',        'brand' => 'Xiaomi', 'featured' => false],

            // ============================== OPPO =============================
            ['name' => 'OPPO Find N3 Fold',       'price' => 44990000, 'sale_price' => null,     'category' => 'OPPO',        'brand' => 'OPPO', 'featured' => true],
            ['name' => 'OPPO Reno11 5G',          'price' => 10990000, 'sale_price' => 10490000, 'category' => 'OPPO',        'brand' => 'OPPO', 'featured' => false],
            ['name' => 'OPPO Pad 2',              'price' => 14990000, 'sale_price' => 13990000, 'category' => 'Tablet khác', 'brand' => 'OPPO', 'featured' => false],
            ['name' => 'OPPO Enco Air 3',         'price' => 1590000,  'sale_price' => 1290000,  'category' => 'Tai nghe',    'brand' => 'OPPO', 'featured' => false],

            // ============================== SONY =============================
            ['name' => 'Sony WF-1000XM5 True WRL','price' => 6990000,  'sale_price' => 6490000,  'category' => 'Tai nghe', 'brand' => 'Sony', 'featured' => true],
            ['name' => 'Sony WH-1000XM5 Chụp Tai','price' => 8990000,  'sale_price' => 7990000,  'category' => 'Tai nghe', 'brand' => 'Sony', 'featured' => false],
            ['name' => 'Sony INZONE Buds Gaming', 'price' => 4990000,  'sale_price' => null,     'category' => 'Tai nghe', 'brand' => 'Sony', 'featured' => false],

            // ============================== DELL =============================
            ['name' => 'Dell XPS 15 9530 2024',   'price' => 54990000, 'sale_price' => 52990000, 'category' => 'Laptop Văn phòng', 'brand' => 'Dell', 'featured' => true],
            ['name' => 'Dell Inspiron 15 3520',   'price' => 18990000, 'sale_price' => 17490000, 'category' => 'Laptop Văn phòng', 'brand' => 'Dell', 'featured' => false],
            ['name' => 'Alienware m16 R2 2024',   'price' => 64990000, 'sale_price' => null,     'category' => 'Laptop Gaming',    'brand' => 'Dell', 'featured' => true],
            ['name' => 'Dell Vostro 5630',        'price' => 24990000, 'sale_price' => 22990000, 'category' => 'Laptop Văn phòng', 'brand' => 'Dell', 'featured' => false],

            // ============================== ASUS =============================
            ['name' => 'ASUS ROG Strix G16',      'price' => 39990000, 'sale_price' => 37990000, 'category' => 'Laptop Gaming',    'brand' => 'ASUS', 'featured' => true],
            ['name' => 'ASUS TUF Gaming F15',     'price' => 25990000, 'sale_price' => 23990000, 'category' => 'Laptop Gaming',    'brand' => 'ASUS', 'featured' => false],
            ['name' => 'ASUS Zenbook 14 OLED',    'price' => 29990000, 'sale_price' => 28990000, 'category' => 'Laptop Văn phòng', 'brand' => 'ASUS', 'featured' => true],
            ['name' => 'ASUS Vivobook 15',        'price' => 15990000, 'sale_price' => 14490000, 'category' => 'Laptop Văn phòng', 'brand' => 'ASUS', 'featured' => false],

            // ============================= LENOVO ============================
            ['name' => 'Lenovo Legion Pro 5i',    'price' => 42990000, 'sale_price' => 39990000, 'category' => 'Laptop Gaming',    'brand' => 'Lenovo', 'featured' => true],
            ['name' => 'Lenovo LOQ 15IRH8',       'price' => 22990000, 'sale_price' => 21490000, 'category' => 'Laptop Gaming',    'brand' => 'Lenovo', 'featured' => false],
            ['name' => 'ThinkPad X1 Carbon Gen 11','price'=> 49990000, 'sale_price' => 47990000, 'category' => 'Laptop Văn phòng', 'brand' => 'Lenovo', 'featured' => true],

            // ========================== GARMIN / HUAWEI ======================
            ['name' => 'Garmin Fenix 7 Pro',      'price' => 23990000, 'sale_price' => 22490000, 'category' => 'Smartwatch khác', 'brand' => 'Garmin', 'featured' => true],
            ['name' => 'Garmin Venu 3',           'price' => 12990000, 'sale_price' => 11990000, 'category' => 'Smartwatch khác', 'brand' => 'Garmin', 'featured' => false],
            ['name' => 'Huawei Watch GT 4',       'price' => 5990000,  'sale_price' => 5490000,  'category' => 'Smartwatch khác', 'brand' => 'Huawei', 'featured' => true],
            ['name' => 'Huawei FreeBuds Pro 3',   'price' => 4990000,  'sale_price' => null,     'category' => 'Tai nghe',        'brand' => 'Huawei', 'featured' => false],

            // =========================== PHỤ KIỆN KHÁC =======================
            ['name' => 'Sạc nhanh UGREEN 65W GaN','price' => 890000,   'sale_price' => 690000,   'category' => 'Sạc & Cáp',        'brand' => null, 'featured' => false],
            ['name' => 'Bàn phím cơ Logitech MX', 'price' => 4290000,  'sale_price' => 3890000,  'category' => 'Bàn phím & Chuột', 'brand' => null, 'featured' => false],
        ];

        foreach ($products as $i => $p) {
            $cat = $categories->firstWhere('name', $p['category']);
            $brand = $p['brand'] ? $brands->firstWhere('name', $p['brand']) : null;
            $slug = Str::slug($p['name']) . '-' . ($i + 1);

            $product = Product::firstOrCreate(
                ['slug' => $slug],
                [
                    'category_id'     => $cat?->id ?? $catIds[array_rand($catIds)],
                    'brand_id'        => $brand?->id,
                    'name'            => $p['name'],
                    'slug'            => $slug,
                    'sku'             => 'SKU-' . strtoupper(Str::random(6)),
                    'description'     => 'Mô tả mẫu cho ' . $p['name'] . '. Sản phẩm chất lượng cao.',
                    'content'         => null,
                    'price'           => $p['price'],
                    'sale_price'      => $p['sale_price'],
                    'quantity'        => rand(10, 100),
                    'sold_count'      => 0,
                    'view_count'      => 0,
                    'is_featured'     => $p['featured'],
                    'is_active'       => true,
                ]
            );

            if ($product->wasRecentlyCreated && $product->images()->count() === 0) {
                ProductImage::create([
                    'product_id'    => $product->id,
                    'image_path'    => 'products/' . $product->id . '-1.jpg',
                    'is_primary'    => true,
                    'display_order' => 1,
                ]);
            }
        }
    }
}